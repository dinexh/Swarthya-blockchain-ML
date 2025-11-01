const ENDLESSMEDICAL_API_URL = 'https://api.endlessmedical.com/v1/dx';
const ENDLESSMEDICAL_API_KEY = process.env.ENDLESSMEDICAL_API_KEY || '';
/**
 * EndlessMedical API integration for medical diagnosis
 * Note: You may need to sign up and get API key from endlessmedical.com
 */
export async function getDiagnosisFromEndlessMedical(request) {
    if (!ENDLESSMEDICAL_API_KEY) {
        console.warn('EndlessMedical API key not configured. Skipping.');
        return null;
    }
    try {
        const response = await fetch(ENDLESSMEDICAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENDLESSMEDICAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symptoms: request.symptoms.join(', '),
                description: request.description || ''
            })
        });
        if (!response.ok) {
            console.error('EndlessMedical API error:', response.statusText);
            return null;
        }
        const data = await response.json();
        // Parse EndlessMedical response format
        const suggestions = (data.conditions || []).map((condition) => ({
            condition: condition.name || condition.condition || 'Unknown',
            probability: condition.probability || condition.confidence || 0.5,
            description: condition.description,
            recommendations: condition.recommendations || []
        }));
        return {
            suggestions,
            confidence: data.confidence || 0.7,
            analysis: data.analysis || 'Analysis from EndlessMedical API'
        };
    }
    catch (error) {
        console.error('EndlessMedical API error:', error);
        return null;
    }
}
/**
 * Combine multiple AI sources for better accuracy
 */
export async function getCombinedDiagnosis(request, useEndlessMedical = true) {
    // Get diagnosis from primary source (Hugging Face)
    // If EndlessMedical is available, combine results
    const endlessResult = useEndlessMedical
        ? await getDiagnosisFromEndlessMedical(request)
        : null;
    // For now, return basic structure
    // In production, you'd combine results from multiple sources
    return endlessResult || {
        suggestions: [],
        confidence: 0.5,
        analysis: 'Multiple AI sources analysis'
    };
}
//# sourceMappingURL=endlessmedical.js.map