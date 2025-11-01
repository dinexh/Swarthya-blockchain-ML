import type { DiagnosisResponse, ImageAnalysisRequest, ImageAnalysisResponse } from './types.js';
export declare function analyzeSymptoms(symptoms: string[]): Promise<DiagnosisResponse>;
export declare function analyzeMedicalImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse>;
export declare function combineWithPastRecords(aiResponse: DiagnosisResponse, pastRecords: any[]): DiagnosisResponse;
//# sourceMappingURL=huggingface.d.ts.map