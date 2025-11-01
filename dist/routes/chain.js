import mongoose from 'mongoose';
import { getAllBlocks } from '../blockchain/chain.js';
export async function handleGetChain(req, res, conn) {
    try {
        if (!conn.db) {
            res.status(500).json({ error: 'Database not ready' });
            return;
        }
        const blocks = await getAllBlocks(conn);
        res.json(blocks);
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
}
//# sourceMappingURL=chain.js.map