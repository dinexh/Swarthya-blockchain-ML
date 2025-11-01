import type { DiagnosisRequest, DiagnosisResponse, ImageAnalysisRequest, ImageAnalysisResponse } from './types.js';
/**
 * Google Gemini API integration for medical diagnosis
 * Get free API key from: https://aistudio.google.com/app/apikey
 */
export declare function getDiagnosisFromGemini(request: DiagnosisRequest): Promise<DiagnosisResponse>;
export declare function analyzeImageWithGemini(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse>;
//# sourceMappingURL=gemini.d.ts.map