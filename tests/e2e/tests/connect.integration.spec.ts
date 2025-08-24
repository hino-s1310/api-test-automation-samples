// フロントエンド統合テスト
import { test, expect } from '@playwright/test';
import { VALID_UPLOAD_DATA } from '../fixtures/test-data';
import { uploadPdfFile } from '../helpers/api-helpers';


// テスト用ヘルパー関数
async function setupMockData(page: any, data: any = VALID_UPLOAD_DATA) {
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


async function cleanupMockData(page: any) {
  try {
    await page.request.post('http://localhost:8000/test/reset-db');
  } catch (error) {
    console.log('データベースリセットエンドポイントが利用できません');
  }
}

test.describe('フロント→API→DB統合テスト', () => {
  // テストを直列実行して、データベースの状態を管理
  test.describe.configure({ mode: 'serial' });
  
  // 各テストの前後でクリーンアップ
  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });

  test('APIサーバーの状態を確認する', async ({ page }) => {
    // APIサーバーが動作しているか確認
    const healthResponse = await page.request.get('http://localhost:8000/health');
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    console.log('APIサーバーの状態:', healthData);
  });

  test('ファイル一覧画面に遷移したらAPIが正常に動作する', async ({ page }) => {
    // データベースをクリーンアップ
    await cleanupMockData(page);
    
    // モックデータを挿入
    await setupMockData(page);

    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/files')) {
        apiResponses.push(response);
      }
    });

    // ページ読み込み
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    console.log(page.url());
    
    // ファイル一覧画面に遷移
    await page.getByRole('link', { name: 'ファイル一覧' }).click();
    await page.waitForURL('/files');
    
    // APIレスポンスが返ってくるまで明示的に待機
    await page.waitForResponse(response => response.url().includes('/files'));

    // ページ読み込み完了を待機
    await page.waitForLoadState('domcontentloaded');

    // APIが呼び出されたことを確認
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status()).toBe(200);
    
    // ファイル一覧の表示を確認（データが読み込まれるまで待機）
    const fileListElement = page.locator('table');
    
    // データが表示されるまで待機（タイムアウトを延長）
    await expect(fileListElement).toBeVisible();
    
    // テーブルの行が表示されるまで待機
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
    
    // ファイル名が表示されることを確認
    await expect(page.locator('text=test.pdf')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});