import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData } from '../helpers/api-helpers';
import { UploadPage } from '../src/pages/uploadPage';
import { FilesListPage } from '../src/pages/filesListPage';


test.describe('ファイル一覧APIの統合テスト', () => {
  // テストを直列実行して、データベースの状態を管理
  test.describe.configure({ mode: 'serial' });
  
  // 各テストの前後でクリーンアップ
  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });

  test('ファイル一覧画面に遷移したらAPIが正常に動作する', async ({ page }) => {
    // モックデータを挿入
    await setupMockData(page);

    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/files')) {
        apiResponses.push(response);
      }
    });

    // ページオブジェクトを初期化
    const uploadPage = new UploadPage(page);
    const filesListPage = new FilesListPage(page);

    // ページ読み込み
    await uploadPage.goto('http://localhost:3000/upload');
    await uploadPage.waitForPageLoad('domcontentloaded');

    // ファイル一覧画面に遷移
    await uploadPage.clickSideMenu('ファイル一覧 変換済みファイル管理');
    await filesListPage.waitForPageUrl('http://localhost:3000/files/');
    
    // APIレスポンスが返ってくるまで明示的に待機
    await filesListPage.waitForResponse('/files');

    // ページ読み込み完了を待機
    await filesListPage.waitForPageLoad('domcontentloaded');

    // APIが呼び出されたことを確認
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status()).toBe(200);
    
    // ファイル一覧の表示を確認（データが読み込まれるまで待機）
    const fileListTable = filesListPage.getFilesTable();
    await expect(fileListTable).toBeVisible();
    // テーブルの行が表示されるまで待機
    const filesNameLocator = filesListPage.getFilesNameLocator('test.pdf');
    await expect(filesNameLocator).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});