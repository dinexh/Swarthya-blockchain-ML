import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { addBlockToChain } from '../blockchain/chain.js';
import { computeFileHash } from '../storage/gridfs.js';
import { uploadFileToGridFS } from '../storage/gridfs.js';

export async function handleUpload(
  req: Request,
  res: Response,
  conn: mongoose.Connection,
  bucket: mongoose.mongo.GridFSBucket
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Extract metadata from request body
    const { patientId, labels, tags, metadata } = req.body;
    
    // Validate required fields
    if (!patientId) {
      res.status(400).json({ error: 'patientId is required' });
      return;
    }

    // Parse labels and tags (can be JSON strings or arrays)
    let labelsArray: string[] = [];
    let tagsArray: string[] = [];
    let metadataObj: any = {};

    try {
      labelsArray = labels ? (typeof labels === 'string' ? JSON.parse(labels) : labels) : [];
      tagsArray = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
      metadataObj = metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {};
    } catch (parseError) {
      res.status(400).json({ error: 'Invalid JSON format for labels, tags, or metadata' });
      return;
    }

    // Ensure arrays
    if (!Array.isArray(labelsArray)) labelsArray = [];
    if (!Array.isArray(tagsArray)) tagsArray = [];

    const filename = `${Date.now()}-${req.file.originalname}`;

    // Upload to GridFS
    const fileId = await uploadFileToGridFS(
      bucket,
      filename,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Compute file hash
    const fileHash = await computeFileHash(conn, 'uploads', filename, false);

    // Add block to chain with metadata
    const block = await addBlockToChain(conn, {
      fileId: fileId,
      filename: filename,
      fileHash: fileHash,
      timestamp: Date.now(),
      patientId: patientId,
      labels: labelsArray,
      tags: tagsArray,
      metadata: metadataObj
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
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}

