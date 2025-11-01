import mongoose from 'mongoose';
export declare function readFileFromGridFS(conn: mongoose.Connection, bucketName: string, fileIdOrName: string, byId?: boolean): Promise<Buffer>;
export declare function computeFileHash(conn: mongoose.Connection, bucketName: string, fileIdOrName: string, byId?: boolean): Promise<string>;
export declare function uploadFileToGridFS(bucket: mongoose.mongo.GridFSBucket, filename: string, buffer: Buffer, contentType: string, originalName: string): Promise<string>;
//# sourceMappingURL=gridfs.d.ts.map