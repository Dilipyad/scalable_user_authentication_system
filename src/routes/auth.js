import express from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { redis, kUserDevice, kUserDevicesSet } from '../services/redis.js';
import { signAccess, signRefresh, verify, invalidateJti, isAllowedJti } from '../services/token.js';

const router = express.Router();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  deviceId: Joi.string().min(3).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;
  const exists = await User.findOne({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  res.status(201).json({ id: user.id, email: user.email });
});

router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password, deviceId } = value;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const concurrent = (process.env.ALLOW_CONCURRENT_LOGINS || 'false').toLowerCase() === 'true';
  if (!concurrent) {
    if (user.deviceId && user.deviceId !== deviceId) {
      return res.status(403).json({ error: 'Already logged in on another device' });
    }
    if (!user.deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }
  }

  const payload = { userId: user.id, deviceId };
  const access = signAccess(payload);
  const refresh = signRefresh(payload);

  res.json({ accessToken: access.token, refreshToken: refresh.token });
});

router.post('/refresh', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const decoded = verify(token);
    if (!(await isAllowedJti(decoded.jti)) || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Refresh invalid' });
    }
    await invalidateJti(decoded.jti);
    const payload = { userId: decoded.userId, deviceId: decoded.deviceId };
    const access = signAccess(payload);
    const refresh = signRefresh(payload);
    res.json({ accessToken: access.token, refreshToken: refresh.token });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', async (req, res) => {
  const { token, fromDevice } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const decoded = verify(token);
    await invalidateJti(decoded.jti);
    const concurrent = (process.env.ALLOW_CONCURRENT_LOGINS || 'false').toLowerCase() === 'true';
    if (!concurrent) {
      const user = await User.findByPk(decoded.userId);
      if (user && user.deviceId === (fromDevice || decoded.deviceId)) {
        user.deviceId = null;
        await user.save();
      }
    }
    res.json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
});

export default router;
