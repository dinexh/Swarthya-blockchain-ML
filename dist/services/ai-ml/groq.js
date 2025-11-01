const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
/**
 * Groq API integration for fast medical diagnosis
 * Get free API key from: https://console.groq.com/keys
 * Groq is super fast and has free tier!
 */
export async function getDiagnosisFromGroq(request) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not configured. Get a free key from https://console.groq.com/keys');
    }
    const symptomText = request.symptoms.join(', ');
    const description = request.description || '';
    const prompt = `You are a medical assistant AI. Based on the following symptoms, provide a preliminary medical analysis.

Symptoms: ${symptomText}
${description ? `Description: ${description}` : ''}

Please provide:
1. 2-3 most likely conditions (with probabilities 0-1)
2. Brief description of each condition
3. General recommendations
4. When to seek immediate medical attention

IMPORTANT: This is for informational purposes only and should not replace professional medical advice.

Respond ONLY with valid JSON in this exact format:
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
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant', // Fast and available model
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful medical assistant. Always respond with valid JSON only, no markdown or code blocks.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        // Parse JSON response
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(content);
        }
        catch (e) {
            // Fallback if JSON parsing fails
            parsedResponse = {
                conditions: [],
                confidence: 0.6,
                analysis: content,
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
            analysis: parsedResponse.analysis || content || 'Analysis completed. Please consult a healthcare professional for accurate diagnosis.'
        };
    }
    catch (error) {
        console.error('Groq API error:', error);
        throw new Error(`Groq diagnosis failed: ${error.message}`);
    }
}
//# sourceMappingURL=groq.js.map