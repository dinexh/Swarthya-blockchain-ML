import mongoose from 'mongoose';
export async function handleListFiles(req, res, bucket) {
    try {
        const cursor = bucket.find({});
        const docs = await cursor.toArray();
        res.json(docs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to list files', details: error.message });
    }
}
export async function handleDownloadFile(req, res, bucket) {
    try {
        const filename = req.params.filename;
        if (!filename) {
            res.status(400).json({ error: 'Filename is required' });
            return;
        }
        const file = await bucket.find({ filename }).toArray();
        if (!file || file.length === 0) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        const foundFile = file[0];
        res.setHeader('Content-Type', foundFile.contentType || 'application/octet-stream');
        res.setHeader('Content-Length', foundFile.length);
        const downloadStream = bucket.openDownloadStreamByName(filename);
        downloadStream.pipe(res);
    }
    catch (error) {
        res.status(500).json({ error: 'Download failed', details: error.message });
    }
}
//# sourceMappingURL=files.js.map