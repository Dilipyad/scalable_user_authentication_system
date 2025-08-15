import Queue from 'bull';

const redis = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const emailQueue = new Queue('email', redis);
export const imageQueue = new Queue('image', redis);
