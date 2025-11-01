import mongoose from 'mongoose';
import { addBlockToChain } from '../blockchain/chain.js';
import { computeFileHash } from '../storage/gridfs.js';
import { uploadFileToGridFS } from '../storage/gridfs.js';
export async function handleUpload(req, res, conn, bucket) {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const filename = `${Date.now()}-${req.file.originalname}`;
        // Upload to GridFS
        const fileId = await uploadFileToGridFS(bucket, filename, req.file.buffer, req.file.mimetype, req.file.originalname);
        // Compute file hash
        const fileHash = await computeFileHash(conn, 'uploads', filename, false);
        // Add block to chain
        const block = await addBlockToChain(conn, {
            fileId: fileId,
            filename: filename,
            fileHash: fileHash,
            timestamp: Date.now()
        });
        res.json({
            success: true,
            file: {
                id: fileId,
                filename: filename,
                size: req.file.size,
                uploadDate: new Date(),
                contentType: req.file.mimetype
            },
            block: block
        });
    }
    catch (error) {
        console.error('Upload endpoint error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
}
//# sourceMappingURL=upload.js.map