import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/swasthya';
export const port = Number(process.env.PORT || 4000);
export async function connectDatabase() {
    await mongoose.connect(mongoUri);
    const conn = mongoose.connection;
    let bucket = null;
    conn.once('open', () => {
        if (conn.db) {
            bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
            console.log('MongoDB connected, GridFS bucket ready.');
        }
    });
    return { connection: conn, bucket };
}
//# sourceMappingURL=database.js.map