import type { DiagnosisRequest, DiagnosisResponse, ImageAnalysisRequest, ImageAnalysisResponse } from './types.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Google Gemini API integration for medical diagnosis
 * Get free API key from: https://aistudio.google.com/app/apikey
 */
export async function getDiagnosisFromGemini(
  request: DiagnosisRequest
): Promise<DiagnosisResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured. Get a free key from https://aistudio.google.com/app/apikey');
  }

  const symptomText = request.symptoms.join(', ');
  const description = request.description || '';
  
  const prompt = `You are a medical assistant AI. Based on the following symptoms and description, provide a preliminary medical analysis.

Symptoms: ${symptomText}
${description ? `Description: ${description}` : ''}

CRITICAL INSTRUCTIONS FOR MEDICATIONS:
- The "medications" field MUST contain ONLY actual medication/drug names with specific dosages
- Examples of CORRECT medications: "Paracetamol 500mg - 1-2 tablets every 4-6 hours", "Ibuprofen 400mg - 1 tablet every 6-8 hours", "Acetaminophen 500mg twice daily"
- DO NOT include generic health advice like "rest", "stay hydrated", "drink fluids", "get plenty of sleep" in the medications array
- DO NOT include "consult a doctor" or "seek medical attention" as medications
- Only include actual pharmaceutical drugs with dosage information
- If no specific medication is recommended, include "Consult a healthcare professional for prescription medications"

Please provide:
1. 2-3 most likely conditions (with probabilities)
2. Brief description of each condition
3. Specific medication names with dosages (e.g., "Paracetamol 500mg - 1-2 tablets every 4-6 hours")
4. When to seek immediate medical attention

IMPORTANT: This is for informational purposes only and should not replace professional medical advice. Medications should be taken only after consulting a healthcare professional.

Format your response as JSON with this structure:
{
  "conditions": [
    {
      "name": "condition name",
      "probability": 0.7,
      "description": "brief description",
      "medications": ["Paracetamol 500mg - 1-2 tablets every 4-6 hours (max 4g per day)", "Ibuprofen 400mg - 1 tablet every 6-8 hours"]
    }
  ],
  "confidence": 0.75,
  "analysis": "overall analysis",
  "warning": "when to seek immediate care"
}`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON from response
    let parsedResponse: any;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsedResponse = JSON.parse(jsonText);
    } catch (e) {
      // Fallback: parse suggestions from text
      parsedResponse = {
        conditions: [],
        confidence: 0.7,
        analysis: text,
        warning: 'Please consult a healthcare professional for accurate diagnosis.'
      };
    }

    // Helper function to filter out non-medication items and convert recommendations to medications
    const filterMedications = (items: string[]): string[] => {
      if (!items || !Array.isArray(items)) return [];
      
      const medicationKeywords = ['paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'naproxen', 'diclofenac', 
        'antibiotic', 'penicillin', 'amoxicillin', 'azithromycin', 'cephalexin', 'metronidazole', 'doxycycline',
        'tablet', 'capsule', 'mg', 'ml', 'dosage', 'dose', 'medicine', 'medication', 'drug', 'pill'];
      
      const genericAdviceKeywords = ['rest', 'hydrate', 'drink', 'sleep', 'consult', 'seek', 'contact', 'visit', 
        'advice', 'recommend', 'suggest', 'suggestion', 'plenty', 'fluids', 'water', 'allow', 'recover'];
      
      return items.filter(item => {
        if (!item || typeof item !== 'string') return false;
        
        const lowerItem = item.toLowerCase().trim();
        
        // Exclude empty items
        if (lowerItem.length === 0) return false;
        
        // Exclude if it's clearly generic advice (even if it has mg or tablet mentioned generically)
        const isGenericAdvice = genericAdviceKeywords.some(keyword => {
          const keywordIndex = lowerItem.indexOf(keyword);
          if (keywordIndex === -1) return false;
          // Check if it's standalone or part of generic advice phrase
          const beforeChar = lowerItem[keywordIndex - 1];
          const afterChar = lowerItem[keywordIndex + keyword.length];
          // If keyword appears as whole word (surrounded by spaces/punctuation or at start/end)
          return (!beforeChar || /[\s,.-]/.test(beforeChar)) && (!afterChar || /[\s,.-]/.test(afterChar));
        });
        
        if (isGenericAdvice) return false;
        
        // Include if it has actual medication keywords
        const hasMedicationKeyword = medicationKeywords.some(keyword => lowerItem.includes(keyword));
        
        // Include if it has dosage indicators (mg, ml) and medication context
        const hasDosage = (lowerItem.includes('mg') || lowerItem.includes('ml')) && 
                         (lowerItem.includes('tablet') || lowerItem.includes('capsule') || lowerItem.includes('dose') || lowerItem.includes('every'));
        
        return hasMedicationKeyword || hasDosage;
      });
    };

    const suggestions = (parsedResponse.conditions || []).map((condition: any) => {
      let medications: string[] = [];
      
      if (condition.medications && Array.isArray(condition.medications)) {
        medications = filterMedications(condition.medications);
      } else if (condition.recommendations && Array.isArray(condition.recommendations)) {
        medications = filterMedications(condition.recommendations);
      }
      
      // Check if we got mostly generic advice (if original array had items but filtered is empty or too small)
      const originalCount = condition.medications?.length || condition.recommendations?.length || 0;
      const filteredCount = medications.length;
      
      // If original had items but filtered is much smaller, likely all were generic - replace with defaults
      if (originalCount > 0 && filteredCount < originalCount * 0.5 && filteredCount < 2) {
        medications = [];
      }
      
      // If no valid medications found, provide default medication suggestions
      if (medications.length === 0) {
        // Provide condition-specific default medications
        const conditionName = (condition.name || '').toLowerCase();
        if (conditionName.includes('fever') || conditionName.includes('infection') || conditionName.includes('viral')) {
          medications = [
            'Paracetamol 500mg - 1-2 tablets every 4-6 hours (max 4g per day)',
            'Ibuprofen 400mg - 1 tablet every 6-8 hours (if no contraindications)',
            'Consult a healthcare professional for prescription medications if symptoms persist'
          ];
        } else if (conditionName.includes('bacterial')) {
          medications = [
            'Paracetamol 500mg - 1-2 tablets every 4-6 hours (max 4g per day)',
            'Consult a healthcare professional for antibiotic prescription',
            'Complete the full course of antibiotics if prescribed'
          ];
        } else {
          medications = [
            'Paracetamol 500mg - 1-2 tablets every 4-6 hours (max 4g per day)',
            'Ibuprofen 400mg - 1 tablet every 6-8 hours (if no contraindications)',
            'Consult a healthcare professional for prescription medications if symptoms persist'
          ];
        }
      }
      
      return {
        condition: condition.name || 'Unknown condition',
        probability: condition.probability || 0.5,
        description: condition.description || '',
        medications
      };
    });

    // If no conditions parsed, create a general suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        condition: 'Symptom analysis',
        probability: 0.6,
        description: parsedResponse.analysis || 'Based on your symptoms, further evaluation is recommended.',
        medications: [
          'Consult a healthcare professional for medication prescription',
          'Over-the-counter pain relief may help (consult pharmacist)',
          parsedResponse.warning || 'Seek immediate care if symptoms worsen'
        ]
      });
    }

    return {
      suggestions,
      confidence: parsedResponse.confidence || 0.7,
      analysis: parsedResponse.analysis || text || 'Analysis completed. Please consult a healthcare professional for accurate diagnosis.'
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini diagnosis failed: ${error.message}`);
  }
}

export async function analyzeImageWithGemini(
  request: ImageAnalysisRequest
): Promise<ImageAnalysisResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  let imageData: string;
  
  if (request.imageBase64) {
    imageData = request.imageBase64;
  } else if (request.imageUrl) {
    // For URL, we'd need to fetch it first, but for now support base64
    throw new Error('Please provide image as base64. URL support coming soon.');
  } else {
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
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON from response
    let parsedResponse: any;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsedResponse = JSON.parse(jsonText);
    } catch (e) {
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
  } catch (error: any) {
    console.error('Gemini Image API error:', error);
    throw new Error(`Gemini image analysis failed: ${error.message}`);
  }
}

