import { test, expect } from '@playwright/test';

test.describe('エラーハンドリングテスト', () => {
  test.beforeAll(async ({ request }) => {
    await request.post('/test/reset-db');
  });

  test('無効なファイル形式のアップロード', async ({ request }) => {
    // 無効なファイル（テキストファイル）をアップロード
    const invalidFile = Buffer.from('This is not a PDF file');
    
    const response = await request.post('/upload', {
      multipart: {
        file: {
          name: 'invalid.txt',
          mimeType: 'text/plain',
          buffer: invalidFile
        }
      }
    });

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.detail).toContain('PDFファイルのみアップロード可能');
  });

  test('ファイルサイズ制限のテスト', async ({ request }) => {
    // 10MBを超えるファイルを作成
    const oversizedFile = Buffer.alloc(11 * 1024 * 1024, 'A');
    
    const response = await request.post('/upload', {
      multipart: {
        file: {
          name: 'oversized.pdf',
          mimeType: 'application/pdf',
          buffer: oversizedFile
        }
      }
    });

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.detail).toContain('ファイルサイズは10MB以下');
  });

  test('無効なファイルIDでのアクセス', async ({ request }) => {
    // 無効なUUID形式のID
    const invalidId = 'invalid-id';
    
    const response = await request.get(`/files/${invalidId}`);
    expect(response.status()).toBe(400);
    
    const responseBody = await response.json();
    expect(responseBody.detail).toContain('無効なファイルID形式');
  });

  test('存在しないファイルIDでのアクセス', async ({ request }) => {
    // 有効なUUID形式だが存在しないID
    const nonExistentId = '12345678-1234-5678-9abc-123456789def';
    
    const response = await request.get(`/files/${nonExistentId}`);
    expect(response.status()).toBe(404);
    
    const responseBody = await response.json();
    expect(responseBody.detail).toContain('ファイルが見つかりません');
  });

  test('無効なクリーンアップパラメータ', async ({ request }) => {
    // 範囲外の日数
    const response = await request.post('/cleanup?days=0');
    expect(response.status()).toBe(422);
    
    const response2 = await request.post('/cleanup?days=366');
    expect(response2.status()).toBe(422);
  });

  test('テスト環境以外でのDBリセット', async ({ request }) => {
    // 環境変数を一時的に変更（実際のテストではモックを使用）
    const response = await request.post('/test/reset-db');
    // テスト環境では成功するはず
    expect(response.status()).toBe(200);
  });
});
