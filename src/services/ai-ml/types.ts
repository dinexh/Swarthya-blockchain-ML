export type DiagnosisRequest = {
  symptoms: string[];
  patientId?: string;
  imageUrl?: string;
  imageBase64?: string;
  description?: string;
};

export type DiagnosisResponse = {
  suggestions: DiagnosisSuggestion[];
  pastRecords?: BlockWithAnalysis[];
  confidence: number;
  analysis: string;
};

export type DiagnosisSuggestion = {
  condition: string;
  probability: number;
  description?: string;
  recommendations?: string[];
  medications?: string[];
};

export type BlockWithAnalysis = {
  block: any;
  relevance: number;
  relevanceReason: string;
};

export type ImageAnalysisRequest = {
  imageUrl?: string;
  imageBase64?: string;
  patientId?: string;
};

export type ImageAnalysisResponse = {
  diagnosis: string;
  conditions: string[];
  confidence: number;
  findings: string[];
  recommendations?: string[];
};

