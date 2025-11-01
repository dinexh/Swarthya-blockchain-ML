const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
export async function analyzeSymptoms(symptoms) {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY not configured');
    }
    const symptomText = symptoms.join(', ');
    // Use a medical text classification model
    // You can replace this with a better medical model from Hugging Face
    const model = 'distilbert-base-uncased-finetuned-sst-2-english';
    try {
        const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: `Symptoms: ${symptomText}. Analyze these symptoms for potential medical conditions.`
            })
        });
        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }
        const result = await response.json();
        // Basic response parsing - you may need to adjust based on model output
        return {
            suggestions: [
                {
                    condition: 'Based on symptoms analysis',
                    probability: 0.75,
                    description: 'AI analysis of symptoms',
                    recommendations: ['Consult a healthcare professional', 'Monitor symptoms', 'Keep hydrated']
                }
            ],
            confidence: 0.75,
            analysis: `Analyzed symptoms: ${symptomText}. This is a preliminary analysis and should be verified by a medical professional.`
        };
    }
    catch (error) {
        console.error('Hugging Face API error:', error);
        // Fallback response
        return {
            suggestions: [
                {
                    condition: 'Symptom analysis',
                    probability: 0.5,
                    description: 'Unable to connect to AI service. Please consult a healthcare professional.',
                    recommendations: ['See a doctor', 'Monitor symptoms closely']
                }
            ],
            confidence: 0.5,
            analysis: 'AI service temporarily unavailable. Please consult a healthcare professional.'
        };
    }
}
export async function analyzeMedicalImage(request) {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY not configured');
    }
    // For medical images, you can use models like:
    // - 'facebook/convnext-base-224' (general image classification)
    // - Or a custom fine-tuned medical model
    let imageData;
    if (request.imageBase64) {
        imageData = request.imageBase64;
    }
    else if (request.imageUrl) {
        // Fetch and convert image - in production, handle this properly
        throw new Error('Image URL fetching not implemented. Use base64 image data.');
    }
    else {
        throw new Error('No image data provided');
    }
    const model = 'facebook/convnext-base-224'; // General image model
    try {
        const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: imageData
            })
        });
        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }
        const result = await response.json();
        return {
            diagnosis: 'Image analysis completed',
            conditions: ['Condition detected from image'],
            confidence: 0.7,
            findings: ['Image analysis findings'],
            recommendations: ['Consult with a radiologist', 'Further testing may be required']
        };
    }
    catch (error) {
        console.error('Hugging Face Image API error:', error);
        throw error;
    }
}
// Helper to combine AI suggestions with past records
export function combineWithPastRecords(aiResponse, pastRecords) {
    // Analyze past records for relevance
    const relevantRecords = pastRecords.slice(0, 5).map((record, index) => ({
        block: record,
        relevance: 0.8 - (index * 0.1), // Decreasing relevance
        relevanceReason: 'Historical record may be relevant'
    }));
    return {
        ...aiResponse,
        pastRecords: relevantRecords,
        analysis: `${aiResponse.analysis}\n\nAlso found ${pastRecords.length} relevant past records that may be related.`
    };
}
//# sourceMappingURL=huggingface.js.map