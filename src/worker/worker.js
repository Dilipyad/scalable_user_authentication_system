import 'dotenv/config';
import { emailQueue, imageQueue } from './queues.js';
import fs from 'fs';

emailQueue.process(async (job) => {
  console.log('Sending email:', job.data);
});

imageQueue.process(async (job) => {
  const exists = fs.existsSync(job.data.path);
  console.log('Process image for user', job.data.userId, 'exists:', exists);
});
