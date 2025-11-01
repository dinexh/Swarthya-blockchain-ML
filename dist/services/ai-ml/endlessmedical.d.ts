import type { DiagnosisRequest, DiagnosisResponse } from './types.js';
/**
 * EndlessMedical API integration for medical diagnosis
 * Note: You may need to sign up and get API key from endlessmedical.com
 */
export declare function getDiagnosisFromEndlessMedical(request: DiagnosisRequest): Promise<DiagnosisResponse | null>;
/**
 * Combine multiple AI sources for better accuracy
 */
export declare function getCombinedDiagnosis(request: DiagnosisRequest, useEndlessMedical?: boolean): Promise<DiagnosisResponse>;
//# sourceMappingURL=endlessmedical.d.ts.map