import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/swasthya';

type BlockData = {
  fileId: string;
  filename: string;
  fileHash: string;
  timestamp: number;
};

type Block = {
  _id?: string;
  index: number;
  timestamp: number;
  data: BlockData;
  prevHash: string;
  hash: string;
};

function calcBlockHash(index: number, prevHash: string, timestamp: number, data: BlockData): string {
  const text = index + prevHash + timestamp + JSON.stringify(data);
  return crypto.createHash('sha256').update(text).digest('hex');
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

    console.log('📦 Retrieving blockchain...');
    const blockDocs = await db.collection('blocks').find().sort({ index: 1 }).toArray();
    const blocks: Block[] = blockDocs.map((doc: any) => ({
      _id: doc._id,
      index: doc.index,
      timestamp: doc.timestamp,
      data: doc.data,
      prevHash: doc.prevHash,
      hash: doc.hash
    }));

    if (blocks.length === 0) {
      console.log('⚠️  No blocks in the chain');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Found ${blocks.length} blocks\n`);
    console.log('═'.repeat(80));
    console.log('🔗 Verifying Blockchain Integrity');
    console.log('═'.repeat(80));

    let ok = true;
    let details: any[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!;
      const expected = calcBlockHash(block.index, block.prevHash, block.timestamp, block.data);

      // Check block hash
      if (expected !== block.hash) {
        console.error(`\n❌ BLOCK HASH MISMATCH at index ${block.index}`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Got:      ${block.hash}`);
        ok = false;
        break;
      }

      // Check chain linkage
      if (i > 0) {
        const prevBlock = blocks[i - 1]!;
        if (block.prevHash !== prevBlock.hash) {
          console.error(`\n❌ CHAIN LINK BROKEN between index ${prevBlock.index} → ${block.index}`);
          console.error(`   Block ${block.index}.prevHash: ${block.prevHash}`);
          console.error(`   Block ${prevBlock.index}.hash:     ${prevBlock.hash}`);
          ok = false;
          break;
        }
      } else {
        // Genesis block check
        if (block.prevHash !== '0') {
          console.error(`\n❌ GENESIS BLOCK ERROR`);
          console.error(`   Genesis prevHash should be "0", got "${block.prevHash}"`);
          ok = false;
          break;
        }
      }

      // Log this block's verification
      details.push({
        index: block.index,
        filename: block.data.filename,
        valid: true,
        hashMatch: true
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📋 Block Details:');
    console.log('═'.repeat(80));

    for (const detail of details) {
      console.log(`\n✅ Block ${detail.index}`);
      console.log(`   Filename: ${detail.filename}`);
      console.log(`   ✓ Hash verified`);
      console.log(`   ✓ Chain link verified`);
    }

    console.log('\n' + '═'.repeat(80));
    if (ok) {
      console.log('✅ CHAIN VERIFIED: All blocks are valid and properly linked!');
      console.log('═'.repeat(80));
      console.log('\n🎉 Blockchain Integrity: CONFIRMED');
      console.log(`   - Total blocks: ${blocks.length}`);
      console.log(`   - All hash links: ✓`);
      console.log(`   - Chain continuity: ✓`);
    } else {
      console.log('❌ CHAIN INVALID: Tampering detected!');
      console.log('═'.repeat(80));
    }

    await mongoose.connection.close();
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();
