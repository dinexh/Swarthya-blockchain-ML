import mongoose from 'mongoose';
import { calcFileHash } from '../blockchain/hash.js';
export async function readFileFromGridFS(conn, bucketName, fileIdOrName, byId = true) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!conn.db)
                throw new Error('Database connection not ready');
            const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName });
            let stream;
            if (byId) {
                const { ObjectId } = mongoose.mongo;
                stream = bucket.openDownloadStream(new ObjectId(fileIdOrName));
            }
            else {
                stream = bucket.openDownloadStreamByName(fileIdOrName);
            }
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        }
        catch (err) {
            reject(err);
        }
    });
}
export async function computeFileHash(conn, bucketName, fileIdOrName, byId = true) {
    const buffer = await readFileFromGridFS(conn, bucketName, fileIdOrName, byId);
    return calcFileHash(buffer);
}
export async function uploadFileToGridFS(bucket, filename, buffer, contentType, originalName) {
    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, {
            contentType,
            metadata: {
                originalName,
                mimeType: contentType,
                uploadedAt: new Date(),
                size: buffer.length
            }
        });
        let fileId;
        uploadStream.on('error', (error) => {
            reject(error);
        });
        if (uploadStream.id) {
            fileId = uploadStream.id;
        }
        uploadStream.on('finish', () => {
            if (fileId) {
                resolve(fileId.toString());
            }
            else if (uploadStream.id) {
                resolve(uploadStream.id.toString());
            }
            else {
                reject(new Error('Failed to get file ID from GridFS'));
            }
        });
        uploadStream.end(buffer);
    });
}
//# sourceMappingURL=gridfs.js.map