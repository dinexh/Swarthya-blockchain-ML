import type { DiagnosisResponse } from './types.js';

/**
 * Helper to combine AI suggestions with past records
 */
export function combineWithPastRecords(
  aiResponse: DiagnosisResponse,
  pastRecords: any[]
): DiagnosisResponse {
  // Analyze past records for relevance
  const relevantRecords = pastRecords.slice(0, 5).map((record, index) => ({
    block: record,
    relevance: 0.8 - (index * 0.1), // Decreasing relevance
    relevanceReason: 'Historical record may be relevant'
  }));

  return {
    ...aiResponse,
    pastRecords: relevantRecords,
    analysis: `${aiResponse.analysis}\n\nAlso found ${pastRecords.length} relevant past records that may be related.`
  };
}

