import mongoose from 'mongoose';
import { aiMLService } from '../services/ai-ml/index.js';
import { getBlocksByPatientId } from '../blockchain/chain.js';
import { readFileFromGridFS } from '../storage/gridfs.js';
export async function handleDiagnose(req, res, conn) {
    try {
        const { symptoms, patientId, description } = req.body;
        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            res.status(400).json({ error: 'Symptoms array is required' });
            return;
        }
        // Get past records if patientId provided and database is available
        let pastRecords = [];
        if (patientId && conn && typeof conn.db === 'object') {
            try {
                pastRecords = await getBlocksByPatientId(conn, patientId);
            }
            catch (dbError) {
                console.warn('Could not fetch past records from database:', dbError);
                // Continue without past records for testing
            }
        }
        const diagnosis = await aiMLService.diagnose({
            symptoms,
            patientId,
            description
        }, pastRecords);
        res.json({
            success: true,
            diagnosis
        });
    }
    catch (error) {
        console.error('Diagnosis error:', error);
        res.status(500).json({ error: 'Diagnosis failed', details: error.message });
    }
}
export async function handleAnalyzeImage(req, res, conn) {
    try {
        const { imageUrl, imageBase64, patientId } = req.body;
        if (!imageUrl && !imageBase64 && !req.file) {
            res.status(400).json({ error: 'Either imageUrl, imageBase64, or uploaded file is required' });
            return;
        }
        // If image is uploaded via file, convert to base64
        let base64Image = imageBase64;
        if (req.file) {
            base64Image = req.file.buffer.toString('base64');
        }
        const analysis = await aiMLService.analyzeImage({
            imageUrl,
            imageBase64: base64Image,
            patientId
        });
        res.json({
            success: true,
            analysis
        });
    }
    catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: 'Image analysis failed', details: error.message });
    }
}
export async function handleAnalyzeSymptoms(req, res, conn) {
    try {
        const { symptoms, description } = req.body;
        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            res.status(400).json({ error: 'Symptoms array is required' });
            return;
        }
        const analysis = await aiMLService.analyzeSymptomsText(symptoms, description);
        res.json({
            success: true,
            analysis
        });
    }
    catch (error) {
        console.error('Symptom analysis error:', error);
        res.status(500).json({ error: 'Symptom analysis failed', details: error.message });
    }
}
//# sourceMappingURL=ai-ml.js.map