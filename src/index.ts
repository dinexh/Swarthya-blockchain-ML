import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import { Request, Response } from 'express';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/swasthya';
const port = Number(process.env.PORT || 3000);

mongoose.connect(mongoUri);
const conn = mongoose.connection;

let gfsBucket: mongoose.mongo.GridFSBucket | null = null;
conn.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('MongoDB connected, GridFS bucket ready.');
});

// multer-gridfs-storage
const storage = new GridFsStorage({
  url: mongoUri,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req: Request, file: Express.Multer.File) => {
    return {
      bucketName: 'uploads',
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});
const upload = multer({ storage });

// upload endpoint
app.post('/upload', upload.single('file'), (req: any, res: Response) => {
  // multer-gridfs-storage attaches file info to req.file
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ file: req.file });
});

// list files
app.get('/files', async (req: Request, res: Response) => {
  if (!gfsBucket) return res.status(500).json({ error: 'GridFS not initialized yet' });
  const files: any[] = [];
  const cursor = gfsBucket.find({});
  const docs = await cursor.toArray();
  res.json(docs);
});

// stream file by filename
app.get('/file/:filename', async (req: Request, res: Response) => {
  if (!gfsBucket) return res.status(500).json({ error: 'GridFS not initialized yet' });
  const file = await gfsBucket.find({ filename: req.params.filename }).toArray();
  if (!file || file.length === 0) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', file[0].contentType || 'application/octet-stream');
  const downloadStream = gfsBucket.openDownloadStreamByName(req.params.filename);
  downloadStream.pipe(res);
});

app.listen(port, () => console.log('Server listening on', port));
