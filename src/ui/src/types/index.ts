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
  processing_time?: number | null;
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

// 編集履歴関連の型定義
export interface FileEditHistory {
  id: number;
  file_id: string;
  original_filename: string;
  original_content: string;
  edited_filename: string;
  edited_content: string;
  edit_reason: string;
  edited_by: string;
  created_at: string;
}

export interface FileEditHistoryResponse {
  history: FileEditHistory[];
  total_count: number;
}

// 差分表示関連の型定義
export interface DiffResult {
  original: string;
  modified: string;
  diff: string;
  hasChanges: boolean;
}

// 一括操作関連の型定義
export interface BatchOperationRequest {
  file_ids: string[];
  operation: 'edit' | 'delete';
  data?: {
    filename?: string;
    content?: string;
    reason?: string;
  };
}

export interface BatchOperationResponse {
  success: boolean;
  message: string;
  results: {
    file_id: string;
    success: boolean;
    error?: string;
  }[];
}

// AI テスト生成関連の型定義
export interface TestGenerationOptions {
  test_framework: 'pytest' | 'jest' | 'playwright';
  language: 'python' | 'typescript';
  test_type: 'unit' | 'integration' | 'e2e';
  max_tests: number;
  include_edge_cases: boolean;
}

export interface GeneratedTestMetadata {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  generation_time: number;
}

export interface GeneratedTestResponse {
  id: number;
  file_id: string;
  generated_tests: string;
  test_count: number;
  test_framework: string;
  language: string;
  test_type: string;
  metadata: GeneratedTestMetadata;
  created_at: string;
}

export interface GeneratedTestSummary {
  id: number;
  test_framework: string;
  language: string;
  test_type: string;
  test_count: number;
  created_at: string;
}

export interface GeneratedTestListResponse {
  tests: GeneratedTestSummary[];
  total_count: number;
}

// 赤セルシート機能の型定義をエクスポート
export * from './redaction';
