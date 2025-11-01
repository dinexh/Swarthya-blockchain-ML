import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/swasthya';
const fileId = process.argv[2];

if (!fileId) {
  console.error('❌ Usage: npx ts-node scripts/verifyFile.ts <fileId>');
  console.error('Example: npx ts-node scripts/verifyFile.ts 673a4f2c1234567890abcdef');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO);
    
    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    const { ObjectId } = mongoose.mongo;

    console.log(`📂 Retrieving file with ID: ${fileId}`);

    const chunks: Buffer[] = [];
    const stream = bucket.openDownloadStream(new ObjectId(fileId));

    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on('end', async () => {
      try {
        const buf = Buffer.concat(chunks);
        const fileHash = crypto.createHash('sha256').update(buf).digest('hex');

        console.log('✅ File retrieved and hashed');
        console.log(`📊 File size: ${buf.length} bytes`);

        const block = await db.collection('blocks').findOne({ 'data.fileId': fileId });

        if (!block) {
          console.error('❌ No block found for this file ID');
          process.exit(1);
        }

        console.log('\n📋 Verification Results:');
        console.log('═'.repeat(50));
        console.log(`Computed Hash : ${fileHash}`);
        console.log(`Block Hash    : ${block.data.fileHash}`);
        console.log('═'.repeat(50));

        const match = block.data.fileHash === fileHash;
        console.log(`\n${match ? '✅ VERIFIED' : '❌ MISMATCH'}: File hash matches block!`);

        if (match) {
          console.log('\n📦 Block Details:');
          console.log(`  - Index: ${block.index}`);
          console.log(`  - Filename: ${block.data.filename}`);
          console.log(`  - Timestamp: ${new Date(block.timestamp).toISOString()}`);
          console.log(`  - Block Hash: ${block.hash}`);
          console.log(`  - Prev Hash: ${block.prevHash}`);
        } else {
          console.log('\n⚠️  File has been modified or corrupted!');
        }

        await mongoose.connection.close();
        process.exit(match ? 0 : 2);
      } catch (err) {
        console.error('❌ Error processing file:', err);
        await mongoose.connection.close();
        process.exit(1);
      }
    });

    stream.on('error', async (err: Error) => {
      console.error('❌ Stream error:', err.message);
      await mongoose.connection.close();
      process.exit(2);
    });
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();
