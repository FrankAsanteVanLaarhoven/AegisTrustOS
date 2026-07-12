export type StoredObject = {
  key: string;
  contentType: string;
  bytes: number;
  /** Absolute or relative path / s3 uri depending on adapter */
  uri: string;
  encrypted: boolean;
};

export interface ObjectStorage {
  put(input: {
    key: string;
    data: Buffer;
    contentType: string;
    encrypt?: boolean;
  }): Promise<StoredObject>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
