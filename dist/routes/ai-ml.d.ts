import type { Request, Response } from 'express';
import mongoose from 'mongoose';
export declare function handleDiagnose(req: Request, res: Response, conn: mongoose.Connection | null): Promise<void>;
export declare function handleAnalyzeImage(req: Request, res: Response, conn: mongoose.Connection | null): Promise<void>;
export declare function handleAnalyzeSymptoms(req: Request, res: Response, conn: mongoose.Connection | null): Promise<void>;
//# sourceMappingURL=ai-ml.d.ts.map