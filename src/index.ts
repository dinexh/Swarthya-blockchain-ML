import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import crypto from 'crypto';

dotenv.config();

// =============== Blockchain Types & Helpers ===============
type BlockData = { fileId: string; filename: string; fileHash: string; timestamp: number };
type Block = {
  index: number;
  timestamp: number;
  data: BlockData;
  prevHash: string;
  hash: string;
};

function calcBlockHash(index: number, prevHash: string, timestamp: number, data: BlockData) {
  const text = index + prevHash + timestamp + JSON.stringify(data);
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Store blocks in Mongo collection 'blocks'
async function getLastBlock(conn: mongoose.Connection): Promise<Block | null> {
  if (!conn.db) return null;
  const coll = conn.db.collection('blocks');
  const last = await coll.find().sort({ index: -1 }).limit(1).toArray();
  return last.length ? (last[0] as any as Block) : null;
}

async function addBlockToChain(conn: mongoose.Connection, data: BlockData) {
  if (!conn.db) throw new Error('Database connection not ready');
  const coll = conn.db.collection('blocks');
  const last = await getLastBlock(conn);
  const index = last ? last.index + 1 : 1;
  const prevHash = last ? last.hash : '0';
  const timestamp = Date.now();
  const hash = calcBlockHash(index, prevHash, timestamp, data);
  const block: Block = { index, timestamp, data, prevHash, hash };
  await coll.insertOne(block);
  return block;
}

// Helper: read GridFS file into Buffer
async function readFileFromGridFS(conn: mongoose.Connection, bucketName: string, fileIdOrName: string, byId = true): Promise<Buffer> {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      if (!conn.db) throw new Error('Database connection not ready');
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName });
      
      let stream;
      if (byId) {
        const { ObjectId } = mongoose.mongo;
        stream = bucket.openDownloadStream(new ObjectId(fileIdOrName));
      } else {
        stream = bucket.openDownloadStreamByName(fileIdOrName);
      }

      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (err: Error) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    } catch (err) {
      reject(err);
    }
  });
}

// =============== End Blockchain Helpers ===============

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
    let responseAlreadySent = false;

    uploadStream.on('error', (error: any) => {
      if (!responseAlreadySent) {
        responseAlreadySent = true;
        console.error('Upload stream error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
      }
    });

    // Get the ID from the upload stream itself
    if (uploadStream.id) {
      uploadedFileId = uploadStream.id;
    }

    uploadStream.on('finish', async () => {
      if (responseAlreadySent) return;
      
      try {
        // If id wasn't set earlier, try to get it from the stream
        if (!uploadedFileId && uploadStream.id) {
          uploadedFileId = uploadStream.id;
        }

        // Ensure we have the file ID
        if (!uploadedFileId) {
          responseAlreadySent = true;
          console.error('No file ID available. uploadStream.id:', uploadStream.id);
          return res.status(500).json({ error: 'Failed to get file ID from GridFS', details: 'Upload stream ID is missing' });
        }

        // Compute file hash using the filename (which is unique with timestamp)
        const fileBuf = await readFileFromGridFS(conn, 'uploads', filename, false);
        const fileHash = crypto.createHash('sha256').update(fileBuf).digest('hex');

        // Add block to chain
        const block = await addBlockToChain(conn, {
          fileId: uploadedFileId.toString(),
          filename: filename,
          fileHash: fileHash,
          timestamp: Date.now()
        });

        responseAlreadySent = true;
        res.json({ 
          success: true,
          file: {
            id: uploadedFileId,
            filename: filename,
            size: req.file!.size,
            uploadDate: new Date(),
            contentType: req.file!.mimetype
          },
          block: block
        });
      } catch (blockError: any) {
        responseAlreadySent = true;
        console.error('Block creation error:', blockError);
        res.status(500).json({ error: 'Failed to create block', details: blockError.message });
      }
    });

    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
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

// Get entire blockchain
app.get('/chain', async (req: Request, res: Response) => {
  try {
    if (!conn.db) return res.status(500).json({ error: 'Database not ready' });
    const coll = conn.db.collection('blocks');
    const all = await coll.find().sort({ index: 1 }).toArray();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
});

// Verify file by fileId
app.get('/verify/file/:fileId', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId) return res.status(400).json({ error: 'FileId is required' });
    if (!gfsBucket) return res.status(500).json({ error: 'GridFS not ready' });
    if (!conn.db) return res.status(500).json({ error: 'Database not ready' });

    // Read bytes and compute hash
    const buf = await readFileFromGridFS(conn, 'uploads', fileId, true);
    const fileHash = crypto.createHash('sha256').update(buf).digest('hex');

    // Search block with same fileHash
    const coll = conn.db.collection('blocks');
    const found = await coll.findOne({ 'data.fileHash': fileHash });

    if (found) {
      return res.json({ verified: true, block: found });
    } else {
      return res.json({ verified: false, reason: 'No matching block found on chain' });
    }
  } catch (err: any) {
    console.error('verify error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Verify file by filename
app.get('/verify/name/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    if (!gfsBucket) return res.status(500).json({ error: 'GridFS not ready' });
    if (!conn.db) return res.status(500).json({ error: 'Database not ready' });

    const buf = await readFileFromGridFS(conn, 'uploads', filename, false);
    const fileHash = crypto.createHash('sha256').update(buf).digest('hex');

    const coll = conn.db.collection('blocks');
    const found = await coll.findOne({ 'data.fileHash': fileHash });

    if (found) {
      return res.json({ verified: true, block: found });
    } else {
      return res.json({ verified: false, reason: 'No matching block found on chain' });
    }
  } catch (err: any) {
    console.error('verify name error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(port, () => console.log('Server listening on', port));
