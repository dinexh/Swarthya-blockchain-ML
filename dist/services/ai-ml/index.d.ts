import type { DiagnosisRequest, DiagnosisResponse, ImageAnalysisRequest, ImageAnalysisResponse } from './types.js';
import type { Block } from '../../blockchain/types.js';
/**
 * Main AI/ML service that orchestrates diagnosis
 * Uses Gemini (primary) or Groq (fast alternative)
 */
export declare class AIMLService {
    /**
     * Get diagnosis based on symptoms and optional patient history
     */
    diagnose(request: DiagnosisRequest, pastRecords?: Block[]): Promise<DiagnosisResponse>;
    /**
     * Analyze medical image (X-ray, CT scan, etc.)
     */
    analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse>;
    /**
     * Analyze symptoms with text description
     */
    analyzeSymptomsText(symptoms: string[], description?: string): Promise<DiagnosisResponse>;
}
export declare const aiMLService: AIMLService;
//# sourceMappingURL=index.d.ts.map