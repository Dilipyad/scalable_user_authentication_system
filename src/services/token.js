import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { redis, kTokenAllow, kUserDevicesSet } from './redis.js';

const secret = process.env.JWT_SECRET || 'please_change_me';
const concurrent = (process.env.ALLOW_CONCURRENT_LOGINS || 'false').toLowerCase() === 'true';

export function signAccess(payload, opts={}) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti, type: 'access' }, secret, { expiresIn: process.env.JWT_ACCESS_TTL || '15m', ...opts });
  const ttlSec = 60 * 15;
  redis.set(kTokenAllow(jti), '1', 'EX', ttlSec).catch(()=>{});
  return { token, jti };
}

export function signRefresh(payload, opts={}) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti, type: 'refresh' }, secret, { expiresIn: process.env.JWT_REFRESH_TTL || '7d', ...opts });
  const decoded = jwt.decode(token);
  const exp = decoded.exp;
  const ttl = Math.max(exp - Math.floor(Date.now()/1000), 60);
  redis.set(kTokenAllow(jti), '1', 'EX', ttl);
  if (concurrent) {
    redis.sadd(kUserDevicesSet(payload.userId), payload.deviceId);
  }
  return { token, jti };
}

export function verify(token) {
  return jwt.verify(token, secret);
}

export async function invalidateJti(jti) {
  await redis.del(kTokenAllow(jti));
}

export async function isAllowedJti(jti) {
  const v = await redis.get(kTokenAllow(jti));
  return v === '1';
}
