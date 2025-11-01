import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAllBlocks } from '../blockchain/chain.js';

export async function handleGetChain(
  req: Request,
  res: Response,
  conn: mongoose.Connection
): Promise<void> {
  try {
    if (!conn.db) {
      res.status(500).json({ error: 'Database not ready' });
      return;
    }
    const blocks = await getAllBlocks(conn);
    res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
}

