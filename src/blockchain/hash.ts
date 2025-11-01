import crypto from 'crypto';
import type { BlockData } from './types.js';

export function calcBlockHash(
  index: number,
  prevHash: string,
  timestamp: number,
  data: BlockData
): string {
  const text = index + prevHash + timestamp + JSON.stringify(data);
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function calcFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

