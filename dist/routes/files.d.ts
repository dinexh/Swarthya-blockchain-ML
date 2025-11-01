import type { Request, Response } from 'express';
import mongoose from 'mongoose';
export declare function handleListFiles(req: Request, res: Response, bucket: mongoose.mongo.GridFSBucket): Promise<void>;
export declare function handleDownloadFile(req: Request, res: Response, bucket: mongoose.mongo.GridFSBucket): Promise<void>;
//# sourceMappingURL=files.d.ts.map