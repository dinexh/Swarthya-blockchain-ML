import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getBlockByFileHash, getBlockByFileId } from '../blockchain/chain.js';
import { computeFileHash } from '../storage/gridfs.js';

export async function handleVerifyByFileId(
  req: Request,
  res: Response,
  conn: mongoose.Connection
): Promise<void> {
  try {
    const fileId = req.params.fileId;
    if (!fileId) {
      res.status(400).json({ error: 'FileId is required' });
      return;
    }
    if (!conn.db) {
      res.status(500).json({ error: 'Database not ready' });
      return;
    }

    // Compute hash of current file
    const fileHash = await computeFileHash(conn, 'uploads', fileId, true);

    // Find block with matching hash
    const block = await getBlockByFileHash(conn, fileHash);

    if (block) {
      res.json({ verified: true, block });
    } else {
      res.json({ verified: false, reason: 'No matching block found on chain' });
    }
  } catch (err: any) {
    console.error('Verify error', err);
    res.status(500).json({ error: String(err) });
  }
}

export async function handleVerifyByFilename(
  req: Request,
  res: Response,
  conn: mongoose.Connection
): Promise<void> {
  try {
    const filename = req.params.filename;
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }
    if (!conn.db) {
      res.status(500).json({ error: 'Database not ready' });
      return;
    }

    // Compute hash of current file
    const fileHash = await computeFileHash(conn, 'uploads', filename, false);

    // Find block with matching hash
    const block = await getBlockByFileHash(conn, fileHash);

    if (block) {
      res.json({ verified: true, block });
    } else {
      res.json({ verified: false, reason: 'No matching block found on chain' });
    }
  } catch (err: any) {
    console.error('Verify name error', err);
    res.status(500).json({ error: String(err) });
  }
}

