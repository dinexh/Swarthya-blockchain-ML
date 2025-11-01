import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import type { Request, Response } from 'express';

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
  if (conn.db) {
    gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
    console.log('MongoDB connected, GridFS bucket ready.');
  }
});

// Use memory storage for multer - we'll handle GridFS manually
const storage = multer.memoryStorage();
const upload = multer({ storage });

// upload endpoint
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!gfsBucket) return res.status(500).json({ error: 'GridFS not initialized yet' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = `${Date.now()}-${req.file.originalname}`;
    
    // Upload to GridFS
    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        size: req.file.size
      }
    });

    let uploadedFileId: any;

    uploadStream.on('error', (error: any) => {
      res.status(500).json({ error: 'Upload failed', details: error.message });
    });

    // The 'id' event is emitted after the file is created
    uploadStream.on('id', (id: any) => {
      uploadedFileId = id;
    });

    uploadStream.on('finish', () => {
      res.json({ 
        file: {
          id: uploadedFileId,
          filename: filename,
          size: req.file!.size,
          uploadDate: new Date(),
          contentType: req.file!.mimetype
        }
      });
    });

    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// list files
app.get('/files', async (req: Request, res: Response) => {
  if (!gfsBucket) return res.status(500).json({ error: 'GridFS not initialized yet' });
  try {
    const cursor = gfsBucket.find({});
    const docs = await cursor.toArray();
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// stream file by filename
app.get('/file/:filename', async (req: Request, res: Response) => {
  if (!gfsBucket) return res.status(500).json({ error: 'GridFS not initialized yet' });
  try {
    const filename = req.params.filename;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    
    const file = await gfsBucket.find({ filename }).toArray();
    if (!file || file.length === 0) return res.status(404).json({ error: 'File not found' });
    
    const foundFile = file[0];
    if (!foundFile) return res.status(404).json({ error: 'File not found' });
    
    res.setHeader('Content-Type', foundFile.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', foundFile.length);
    
    const downloadStream = gfsBucket.openDownloadStreamByName(filename);
    downloadStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

app.listen(port, () => console.log('Server listening on', port));
