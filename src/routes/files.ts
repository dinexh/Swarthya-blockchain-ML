import type { Request, Response } from 'express';
import mongoose from 'mongoose';

export async function handleListFiles(
  req: Request,
  res: Response,
  bucket: mongoose.mongo.GridFSBucket
): Promise<void> {
  try {
    const cursor = bucket.find({});
    const docs = await cursor.toArray();
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
}

export async function handleDownloadFile(
  req: Request,
  res: Response,
  bucket: mongoose.mongo.GridFSBucket
): Promise<void> {
  try {
    const filename = req.params.filename;
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    const file = await bucket.find({ filename }).toArray();
    if (!file || file.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const foundFile = file[0]!;
    res.setHeader('Content-Type', foundFile.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', foundFile.length);

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
}

