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

export async function setupMockData(page: any, data: any = VALID_UPLOAD_DATA) {
  try {
    console.log('APIサーバーの状態を確認中...');

    // まずAPIサーバーの状態を確認
    const healthResponse = await page.request.get('http://localhost:8000/health');
    if (healthResponse.status() !== 200) {
      throw new Error(`APIサーバーが正常に動作していません。ステータス: ${healthResponse.status()}`);
    }

    console.log('APIサーバーが正常に動作しています');
    console.log('ファイルアップロードを開始します...');

    const response = await uploadPdfFile(page.request, data);
    console.log('アップロードレスポンス:', response.status(), response.statusText());

    if (response.status() === 200) {
      // レスポンスの内容を詳細にログ出力
      const responseBody = await response.json();
      console.log('APIレスポンスの詳細:', JSON.stringify(responseBody, null, 2));

      // より柔軟な検証：idまたはfilenameのいずれかが存在すればOK
      if (!responseBody.id && !responseBody.filename) {
        console.warn('APIレスポンスにidまたはfilenameが含まれていません');
        console.log('レスポンスの構造:', Object.keys(responseBody));

        // レスポンスが空でない場合は成功として扱う
        if (Object.keys(responseBody).length > 0) {
          console.log('レスポンスが空でないため、成功として扱います');
          return true;
        }

        throw new Error('APIレスポンスが空です');
      }

      console.log('ファイルのアップロードに成功しました');
      if (responseBody.id) {
        console.log('アップロードされたファイルID:', responseBody.id);
      }
      if (responseBody.filename) {
        console.log('アップロードされたファイル名:', responseBody.filename);
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log('ファイルのアップロードに失敗しました:', response.status(), errorText);
      throw new Error(`アップロードAPIが失敗しました: ${response.status()} - ${errorText}`);
    }
  } catch (error) {
    console.error('setupMockDataでエラーが発生しました:', error);
    // エラーを再スローしてテストを失敗させる
    throw error;
  }
}


export async function cleanupMockData(page: any) {
  try {
    console.log('データベースリセットを開始します...');

    // APIサーバーの状態を確認
    const healthResponse = await page.request.get('http://localhost:8000/health');
    if (healthResponse.status() !== 200) {
      console.warn('APIサーバーが動作していないため、データベースリセットをスキップします');
      return;
    }

    const response = await page.request.post('http://localhost:8000/test/reset-db');
    if (response.status() === 200) {
      console.log('データベースリセットが完了しました');
    } else {
      console.warn(`データベースリセットが失敗しました。ステータス: ${response.status()}`);
    }
  } catch (error) {
    console.error('データベースリセットでエラーが発生しました:', error);
    // テストを失敗させずに警告のみ出力
    console.warn('データベースリセットエンドポイントが利用できません');
  }
}

/**
 * ファイルIDを取得するヘルパー関数
 */
export async function getFileId(page: any, fileName: string) {
  try {
    console.log(`ファイルIDを取得中: ${fileName}`);

    const response = await getFilesList(page.request);
    if (response.status() !== 200) {
      throw new Error(`ファイル一覧APIが失敗しました: ${response.status()}`);
    }

    const responseBody = await response.json();
    if (!responseBody.files || !Array.isArray(responseBody.files)) {
      throw new Error('ファイル一覧APIのレスポンス形式が不正です');
    }

    const file = responseBody.files.find((file: any) => file.filename === fileName);
    if (!file) {
      throw new Error(`ファイル "${fileName}" が見つかりません`);
    }

    console.log(`ファイルID取得成功: ${file.id}`);
    return file.id;
  } catch (error) {
    console.error('getFileIdでエラーが発生しました:', error);
    throw error;
  }
}
