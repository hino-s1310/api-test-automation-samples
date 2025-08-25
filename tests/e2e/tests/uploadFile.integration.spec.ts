import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData } from '../helpers/api-helpers';
import { UploadPage } from '../src/pages/uploadPage';
import { join } from 'path';

test.describe('ファイルアップロードの統合テスト', () => {

  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
  
  test('ファイルアップロードしたらAPIが正常に動作する', async ({ page }) => {
    // モックデータを挿入
    await setupMockData(page);

    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/upload')) {
        apiResponses.push(response);
      }
    });

    // ページオブジェクトを初期化
    const uploadPage = new UploadPage(page);

    // ページ読み込み
    await uploadPage.goto('http://localhost:3000/upload');
    await uploadPage.waitForPageLoad('domcontentloaded');

    // ファイルアップロード
    const filePath = join(__dirname, '../../data/test_markdown.pdf');
    await uploadPage.uploadFile(filePath);

    // リダイレクト完了を明示的に待機（最終的な200レスポンスまで）
    const finalResponse = await uploadPage.waitForResponse('/upload', { 
      waitForSuccess: true, 
      timeout: 30000 
    });

    // アップロード成功メッセージが表示されることを確認
    await expect(uploadPage.getUploadSuccess()).toBeVisible();

    // APIが呼び出されたことを確認（リダイレクト完了後）
    expect(apiResponses.length).toBeGreaterThan(0);
    
    // 最終的なレスポンスが200であることを確認
    expect(finalResponse.status()).toBe(200);
    
    // 正しいAPIレスポンス（localhost:8000/upload）を選択
    const apiResponse = apiResponses.find(response => 
      response.url().includes('localhost:8000/upload')
    );
    
    if (!apiResponse) {
      throw new Error('APIレスポンス（localhost:8000/upload）が見つかりません');
    }
    
    // APIレスポンスからfile_idを取得
    let fileIdAPI: string;
    try {
      const responseBody = await apiResponse.json();
      fileIdAPI = responseBody.id;
    } catch (error) {
      throw new Error('APIレスポンスの解析に失敗しました');
    }
    
    // file_idが存在することを確認
    expect(fileIdAPI).toBeDefined();
    expect(typeof fileIdAPI).toBe('string');
    
    // ファイルIDを検証
    const fileIdUI = uploadPage.getFileId();
    
    // file-id要素が表示されるまで待機
    await expect(fileIdUI).toBeVisible({ timeout: 10000 });
    
    // ファイルIDのテキストが表示されるまで待機
    await expect(fileIdUI).toContainText(fileIdAPI, { timeout: 10000 });
    
    // 詳細な比較
    const uiFileIdText = await fileIdUI;
    expect(uiFileIdText).toContainText(fileIdAPI);
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});