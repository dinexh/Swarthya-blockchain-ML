export type BlockData = {
  fileId: string;
  filename: string;
  fileHash: string;
  timestamp: number;
};

export type Block = {
  index: number;
  timestamp: number;
  data: BlockData;
  prevHash: string;
  hash: string;
};

