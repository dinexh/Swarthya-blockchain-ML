import mongoose from 'mongoose';
import { getBlocksByPatientId, getBlocksByLabel, getBlocksByTag, searchBlocks } from '../blockchain/chain.js';
export async function handleGetRecordsByPatient(req, res, conn) {
    try {
        const patientId = req.params.patientId;
        if (!patientId) {
            res.status(400).json({ error: 'Patient ID is required' });
            return;
        }
        const blocks = await getBlocksByPatientId(conn, patientId);
        res.json({
            success: true,
            count: blocks.length,
            records: blocks
        });
    }
    catch (error) {
        console.error('Error fetching patient records:', error);
        res.status(500).json({ error: 'Failed to fetch records', details: error.message });
    }
}
export async function handleGetRecordsByLabel(req, res, conn) {
    try {
        const label = req.params.label;
        if (!label) {
            res.status(400).json({ error: 'Label is required' });
            return;
        }
        const blocks = await getBlocksByLabel(conn, label);
        res.json({
            success: true,
            count: blocks.length,
            records: blocks
        });
    }
    catch (error) {
        console.error('Error fetching records by label:', error);
        res.status(500).json({ error: 'Failed to fetch records', details: error.message });
    }
}
export async function handleGetRecordsByTag(req, res, conn) {
    try {
        const tag = req.params.tag;
        if (!tag) {
            res.status(400).json({ error: 'Tag is required' });
            return;
        }
        const blocks = await getBlocksByTag(conn, tag);
        res.json({
            success: true,
            count: blocks.length,
            records: blocks
        });
    }
    catch (error) {
        console.error('Error fetching records by tag:', error);
        res.status(500).json({ error: 'Failed to fetch records', details: error.message });
    }
}
export async function handleSearchRecords(req, res, conn) {
    try {
        const { patientId, labels, tags, dateFrom, dateTo, recordType } = req.query;
        const filters = {};
        if (patientId)
            filters.patientId = patientId;
        if (labels) {
            filters.labels = typeof labels === 'string'
                ? labels.split(',')
                : labels;
        }
        if (tags) {
            filters.tags = typeof tags === 'string'
                ? tags.split(',')
                : tags;
        }
        if (dateFrom)
            filters.dateFrom = Number(dateFrom);
        if (dateTo)
            filters.dateTo = Number(dateTo);
        if (recordType)
            filters.recordType = recordType;
        const blocks = await searchBlocks(conn, filters);
        res.json({
            success: true,
            count: blocks.length,
            filters: filters,
            records: blocks
        });
    }
    catch (error) {
        console.error('Error searching records:', error);
        res.status(500).json({ error: 'Failed to search records', details: error.message });
    }
}
//# sourceMappingURL=records.js.map