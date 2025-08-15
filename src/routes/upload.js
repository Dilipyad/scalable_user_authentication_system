import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { imageQueue, emailQueue } from '../worker/queues.js';
import { User } from '../models/index.js';

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  const user = await User.findByPk(req.user.id);
  user.avatarPath = req.file.path;
  await user.save();
  await imageQueue.add({ userId: user.id, path: req.file.path });
  await emailQueue.add({ to: user.email, subject: 'Avatar uploaded', body: 'We received your image.' });
  res.json({ path: req.file.path });
});

export default router;
