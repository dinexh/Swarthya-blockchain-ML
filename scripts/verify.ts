import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mongoUri } from '../src/config/database.js';
import { getAllBlocks, verifyChainIntegrity, getBlockByFileId } from '../src/blockchain/chain.js';
import { computeFileHash } from '../src/storage/gridfs.js';

dotenv.config();

const fileId = process.argv[2];
const checkFile = fileId !== undefined;

(async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    const conn = mongoose.connection;

    console.log('✅ Connected to MongoDB\n');

    // 1. Verify Blockchain Integrity
    console.log('═'.repeat(80));
    console.log('🔗 Verifying Blockchain Integrity');
    console.log('═'.repeat(80));

    const blocks = await getAllBlocks(conn);

    if (blocks.length === 0) {
      console.log('⚠️  No blocks in the chain');
      console.log('ℹ️  Blockchain structure is empty but valid');
      
      if (checkFile) {
        console.log('\n⚠️  Cannot verify file: No blocks exist in chain');
      }
      
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📦 Found ${blocks.length} block(s)\n`);

    const chainResult = verifyChainIntegrity(blocks);

    if (chainResult.valid) {
      console.log('✅ CHAIN VERIFIED: All blocks are valid and properly linked!\n');
      
      console.log('📋 Block Details:');
      console.log('─'.repeat(80));
      for (const block of blocks) {
        console.log(`  Block ${block.index}: ${block.data.filename}`);
      }
      console.log('─'.repeat(80));
      
      console.log('\n🎉 Blockchain Integrity: CONFIRMED');
      console.log(`   - Total blocks: ${blocks.length}`);
      console.log(`   - All hash links: ✓`);
      console.log(`   - Chain continuity: ✓`);
    } else {
      console.error('\n❌ CHAIN INVALID: Tampering detected!\n');
      console.error('Errors:');
      for (const error of chainResult.errors) {
        console.error(`  ❌ ${error}`);
      }
      await mongoose.connection.close();
      process.exit(1);
    }

    // 2. Verify File (if fileId provided)
    if (checkFile) {
      console.log('\n' + '═'.repeat(80));
      console.log('📄 Verifying File Integrity');
      console.log('═'.repeat(80));
      console.log(`📂 File ID: ${fileId}\n`);

      try {
        // Get block for this file
        const block = await getBlockByFileId(conn, fileId);
        
        if (!block) {
          console.error('❌ No block found for this file ID');
          await mongoose.connection.close();
          process.exit(1);
        }

        // Compute current file hash
        const currentHash = await computeFileHash(conn, 'uploads', fileId, true);
        const storedHash = block.data.fileHash;

        console.log('📊 Verification Results:');
        console.log('─'.repeat(80));
        console.log(`Computed Hash : ${currentHash}`);
        console.log(`Block Hash    : ${storedHash}`);
        console.log('─'.repeat(80));

        const match = currentHash === storedHash;

        if (match) {
          console.log('\n✅ FILE VERIFIED: File hash matches blockchain record!');
          console.log('\n📦 Block Details:');
          console.log(`   - Index: ${block.index}`);
          console.log(`   - Filename: ${block.data.filename}`);
          console.log(`   - Timestamp: ${new Date(block.timestamp).toISOString()}`);
          console.log(`   - Block Hash: ${block.hash}`);
          console.log(`   - Prev Hash: ${block.prevHash}`);
        } else {
          console.error('\n❌ FILE MISMATCH: File has been modified or corrupted!');
          console.error('   The current file hash does not match the blockchain record.');
          await mongoose.connection.close();
          process.exit(1);
        }
      } catch (fileError: any) {
        console.error(`❌ Error verifying file: ${fileError.message}`);
        await mongoose.connection.close();
        process.exit(1);
      }
    } else {
      console.log('\n💡 Tip: To verify a specific file, pass the file ID as an argument:');
      console.log('   npm run verify <fileId>');
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('✅ BLOCKCHAIN SYSTEM STATUS: OPERATIONAL');
    console.log('═'.repeat(80));

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : String(err));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
})();

