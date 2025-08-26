import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData, getFileId } from '../helpers/api-helpers';
import { UploadPage } from '../src/pages/uploadPage';
import { FilesListPage } from '../src/pages/filesListPage';
import { VALID_UPLOAD_DATA } from '../fixtures/test-data';

const FILE_NAME = VALID_UPLOAD_DATA.filename;

test.describe('ファイル詳細APIの統合テスト', () => {
  // テストを直列実行して、データベースの状態を管理
  test.describe.configure({ mode: 'serial' });
  
  // 各テストの前後でクリーンアップ
  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });

  test('ファイル詳細モーダルを開いたらAPIが正常に動作する', async ({ page }) => {
    // モックデータを挿入し、ファイルIDを取得
    await setupMockData(page);
    const fileId = await getFileId(page, FILE_NAME);

    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      // ファイル詳細APIのレスポンスを監視（/files/{id}の形式）
      if (response.url().includes(`/files/${fileId}`)) {
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

    // ファイル詳細モーダルを開く
    await filesListPage.clickFileName(FILE_NAME);

    // ファイル詳細APIのレスポンスを待機
    await page.waitForResponse(response => 
      response.url().includes(`/files/${fileId}`) && 
      !response.url().includes('?page=') && 
      response.status() === 200
    , { timeout: 30000 });

    // ページ読み込み完了を待機
    await filesListPage.waitForPageLoad('domcontentloaded');
    
    // APIが呼び出されたことを確認
    expect(apiResponses.length).toBeGreaterThan(0);
    
    // ファイル詳細APIのレスポンスを確認
    const fileDetailApiResponse = apiResponses.find(response => 
      response.url().includes(`/files/${fileId}`)
    );
    
    if (fileDetailApiResponse) {
      expect(fileDetailApiResponse.status()).toBe(200);
    } else {
      throw new Error('ファイル詳細APIのレスポンスが見つかりません');
    }
    
    // ファイル詳細モーダルのファイル名の確認
    const fileName = filesListPage.getFileDetailModalFileName();
    await expect(fileName).toBeVisible();
    await expect(fileName).toContainText(FILE_NAME);
    
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});