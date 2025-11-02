import type { DiagnosisRequest, DiagnosisResponse } from './types.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Groq API integration for fast medical diagnosis
 * Get free API key from: https://console.groq.com/keys
 * Groq is super fast and has free tier!
 */
export async function getDiagnosisFromGroq(
  request: DiagnosisRequest
): Promise<DiagnosisResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Get a free key from https://console.groq.com/keys');
  }

  const symptomText = request.symptoms.join(', ');
  const description = request.description || '';
  
  const prompt = `You are a medical assistant AI. Based on the following symptoms, provide a preliminary medical analysis.

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
1. 2-3 most likely conditions (with probabilities 0-1)
2. Brief description of each condition
3. Specific medication names with dosages (e.g., "Paracetamol 500mg - 1-2 tablets every 4-6 hours")
4. When to seek immediate medical attention

IMPORTANT: This is for informational purposes only and should not replace professional medical advice. Medications should be taken only after consulting a healthcare professional.

Respond ONLY with valid JSON in this exact format:
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
            content: 'You are a medical assistant. You MUST return ONLY actual medication names with specific dosages in the medications field. DO NOT include generic health advice like "rest", "stay hydrated", "drink fluids" - only pharmaceutical drugs with dosages (e.g., "Paracetamol 500mg", "Ibuprofen 400mg"). Always respond with valid JSON only, no markdown or code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual responses
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
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      // Fallback if JSON parsing fails
      parsedResponse = {
        conditions: [],
        confidence: 0.6,
        analysis: content,
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
      analysis: parsedResponse.analysis || content || 'Analysis completed. Please consult a healthcare professional for accurate diagnosis.'
    };
  } catch (error: any) {
    console.error('Groq API error:', error);
    throw new Error(`Groq diagnosis failed: ${error.message}`);
  }
}

