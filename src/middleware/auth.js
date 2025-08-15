import { verify } from '../services/token.js';
import { isAllowedJti } from '../services/token.js';
import { User } from '../models/index.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = verify(token);
    if (!(await isAllowedJti(decoded.jti))) return res.status(401).json({ error: 'Token invalidated' });
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if ((process.env.ALLOW_CONCURRENT_LOGINS || 'false').toLowerCase() !== 'true') {
      if (user.deviceId && decoded.deviceId !== user.deviceId) {
        return res.status(401).json({ error: 'Logged in on another device' });
      }
    }
    req.user = { id: user.id, email: user.email, deviceId: decoded.deviceId };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
