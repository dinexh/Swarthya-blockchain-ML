import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { addBlockToChain } from '../blockchain/chain.js';
import { computeFileHash } from '../storage/gridfs.js';
import { uploadFileToGridFS } from '../storage/gridfs.js';
import crypto from 'crypto';

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

    // Upload to GridFS (for file storage)
    const fileId = await uploadFileToGridFS(
      bucket,
      filename,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Compute file hash
    const fileHash = await computeFileHash(conn, 'uploads', filename, false);

    // Add block to chain with metadata (proper prevHash linking is handled in addBlockToChain)
    const block = await addBlockToChain(conn, {
      fileId: fileId.toString(),
      filename: filename,
      fileHash: fileHash,
      timestamp: Date.now(),
      patientId: patientId,
      labels: labelsArray,
      tags: tagsArray,
      metadata: metadataObj
    });

    // Create clean medical record document (no chunks, just metadata)
    if (!conn.db) throw new Error('Database connection not ready');
    const recordsColl = conn.db.collection('medical_records');
    const recordDoc = {
      _id: new mongoose.Types.ObjectId(),
      recordId: fileId.toString(),
      patientId: patientId,
      filename: filename,
      originalName: req.file.originalname,
      fileHash: fileHash,
      blockHash: block.hash,
      blockIndex: block.index,
      prevHash: block.prevHash,
      contentType: req.file.mimetype,
      size: req.file.size,
      labels: labelsArray,
      tags: tagsArray,
      metadata: {
        ...metadataObj,
        uploadedAt: new Date(),
        uploadedBy: metadataObj.uploadedBy || patientId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await recordsColl.insertOne(recordDoc);

    res.json({
      success: true,
      message: 'Record uploaded and stored in blockchain',
      record: {
        id: recordDoc._id.toString(),
        recordId: fileId.toString(),
        filename: filename,
        size: req.file.size,
        uploadDate: recordDoc.createdAt,
        contentType: req.file.mimetype
      },
      block: block
    });
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}

export async function handleStoreMetadata(
  req: Request,
  res: Response,
  conn: mongoose.Connection
): Promise<void> {
  try {
    const { patientId, fileId, filename, metadata, tags, labels } = req.body;

    // Validate required fields
    if (!patientId || !fileId || !filename) {
      res.status(400).json({ error: 'patientId, fileId, and filename are required' });
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

    // Create a hash of the metadata for blockchain storage
    const metadataString = JSON.stringify({
      fileId,
      filename,
      patientId,
      metadata: metadataObj,
      tags: tagsArray,
      labels: labelsArray
    });
    const fileHash = crypto.createHash('sha256').update(metadataString).digest('hex');

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

    // Create clean medical record document
    if (!conn.db) throw new Error('Database connection not ready');
    const recordsColl = conn.db.collection('medical_records');
    const recordDoc = {
      _id: new mongoose.Types.ObjectId(),
      recordId: fileId,
      patientId: patientId,
      filename: filename,
      originalName: filename,
      fileHash: fileHash,
      blockHash: block.hash,
      blockIndex: block.index,
      prevHash: block.prevHash,
      contentType: 'application/json',
      size: 0,
      labels: labelsArray,
      tags: tagsArray,
      metadata: metadataObj,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await recordsColl.insertOne(recordDoc);

    res.json({
      success: true,
      message: 'Medical record metadata stored in blockchain',
      record: {
        id: recordDoc._id.toString(),
        recordId: fileId,
        blockHash: block.hash,
        prevHash: block.prevHash
      },
      block: block,
      fileId: fileId,
      hash: fileHash
    });
  } catch (error: any) {
    console.error('Metadata storage error:', error);
    res.status(500).json({ error: 'Metadata storage failed', details: error.message });
  }
}

