import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './models/index.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.resolve(__dirname, '..', process.env.UPLOAD_DIR)));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/files', uploadRouter);

const PORT = process.env.PORT || 4000;

await sequelize.sync();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
