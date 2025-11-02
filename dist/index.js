import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import { connectDatabase, port } from './config/database.js';
import { handleUpload, handleStoreMetadata } from './routes/upload.js';
import { handleListFiles, handleDownloadFile } from './routes/files.js';
import { handleGetChain } from './routes/chain.js';
import { handleVerifyByFileId, handleVerifyByFilename } from './routes/verify.js';
import { handleGetRecordsByPatient, handleGetRecordsByLabel, handleGetRecordsByTag, handleSearchRecords } from './routes/records.js';
import { handleDiagnose, handleAnalyzeImage, handleAnalyzeSymptoms } from './routes/ai-ml.js';
const app = express();
app.use(cors());
app.use(express.json());
// app.use(express.static('public')); // Commented out to prevent conflicts with API routes
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });
// Initialize database connection (optional for basic AI functionality)
let conn = null;
let bucket = null;
let gfsBucket = null;
// Try to connect to database asynchronously (don't block server startup)
connectDatabase().then((dbResult) => {
    conn = dbResult.connection;
    bucket = dbResult.bucket;
    gfsBucket = bucket; // Set gfsBucket when database connects
    console.log('✅ Database connected successfully');
    // Set up GridFS bucket when database is ready
    if (conn && conn.db) {
        gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
    }
}).catch((dbError) => {
    console.warn('⚠️  Database connection failed, running in limited mode:', dbError.message);
    conn = null;
    bucket = null;
    gfsBucket = null;
});
// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'OK', service: 'Swarthya-blockchain-ML', timestamp: new Date().toISOString() });
});
// Routes
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!conn || !gfsBucket) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleUpload(req, res, conn, gfsBucket);
});
app.get('/files', async (req, res) => {
    if (!conn || !gfsBucket) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleListFiles(req, res, gfsBucket);
});
app.get('/file/:filename', async (req, res) => {
    if (!conn || !gfsBucket) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleDownloadFile(req, res, gfsBucket);
});
app.get('/chain', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleGetChain(req, res, conn);
});
app.get('/verify/file/:fileId', async (req, res) => {
    if (!conn || !gfsBucket) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleVerifyByFileId(req, res, conn);
});
app.get('/verify/name/:filename', async (req, res) => {
    if (!conn || !gfsBucket) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleVerifyByFilename(req, res, conn);
});
// Record query routes
app.get('/records/patient/:patientId', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleGetRecordsByPatient(req, res, conn);
});
app.get('/records/label/:label', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleGetRecordsByLabel(req, res, conn);
});
app.get('/records/tag/:tag', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleGetRecordsByTag(req, res, conn);
});
app.get('/records/search', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleSearchRecords(req, res, conn);
});
// AI/ML routes (work without database connection)
app.post('/ai/diagnose', async (req, res) => {
    await handleDiagnose(req, res, conn);
});
app.post('/ai/analyze-image', upload.single('image'), async (req, res) => {
    await handleAnalyzeImage(req, res, conn);
});
app.post('/ai/analyze-symptoms', async (req, res) => {
    await handleAnalyzeSymptoms(req, res, conn);
});
// Metadata-only blockchain storage
app.post('/blockchain/store', async (req, res) => {
    if (!conn) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    await handleStoreMetadata(req, res, conn);
});
app.listen(port, () => console.log('Server listening on', port));
//# sourceMappingURL=index.js.map