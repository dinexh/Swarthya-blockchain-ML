import mongoose from 'mongoose';
import type { Block, BlockData, BlockSearchFilters } from './types.js';
export declare function getLastBlock(conn: mongoose.Connection): Promise<Block | null>;
export declare function getAllBlocks(conn: mongoose.Connection): Promise<Block[]>;
export declare function getBlockByFileId(conn: mongoose.Connection, fileId: string): Promise<Block | null>;
export declare function getBlockByFileHash(conn: mongoose.Connection, fileHash: string): Promise<Block | null>;
export declare function getBlocksByPatientId(conn: mongoose.Connection, patientId: string): Promise<Block[]>;
export declare function getBlocksByLabel(conn: mongoose.Connection, label: string): Promise<Block[]>;
export declare function getBlocksByTag(conn: mongoose.Connection, tag: string): Promise<Block[]>;
export declare function searchBlocks(conn: mongoose.Connection, filters: BlockSearchFilters): Promise<Block[]>;
export declare function addBlockToChain(conn: mongoose.Connection, data: BlockData): Promise<Block>;
export declare function verifyBlockHash(block: Block): boolean;
export declare function verifyChainIntegrity(blocks: Block[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=chain.d.ts.map