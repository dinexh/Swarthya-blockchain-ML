const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
/**
 * Google Gemini API integration for medical diagnosis
 * Get free API key from: https://aistudio.google.com/app/apikey
 */
export async function getDiagnosisFromGemini(request) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured. Get a free key from https://aistudio.google.com/app/apikey');
    }
    const symptomText = request.symptoms.join(', ');
    const description = request.description || '';
    const prompt = `You are a medical assistant AI. Based on the following symptoms and description, provide a preliminary medical analysis.

Symptoms: ${symptomText}
${description ? `Description: ${description}` : ''}

Please provide:
1. 2-3 most likely conditions (with probabilities)
2. Brief description of each condition
3. General recommendations
4. When to seek immediate medical attention

IMPORTANT: This is for informational purposes only and should not replace professional medical advice.

Format your response as JSON with this structure:
{
  "conditions": [
    {
      "name": "condition name",
      "probability": 0.7,
      "description": "brief description",
      "recommendations": ["recommendation 1", "recommendation 2"]
    }
  ],
  "confidence": 0.75,
  "analysis": "overall analysis",
  "warning": "when to seek immediate care"
}`;
    try {
        const response = await fetch(`${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                        parts: [{
                                text: prompt
                            }]
                    }]
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Try to parse JSON from response
        let parsedResponse;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : text;
            parsedResponse = JSON.parse(jsonText);
        }
        catch (e) {
            // Fallback: parse suggestions from text
            parsedResponse = {
                conditions: [],
                confidence: 0.7,
                analysis: text,
                warning: 'Please consult a healthcare professional for accurate diagnosis.'
            };
        }
        const suggestions = (parsedResponse.conditions || []).map((condition) => ({
            condition: condition.name || 'Unknown condition',
            probability: condition.probability || 0.5,
            description: condition.description || '',
            recommendations: condition.recommendations || [
                'Consult a healthcare professional',
                'Monitor symptoms closely',
                'Rest and stay hydrated'
            ]
        }));
        // If no conditions parsed, create a general suggestion
        if (suggestions.length === 0) {
            suggestions.push({
                condition: 'Symptom analysis',
                probability: 0.6,
                description: parsedResponse.analysis || 'Based on your symptoms, further evaluation is recommended.',
                recommendations: [
                    'Consult a healthcare professional',
                    'Keep track of your symptoms',
                    parsedResponse.warning || 'Seek immediate care if symptoms worsen'
                ]
            });
        }
        return {
            suggestions,
            confidence: parsedResponse.confidence || 0.7,
            analysis: parsedResponse.analysis || text || 'Analysis completed. Please consult a healthcare professional for accurate diagnosis.'
        };
    }
    catch (error) {
        console.error('Gemini API error:', error);
        throw new Error(`Gemini diagnosis failed: ${error.message}`);
    }
}
export async function analyzeImageWithGemini(request) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    let imageData;
    if (request.imageBase64) {
        imageData = request.imageBase64;
    }
    else if (request.imageUrl) {
        // For URL, we'd need to fetch it first, but for now support base64
        throw new Error('Please provide image as base64. URL support coming soon.');
    }
    else {
        throw new Error('No image data provided');
    }
    const prompt = `You are a medical imaging analysis AI. Analyze this medical image (could be X-ray, CT scan, ultrasound, or other medical imaging).

Please provide:
1. Potential findings or conditions visible
2. Confidence level
3. Recommendations for follow-up

IMPORTANT: This is for informational purposes only and should not replace professional radiological interpretation.

Format your response as JSON:
{
  "diagnosis": "overall assessment",
  "conditions": ["condition 1", "condition 2"],
  "confidence": 0.7,
  "findings": ["finding 1", "finding 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;
    try {
        const response = await fetch(`${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                        parts: [
                            {
                                text: prompt
                            },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: imageData.replace(/^data:image\/\w+;base64,/, '')
                                }
                            }
                        ]
                    }]
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Try to parse JSON from response
        let parsedResponse;
        try {
            const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : text;
            parsedResponse = JSON.parse(jsonText);
        }
        catch (e) {
            parsedResponse = {
                diagnosis: text || 'Image analysis completed',
                conditions: [],
                confidence: 0.6,
                findings: ['Analysis completed'],
                recommendations: ['Consult with a radiologist for professional interpretation']
            };
        }
        return {
            diagnosis: parsedResponse.diagnosis || 'Medical image analysis',
            conditions: parsedResponse.conditions || [],
            confidence: parsedResponse.confidence || 0.6,
            findings: parsedResponse.findings || ['Analysis completed'],
            recommendations: parsedResponse.recommendations || [
                'Consult with a radiologist',
                'Further testing may be required'
            ]
        };
    }
    catch (error) {
        console.error('Gemini Image API error:', error);
        throw new Error(`Gemini image analysis failed: ${error.message}`);
    }
}
//# sourceMappingURL=gemini.js.map