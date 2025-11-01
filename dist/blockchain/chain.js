import mongoose from 'mongoose';
import { calcBlockHash } from './hash.js';
export async function getLastBlock(conn) {
    if (!conn.db)
        return null;
    const coll = conn.db.collection('blocks');
    const last = await coll.find().sort({ index: -1 }).limit(1).toArray();
    return last.length ? last[0] : null;
}
export async function getAllBlocks(conn) {
    if (!conn.db)
        return [];
    const coll = conn.db.collection('blocks');
    const blocks = await coll.find().sort({ index: 1 }).toArray();
    return blocks;
}
export async function getBlockByFileId(conn, fileId) {
    if (!conn.db)
        return null;
    const coll = conn.db.collection('blocks');
    const block = await coll.findOne({ 'data.fileId': fileId });
    return block;
}
export async function getBlockByFileHash(conn, fileHash) {
    if (!conn.db)
        return null;
    const coll = conn.db.collection('blocks');
    const block = await coll.findOne({ 'data.fileHash': fileHash });
    return block;
}
export async function addBlockToChain(conn, data) {
    if (!conn.db)
        throw new Error('Database connection not ready');
    const coll = conn.db.collection('blocks');
    const last = await getLastBlock(conn);
    const index = last ? last.index + 1 : 1;
    const prevHash = last ? last.hash : '0';
    const timestamp = Date.now();
    const hash = calcBlockHash(index, prevHash, timestamp, data);
    const block = { index, timestamp, data, prevHash, hash };
    await coll.insertOne(block);
    return block;
}
export function verifyBlockHash(block) {
    const expected = calcBlockHash(block.index, block.prevHash, block.timestamp, block.data);
    return expected === block.hash;
}
export function verifyChainIntegrity(blocks) {
    const errors = [];
    if (blocks.length === 0) {
        return { valid: true, errors: [] };
    }
    // Verify genesis block
    const genesis = blocks[0];
    if (genesis.prevHash !== '0') {
        errors.push(`Genesis block (index ${genesis.index}) prevHash should be "0", got "${genesis.prevHash}"`);
    }
    // Verify each block
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        // Verify block hash
        if (!verifyBlockHash(block)) {
            errors.push(`Block ${block.index}: Hash mismatch - block may be tampered`);
            continue;
        }
        // Verify chain linkage (skip for genesis block)
        if (i > 0) {
            const prevBlock = blocks[i - 1];
            if (block.prevHash !== prevBlock.hash) {
                errors.push(`Chain link broken between block ${prevBlock.index} → ${block.index}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=chain.js.map