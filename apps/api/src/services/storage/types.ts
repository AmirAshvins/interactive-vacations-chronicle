export interface PresignedPut {
  uploadUrl: string;
  expiresAt: Date;
}

export interface StorageAdapter {
  mode: 'r2' | 'local';
  getPresignedPutUrl(storageKey: string, mimeType: string, sizeBytes: number): Promise<PresignedPut>;
  headObject(storageKey: string): Promise<boolean>;
  deleteObject(storageKey: string): Promise<void>;
  getPublicUrl(storageKey: string): string;
}
