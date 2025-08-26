import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData, getFileId } from '../helpers/api-helpers';
import { UploadPage } from '../src/pages/uploadPage';
import { FilesListPage } from '../src/pages/filesListPage';
import { VALID_UPLOAD_DATA } from '../fixtures/test-data';

const FILE_NAME = VALID_UPLOAD_DATA.filename;

test.describe('ファイル削除の統合テスト', () => {

  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
  
  test('ファイル削除したらAPIが正常に動作する', async ({ page }) => {
    // モックデータを挿入し、ファイルIDを取得
    await setupMockData(page);
    const fileId = await getFileId(page, FILE_NAME);

    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
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

    // ファイルを削除
    await filesListPage.clickDeleteButton(FILE_NAME);

    // ファイル削除APIのレスポンスを待機
    const response = await filesListPage.waitForResponse(`/files/${fileId}`);

    // APIが呼び出されたことを確認
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.message).toBe('ファイルが正常に削除されました');

    // 削除後の確認を追加
    await expect(filesListPage.getFilesNameLocator(FILE_NAME)).not.toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});