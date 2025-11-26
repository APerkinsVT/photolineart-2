export interface BlobUploadRequestBody {
  contentType: string;
  sizeBytes?: number;
  filename?: string;
}

export interface BlobUploadResponse {
  uploadUrl: string;
  pathname: string;
  token: string;
  expiresAt: string;
}

export interface AiLineArtRequestBody {
  imageUrl: string;
  options?: {
    prompt?: string;
    style?: 'clean' | 'sketch';
    lineThickness?: 'thin' | 'medium' | 'bold';
    outputSize?: 'original' | 'medium' | 'small';
    setSize?: number;
  };
}
