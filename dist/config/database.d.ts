import mongoose from 'mongoose';
export declare const mongoUri: string;
export declare const port: number;
export declare function connectDatabase(): Promise<{
    connection: mongoose.Connection;
    bucket: mongoose.mongo.GridFSBucket | null;
}>;
//# sourceMappingURL=database.d.ts.map