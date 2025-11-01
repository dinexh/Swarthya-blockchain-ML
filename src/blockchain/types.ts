export type BlockData = {
  fileId: string;
  filename: string;
  fileHash: string;
  timestamp: number;
  patientId: string;
  labels: string[];
  tags: string[];
  metadata?: {
    recordType?: string;
    doctorName?: string;
    clinicName?: string;
    dateOfVisit?: string;
    description?: string;
    [key: string]: any; // Allow additional metadata fields
  };
};

export type Block = {
  index: number;
  timestamp: number;
  data: BlockData;
  prevHash: string;
  hash: string;
};

export type BlockSearchFilters = {
  patientId?: string;
  labels?: string[];
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  recordType?: string;
};

