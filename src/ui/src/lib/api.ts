import axios from 'axios';
import { FileInfo, FileListResponse, UploadResponse } from '@/types';

// APIクライアントの作成
const apiClient = axios.create({
  baseURL: '/api',
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

  // ファイル削除
  async deleteFile(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/files/${id}`);
    return response.data;
  },
};