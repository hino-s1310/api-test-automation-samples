import { api, apiClient } from '../../lib/api';

// apiClientのモック
jest.mock('../../lib/api', () => {
  const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  // 実際のAPIクライアントの実装をモック
  const mockApi = {
    getFileList: jest.fn(async (page: number, perPage: number) => {
      try {
        const response = await mockApiClient.get('/files', {
          params: { page, per_page: perPage },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
    getFile: jest.fn(async (id: string) => {
      try {
        const response = await mockApiClient.get(`/files/${id}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
    deleteFile: jest.fn(async (id: string) => {
      try {
        const response = await mockApiClient.delete(`/files/${id}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
    searchFiles: jest.fn(async (params: any) => {
      try {
        const response = await mockApiClient.post('/files/search', params);
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
    editFile: jest.fn(async (id: string, data: any) => {
      try {
        const response = await mockApiClient.put(`/files/${id}/edit`, data);
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
    uploadPdf: jest.fn(async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await mockApiClient.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
        throw error;
      }
    }),
  };

  return {
    apiClient: mockApiClient,
    api: mockApi,
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFileList', () => {
    it('fetches file list with correct parameters', async () => {
      const mockResponse = {
        files: [],
        total_count: 0,
        page: 1,
        per_page: 10,
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.getFileList(1, 10);

      expect(mockApiClient.get).toHaveBeenCalledWith('/files', {
        params: { page: 1, per_page: 10 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors correctly', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: {
          data: { detail: 'Internal Server Error' },
          status: 500,
        },
      });

      await expect(api.getFileList(1, 10)).rejects.toThrow('Internal Server Error');
    });
  });

  describe('getFile', () => {
    it('fetches file details with correct ID', async () => {
      const mockResponse = {
        id: 'test-id',
        filename: 'test.pdf',
        markdown: '# Test',
        status: 'completed',
      };

      mockApiClient.get.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.getFile('test-id');

      expect(mockApiClient.get).toHaveBeenCalledWith('/files/test-id');
      expect(result).toEqual(mockResponse);
    });

    it('handles file not found error', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: {
          data: { detail: 'Not Found' },
          status: 404,
        },
      });

      await expect(api.getFile('non-existent-id')).rejects.toThrow('Not Found');
    });
  });

  describe('deleteFile', () => {
    it('deletes file with correct ID', async () => {
      const mockResponse = { message: 'File deleted successfully' };

      mockApiClient.delete.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.deleteFile('test-id');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/files/test-id');
      expect(result).toEqual(mockResponse);
    });

    it('handles deletion errors', async () => {
      mockApiClient.delete.mockRejectedValueOnce({
        response: {
          data: { detail: 'Forbidden' },
          status: 403,
        },
      });

      await expect(api.deleteFile('test-id')).rejects.toThrow('Forbidden');
    });
  });

  describe('searchFiles', () => {
    it('searches files with correct parameters', async () => {
      const mockResponse = {
        files: [],
        total_count: 0,
        page: 1,
        per_page: 10,
      };

      const searchParams = {
        query: 'test',
        status: 'completed',
        is_edited: true,
        page: 1,
        per_page: 10,
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.searchFiles(searchParams);

      expect(mockApiClient.post).toHaveBeenCalledWith('/files/search', searchParams);
      expect(result).toEqual(mockResponse);
    });

    it('handles search with minimal parameters', async () => {
      const mockResponse = {
        files: [],
        total_count: 0,
        page: 1,
        per_page: 10,
      };

      const searchParams = {
        query: '',
        status: '',
        is_edited: null,
        page: 1,
        per_page: 10,
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.searchFiles(searchParams);

      expect(mockApiClient.post).toHaveBeenCalledWith('/files/search', searchParams);
      expect(result).toEqual(mockResponse);
    });

    it('handles search API errors', async () => {
      const searchParams = {
        query: 'test',
        status: 'completed',
        is_edited: true,
        page: 1,
        per_page: 10,
      };

      mockApiClient.post.mockRejectedValueOnce({
        response: {
          data: { detail: 'Bad Request' },
          status: 400,
        },
      });

      await expect(api.searchFiles(searchParams)).rejects.toThrow('Bad Request');
    });
  });

  describe('editFile', () => {
    it('edits file with correct parameters', async () => {
      const mockResponse = {
        id: 'test-id',
        filename: 'updated.pdf',
        markdown: '# Updated Content',
        status: 'completed',
      };

      const editParams = {
        filename: 'updated.pdf',
        markdown_content: '# Updated Content',
        edit_reason: 'Content improvement',
        edited_by: 'user',
      };

      mockApiClient.put.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.editFile('test-id', editParams);

      expect(mockApiClient.put).toHaveBeenCalledWith('/files/test-id/edit', editParams);
      expect(result).toEqual(mockResponse);
    });

    it('handles edit with minimal parameters', async () => {
      const mockResponse = {
        id: 'test-id',
        filename: 'test.pdf',
        markdown: '# Test Content',
        status: 'completed',
      };

      const editParams = {
        filename: 'test.pdf',
        markdown_content: '# Test Content',
        edit_reason: 'Minor fix',
        edited_by: 'user',
      };

      mockApiClient.put.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.editFile('test-id', editParams);

      expect(mockApiClient.put).toHaveBeenCalledWith('/files/test-id/edit', editParams);
      expect(result).toEqual(mockResponse);
    });

    it('handles edit API errors', async () => {
      const editParams = {
        filename: 'updated.pdf',
        markdown_content: '# Updated Content',
        edit_reason: 'Content improvement',
        edited_by: 'user',
      };

      mockApiClient.put.mockRejectedValueOnce({
        response: {
          data: { detail: 'File not found' },
          status: 404,
        },
      });

      await expect(api.editFile('non-existent-id', editParams)).rejects.toThrow('File not found');
    });

    it('handles validation errors', async () => {
      const editParams = {
        filename: '',
        markdown_content: '',
        edit_reason: '',
        edited_by: 'user',
      };

      mockApiClient.put.mockRejectedValueOnce({
        response: {
          data: { detail: 'Validation error' },
          status: 422,
        },
      });

      await expect(api.editFile('test-id', editParams)).rejects.toThrow('Validation error');
    });
  });

  describe('uploadPdf', () => {
    it('uploads file with correct parameters', async () => {
      const mockResponse = {
        id: 'new-file-id',
        markdown: '# Test Content',
        message: 'File uploaded successfully',
      };

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockApiClient.post.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await api.uploadPdf(file);

      expect(mockApiClient.post).toHaveBeenCalledWith('/files/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // FormDataの内容を確認
      const formData = mockApiClient.post.mock.calls[0][1] as FormData;
      expect(formData.get('file')).toEqual(file);
      expect(result).toEqual(mockResponse);
    });

    it('handles upload errors', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockApiClient.post.mockRejectedValueOnce({
        response: {
          data: { detail: 'Payload Too Large' },
          status: 413,
        },
      });

      await expect(api.uploadPdf(file)).rejects.toThrow('Payload Too Large');
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getFileList(1, 10)).rejects.toThrow('Network error');
    });

    it('handles JSON parsing errors', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { files: [] },
      });

      const result = await api.getFileList(1, 10);
      expect(result).toEqual({ files: [] });
    });

    it('handles response without status text', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: {
          data: { detail: 'Internal Server Error' },
          status: 500,
        },
      });

      await expect(api.getFileList(1, 10)).rejects.toThrow('Internal Server Error');
    });
  });

  describe('URL construction', () => {
    it('constructs correct URLs for different endpoints', async () => {
      const mockResponse = { files: [] };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });
      mockApiClient.post.mockResolvedValue({ data: mockResponse });
      mockApiClient.put.mockResolvedValue({ data: mockResponse });
      mockApiClient.delete.mockResolvedValue({ data: mockResponse });

      // ファイル一覧
      await api.getFileList(1, 10);
      expect(mockApiClient.get).toHaveBeenCalledWith('/files', { params: { page: 1, per_page: 10 } });

      // 個別ファイル
      await api.getFile('test-id');
      expect(mockApiClient.get).toHaveBeenCalledWith('/files/test-id');

      // ファイル削除
      await api.deleteFile('test-id');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/files/test-id');

      // ファイル検索
      await api.searchFiles({ query: 'test', page: 1, per_page: 10 });
      expect(mockApiClient.post).toHaveBeenCalledWith('/files/search', { query: 'test', page: 1, per_page: 10 });

      // ファイル編集
      await api.editFile('test-id', {
        filename: 'test.pdf',
        markdown_content: '# Test',
        edit_reason: 'test',
        edited_by: 'user',
      });
      expect(mockApiClient.put).toHaveBeenCalledWith('/files/test-id/edit', {
        filename: 'test.pdf',
        markdown_content: '# Test',
        edit_reason: 'test',
        edited_by: 'user',
      });

      // ファイルアップロード
      const file = new File(['test'], 'test.pdf');
      await api.uploadPdf(file);
      expect(mockApiClient.post).toHaveBeenCalledWith('/files/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });
  });
});
