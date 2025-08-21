import { api, apiClient } from '@/lib/api'
import axios from 'axios'

// axiosのモックを作成
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  defaults: {
    headers: {
      common: {},
    },
  },
}))

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadPdf', () => {
    it('PDFファイルをアップロードする', async () => {
      const mockResponse = {
        data: {
          id: '123',
          filename: 'test.pdf',
          markdown: '# Test',
          created_at: '2024-03-20T13:00:00Z'
        }
      }
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse)

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const result = await api.uploadPdf(file)

      expect(result).toEqual(mockResponse.data)
      expect(apiClient.post).toHaveBeenCalledWith('/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    })
  })

  describe('getFileList', () => {
    it('ファイル一覧を取得する', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: '123',
              filename: 'test.pdf',
              markdown: '# Test',
              created_at: '2024-03-20T13:00:00Z'
            }
          ],
          total: 1,
          page: 1,
          per_page: 10
        }
      }
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await api.getFileList(1, 10)

      expect(result).toEqual(mockResponse.data)
      expect(apiClient.get).toHaveBeenCalledWith('/files', {
        params: { page: 1, per_page: 10 }
      })
    })
  })

  describe('deleteFile', () => {
    it('ファイルを削除する', async () => {
      const mockResponse = {
        data: { message: 'File deleted successfully' }
      }
      ;(apiClient.delete as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await api.deleteFile('123')

      expect(result).toEqual(mockResponse.data)
      expect(apiClient.delete).toHaveBeenCalledWith('/files/123')
    })
  })

  describe('updateFile', () => {
    it('ファイルを更新する', async () => {
      const mockResponse = {
        data: {
          id: '123',
          filename: 'updated.pdf',
          markdown: '# Updated',
          created_at: '2024-03-20T13:00:00Z',
          updated_at: '2024-03-20T14:00:00Z'
        }
      }
      ;(apiClient.put as jest.Mock).mockResolvedValueOnce(mockResponse)

      const file = new File(['test'], 'updated.pdf', { type: 'application/pdf' })
      const result = await api.updateFile('123', file)

      expect(result).toEqual(mockResponse.data)
      expect(apiClient.put).toHaveBeenCalledWith('/files/123', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    })
  })

  describe('error handling', () => {
    it('APIエラーを適切に処理する', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Invalid file type'
          },
          status: 400
        }
      }
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(errorResponse)

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await expect(api.uploadPdf(file)).rejects.toThrow('Invalid file type')
    })
  })
})