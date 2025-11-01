import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import { connectDatabase, port } from './config/database.js';
import { handleUpload } from './routes/upload.js';
import { handleListFiles, handleDownloadFile } from './routes/files.js';
import { handleGetChain } from './routes/chain.js';
import { handleVerifyByFileId, handleVerifyByFilename } from './routes/verify.js';
import {
  handleGetRecordsByPatient,
  handleGetRecordsByLabel,
  handleGetRecordsByTag,
  handleSearchRecords
} from './routes/records.js';
import {
  handleDiagnose,
  handleAnalyzeImage,
  handleAnalyzeSymptoms
} from './routes/ai-ml.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize database connection
const { connection: conn, bucket } = await connectDatabase();

// Wait for bucket to be ready
let gfsBucket: mongoose.mongo.GridFSBucket | null = bucket;
conn.once('open', () => {
  if (conn.db) {
    gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  }
});

// Wait for connection to be ready
await new Promise<void>((resolve) => {
  if (conn.readyState === 1) {
    resolve();
  } else {
    conn.once('open', () => resolve());
  }
});

// Ensure bucket is initialized
if (conn.db && !gfsBucket) {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
}

// Routes
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!gfsBucket) {
    return res.status(500).json({ error: 'GridFS not initialized yet' });
  }
  await handleUpload(req, res, conn, gfsBucket);
});

app.get('/files', async (req, res) => {
  if (!gfsBucket) {
    return res.status(500).json({ error: 'GridFS not initialized yet' });
  }
  await handleListFiles(req, res, gfsBucket);
});

app.get('/file/:filename', async (req, res) => {
  if (!gfsBucket) {
    return res.status(500).json({ error: 'GridFS not initialized yet' });
  }
  await handleDownloadFile(req, res, gfsBucket);
});

app.get('/chain', async (req, res) => {
  await handleGetChain(req, res, conn);
});

app.get('/verify/file/:fileId', async (req, res) => {
  if (!gfsBucket) {
    return res.status(500).json({ error: 'GridFS not ready' });
  }
  await handleVerifyByFileId(req, res, conn);
});

app.get('/verify/name/:filename', async (req, res) => {
  if (!gfsBucket) {
    return res.status(500).json({ error: 'GridFS not ready' });
  }
  await handleVerifyByFilename(req, res, conn);
});

// Record query routes
app.get('/records/patient/:patientId', async (req, res) => {
  await handleGetRecordsByPatient(req, res, conn);
});

app.get('/records/label/:label', async (req, res) => {
  await handleGetRecordsByLabel(req, res, conn);
});

app.get('/records/tag/:tag', async (req, res) => {
  await handleGetRecordsByTag(req, res, conn);
});

app.get('/records/search', async (req, res) => {
  await handleSearchRecords(req, res, conn);
});

// AI/ML routes
app.post('/ai/diagnose', async (req, res) => {
  await handleDiagnose(req, res, conn);
});

app.post('/ai/analyze-image', upload.single('image'), async (req, res) => {
  await handleAnalyzeImage(req, res, conn);
});

app.post('/ai/analyze-symptoms', async (req, res) => {
  await handleAnalyzeSymptoms(req, res, conn);
});

app.listen(port, () => console.log('Server listening on', port));
