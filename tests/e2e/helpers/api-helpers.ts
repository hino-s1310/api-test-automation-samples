/**
 * APIテスト用のヘルパー関数
 * 共通的なテスト処理を再利用可能な形で提供
 */

import { APIRequestContext, expect } from '@playwright/test';
import { UploadTestData, API_ENDPOINTS, VALID_UPLOAD_DATA } from '../fixtures/test-data';

/**
 * テスト用のPDFファイルを作成（最小限のPDFヘッダー）
 */
function createTestPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF');
}

/**
 * PDFアップロードAPIを呼び出すヘルパー関数
 */
export async function uploadPdfFile(
  request: APIRequestContext,
  testData: UploadTestData
) {
  const pdfContent = createTestPdfBuffer();
  
  return await request.post(API_ENDPOINTS.upload, {
    multipart: {
      file: {
        name: testData.filename,
        mimeType: 'application/pdf',
        buffer: pdfContent
      }
    }
  });
}

/**
 * ファイル一覧取得APIを呼び出すヘルパー関数
 */
export async function getFilesList(request: APIRequestContext) {
  return await request.get(API_ENDPOINTS.files);
}

/**
 * 特定ファイルの詳細取得APIを呼び出すヘルパー関数
 */
export async function getFileDetail(request: APIRequestContext, fileId: string) {
  return await request.get(API_ENDPOINTS.fileDetail(fileId));
}

/**
 * 特定ファイルの変換ログ取得APIを呼び出すヘルパー関数
 */
export async function getFileLogs(request: APIRequestContext, fileId: string) {
  return await request.get(API_ENDPOINTS.fileLogs(fileId));
}

/**
 * ファイルの統計情報取得APIを呼び出すヘルパー関数
 */
export async function getFileStatistics(request: APIRequestContext) {
  return await request.get(API_ENDPOINTS.statistics);
}

/**
 * ファイルを再生成するAPIを呼び出すヘルパー関数
 */
export async function reconvertFile(request: APIRequestContext, fileId: string) {
  const pdfContent = createTestPdfBuffer();
  
  return await request.put(API_ENDPOINTS.fileDetail(fileId), {
    multipart: {
      file: {
        name: 'updated-test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfContent
      }
    }
  });
}

/**
 * ファイルを削除するAPIを呼び出すヘルパー関数
 */
export async function deleteFile(request: APIRequestContext, fileId: string) {
  return await request.delete(API_ENDPOINTS.fileDetail(fileId));
}

/**
 * レスポンスのステータスコードとメッセージを検証するヘルパー関数
 */
export async function assertSuccessResponse(
  response: any,
  expectedStatus: number,
  expectedMessage?: string
) {
  expect(response.status()).toBe(expectedStatus);
  
  const responseBody = await response.json();
  if (expectedMessage) {
    expect(responseBody.message).toBe(expectedMessage);
  }
  
  return responseBody;
}

/**
 * エラーレスポンスのステータスコードを検証するヘルパー関数
 */
export function assertErrorResponse(response: any, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
}

// テスト用ヘルパー関数
export async function setupMockData(page: any, data: any = VALID_UPLOAD_DATA) {
  try {
    console.log('ファイルアップロードを開始します...');
    
    const response = await uploadPdfFile(page.request, data);
    console.log('アップロードレスポンス:', response.status(), response.statusText());
    
    if (response.status() === 200) {
      console.log('ファイルのアップロードに成功しました');
      return true;
    } else {
      const errorText = await response.text();
      console.log('ファイルのアップロードに失敗しました:', response.status(), errorText);
      return false;
    }
  } catch (error) {
    console.log('ファイルのアップロードでエラーが発生しました:', error);
    return false;
  }
}


export async function cleanupMockData(page: any) {
  try {
    await page.request.post('http://localhost:8000/test/reset-db');
  } catch (error) {
    console.log('データベースリセットエンドポイントが利用できません');
  }
}
