import axios from 'axios';
import { FileInfo, FileListResponse, UploadResponse } from '@/types';

// APIクライアントの作成
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// APIクライアントをエクスポート（テスト用）
export { apiClient };

export const api = {
  // PDFファイルアップロード
  async uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post<UploadResponse>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // ファイル更新
  async updateFile(id: string, file: File): Promise<FileInfo> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.put<FileInfo>(`/files/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // 保存済みファイル一覧取得
  async getFileList(page: number = 1, perPage: number = 10): Promise<FileListResponse> {
    const response = await apiClient.get<FileListResponse>('/files', {
      params: {
        page,
        per_page: perPage,
      },
    });
    return response.data;
  },

  // 個別ファイル取得
  async getFile(id: string): Promise<FileInfo> {
    try {
      const response = await apiClient.get<FileInfo>(`/files/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // ファイル削除
  async deleteFile(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/files/${id}`);
    return response.data;
  },

  // ファイル検索
  async searchFiles(params: {
    query?: string;
    status?: string;
    is_edited?: boolean | null;
    page: number;
    per_page: number;
  }): Promise<FileListResponse> {
    try {
      const response = await apiClient.post<FileListResponse>('/files/search', params);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // ファイル編集
  async editFile(id: string, data: {
    filename?: string;
    markdown_content?: string;
    edit_reason: string;
    edited_by?: string;
  }): Promise<FileInfo> {
    try {
      const response = await apiClient.put<FileInfo>(`/files/${id}/edit`, data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // 一括削除
  async batchDeleteFiles(fileIds: string[]): Promise<{
    message: string;
    deleted_count: number;
    failed_count: number;
    failed_files: string[];
  }> {
    try {
      // FastAPIのQueryパラメータで複数の値を送信する場合の正しい形式
      const params = new URLSearchParams();
      fileIds.forEach(id => params.append('file_ids', id));

      const response = await apiClient.delete(`/files/batch-delete?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },

  // ファイル編集履歴取得
  async getFileEditHistory(fileId: string): Promise<{
    history: Array<{
      id: number;
      file_id: string;
      original_filename: string;
      original_content: string;
      edited_filename: string;
      edited_content: string;
      edit_reason: string;
      edited_by: string;
      created_at: string;
    }>;
  }> {
    try {
      const response = await apiClient.get(`/files/${fileId}/history`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  },
};
