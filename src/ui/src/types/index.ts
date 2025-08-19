export interface UploadResponse {
  markdown: string;
  id: string;
  message?: string;
}

export interface FileInfo {
  id: string;
  filename?: string;
  markdown: string;
  created_at: string;
  updated_at?: string;
}

export interface FileListItem {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  file_size: number;
  processing_time?: number;
}

export interface FileListResponse {
  files: FileListItem[];
  total_count: number;
  page: number;
  per_page: number;
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
