import type { DiagnosisRequest, DiagnosisResponse, ImageAnalysisRequest, ImageAnalysisResponse } from './types.js';
import { combineWithPastRecords } from './utils.js';
import { getDiagnosisFromGemini, analyzeImageWithGemini } from './gemini.js';
import { getDiagnosisFromGroq } from './groq.js';
import type { Block } from '../../blockchain/types.js';

/**
 * Main AI/ML service that orchestrates diagnosis
 * Uses Gemini (primary) or Groq (fast alternative)
 */
export class AIMLService {
  /**
   * Get diagnosis based on symptoms and optional patient history
   */
  async diagnose(
    request: DiagnosisRequest,
    pastRecords?: Block[]
  ): Promise<DiagnosisResponse> {
    try {
      let aiResponse: DiagnosisResponse;

      // Skip Gemini if model name is wrong, go directly to Groq
      // Try Groq first (more reliable)
      try {
        console.log('🤖 Attempting diagnosis with Groq...');
        aiResponse = await getDiagnosisFromGroq(request);
        console.log('✅ Using: Groq (Fast Inference)');
      } catch (groqError: any) {
        // Fallback to Gemini
        console.log('⚠️  Groq failed, trying Gemini...');
        try {
          aiResponse = await getDiagnosisFromGemini(request);
          console.log('✅ Using: Gemini (Google)');
        } catch (geminiError: any) {
          // Both APIs failed - provide mock response for testing
          console.log('⚠️  Both APIs failed, using mock response for testing...');
          aiResponse = this.getMockDiagnosisResponse(request);
          console.log('✅ Using: Mock Response (Testing Mode)');
        }
      }

      // Combine with past records if available
      if (pastRecords && pastRecords.length > 0) {
        return combineWithPastRecords(aiResponse, pastRecords);
      }

      return aiResponse;
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      throw error;
    }
  }

  /**
   * Analyze medical image (X-ray, CT scan, etc.)
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    try {
      // Use Gemini Vision for medical images
      console.log('🖼️  Analyzing image with Gemini Vision...');
      const result = await analyzeImageWithGemini(request);
      console.log('✅ Image analysis completed with: Gemini Vision');
      return result;
    } catch (error: any) {
      console.error('❌ Image analysis error:', error);
      console.log('⚠️  Gemini Vision failed, using mock response for testing...');
      return this.getMockImageAnalysisResponse(request);
    }
  }

  /**
   * Analyze symptoms with text description
   */
  async analyzeSymptomsText(symptoms: string[], description?: string): Promise<DiagnosisResponse> {
    const request: DiagnosisRequest = { symptoms };
    if (description) {
      request.description = description;
    }
    return await this.diagnose(request);
  }

  /**
   * Mock diagnosis response for testing when APIs are not available
   */
  private getMockDiagnosisResponse(request: DiagnosisRequest): DiagnosisResponse {
    const mockConditions = [
      'Common Cold',
      'Influenza',
      'Gastroenteritis',
      'Migraine',
      'Allergic Reaction',
      'Muscle Strain'
    ];

    const selectedCondition: string = mockConditions[Math.floor(Math.random() * mockConditions.length)]!;
    const description = `Based on symptoms: ${request.symptoms.join(', ')}${request.description ? '. ' + request.description : ''}`;

    return {
      suggestions: [{
        condition: selectedCondition,
        probability: 0.65 + Math.random() * 0.25, // 65-90% confidence
        description,
        medications: [
          'Paracetamol 500mg - 1-2 tablets every 4-6 hours (max 4g per day)',
          'Ibuprofen 400mg - 1 tablet every 6-8 hours (if no contraindications)',
          'Consult a healthcare professional for prescription medications if symptoms persist'
        ]
      }],
      confidence: 0.75,
      analysis: `MOCK RESPONSE: This is a simulated diagnosis for testing purposes. In a real scenario, this would be analyzed by AI models. Symptoms analyzed: ${request.symptoms.join(', ')}${request.description ? '. Description: ' + request.description : ''}. Please consult a medical professional for actual diagnosis.`
    };
  }

  /**
   * Mock image analysis response for testing when APIs are not available
   */
  private getMockImageAnalysisResponse(request: ImageAnalysisRequest): ImageAnalysisResponse {
    const mockConditions = [
      'Normal findings',
      'Mild inflammation',
      'Possible fracture',
      'Soft tissue swelling',
      'No acute abnormalities'
    ];

    const selectedDiagnosis = mockConditions[Math.floor(Math.random() * mockConditions.length)];

    return {
      diagnosis: selectedDiagnosis as string,
      conditions: [selectedDiagnosis as string],
      confidence: 0.70 + Math.random() * 0.25, // 70-95% confidence
      findings: [
        'Mock finding 1: Normal bone structure observed',
        'Mock finding 2: Soft tissues appear within normal limits',
        'Mock finding 3: No acute abnormalities detected'
      ],
      recommendations: [
        'Clinical correlation recommended',
        'Follow up as indicated by clinical symptoms',
        'Consider additional imaging if symptoms persist'
      ]
    };
  }
}

export const aiMLService = new AIMLService();

