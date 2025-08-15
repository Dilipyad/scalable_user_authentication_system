import Redis from 'ioredis';
export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
export const kUserDevice = (userId) => `user:${userId}:device`;
export const kTokenAllow = (jti) => `token:${jti}:allow`; 
export const kUserDevicesSet = (userId) => `user:${userId}:devices`; 
