import type { Request, Response } from 'express';
import mongoose from 'mongoose';
export declare function handleGetRecordsByPatient(req: Request, res: Response, conn: mongoose.Connection): Promise<void>;
export declare function handleGetRecordsByLabel(req: Request, res: Response, conn: mongoose.Connection): Promise<void>;
export declare function handleGetRecordsByTag(req: Request, res: Response, conn: mongoose.Connection): Promise<void>;
export declare function handleSearchRecords(req: Request, res: Response, conn: mongoose.Connection): Promise<void>;
//# sourceMappingURL=records.d.ts.map