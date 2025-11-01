import mongoose from 'mongoose';
import { calcFileHash } from '../blockchain/hash.js';

export async function readFileFromGridFS(
  conn: mongoose.Connection,
  bucketName: string,
  fileIdOrName: string,
  byId = true
): Promise<Buffer> {
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

export async function computeFileHash(
  conn: mongoose.Connection,
  bucketName: string,
  fileIdOrName: string,
  byId = true
): Promise<string> {
  const buffer = await readFileFromGridFS(conn, bucketName, fileIdOrName, byId);
  return calcFileHash(buffer);
}

export async function uploadFileToGridFS(
  bucket: mongoose.mongo.GridFSBucket,
  filename: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        originalName,
        mimeType: contentType,
        uploadedAt: new Date(),
        size: buffer.length
      }
    });

    let fileId: any;

    uploadStream.on('error', (error: any) => {
      reject(error);
    });

    if (uploadStream.id) {
      fileId = uploadStream.id;
    }

    uploadStream.on('finish', () => {
      if (fileId) {
        resolve(fileId.toString());
      } else if (uploadStream.id) {
        resolve(uploadStream.id.toString());
      } else {
        reject(new Error('Failed to get file ID from GridFS'));
      }
    });

    uploadStream.end(buffer);
  });
}

