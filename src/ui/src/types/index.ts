export interface UploadResponse {
  markdown: string;
  id: string;
  message?: string;
}

export interface FileInfo {
  id: string;
  markdown: string;
  created_at: string;
  updated_at?: string;
}

export interface FileListResponse {
  files: Array<{
    id: string;
    created_at: string;
  }>;
}

export interface ApiError {
  detail: string;
  message?: string;
}

export interface UploadState {
  isLoading: boolean;
  error: string | null;
  result: UploadResponse | null;
}
