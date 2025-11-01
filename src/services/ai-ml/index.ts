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
      
      // Try Gemini first (best medical reasoning)
      try {
        console.log('🤖 Attempting diagnosis with Gemini...');
        aiResponse = await getDiagnosisFromGemini(request);
        console.log('✅ Using: Gemini (Google)');
      } catch (geminiError: any) {
        // Fallback to Groq (errors are expected if Gemini is misconfigured)
        console.log('⚠️  Gemini failed, trying Groq...');
        try {
          aiResponse = await getDiagnosisFromGroq(request);
          console.log('✅ Using: Groq (Fast Inference)');
        } catch (groqError: any) {
          // Both APIs failed - provide helpful error
          console.error('❌ Both Gemini and Groq failed');
          throw new Error(
            `Both Gemini and Groq APIs failed. ` +
            `Please ensure at least one API key is configured (GEMINI_API_KEY or GROQ_API_KEY). ` +
            `Gemini error: ${geminiError.message}. Groq error: ${groqError.message}`
          );
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
      throw new Error(
        `Image analysis failed: ${error.message}. ` +
        `Please ensure GEMINI_API_KEY is configured for medical image analysis.`
      );
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
}

export const aiMLService = new AIMLService();

