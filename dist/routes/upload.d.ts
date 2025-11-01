import type { Request, Response } from 'express';
import mongoose from 'mongoose';
export declare function handleUpload(req: Request, res: Response, conn: mongoose.Connection, bucket: mongoose.mongo.GridFSBucket): Promise<void>;
//# sourceMappingURL=upload.d.ts.map