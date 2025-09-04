import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData, getFileId, waitForPdfConversion } from '../helpers/api-helpers';
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
    // ファイルをアップロードしてPDF変換完了を待機
    const uploadResponse = await page.request.post('http://localhost:8000/files/upload', {
      multipart: {
        file: {
          name: FILE_NAME,
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF')
        }
      }
    });

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    // PDF変換が完了するまで待機
    await waitForPdfConversion(page.request, fileId, 30);

    // ページオブジェクトを初期化
    const uploadPage = new UploadPage(page);
    const filesListPage = new FilesListPage(page);

    // ページ読み込み
    await uploadPage.goto('http://localhost:3000/upload');
    await uploadPage.waitForPageLoad('domcontentloaded');

    // ファイル一覧画面に遷移
    await uploadPage.clickSideMenu('ファイル一覧 変換済みファイル管理');
    await filesListPage.waitForPageUrl('http://localhost:3000/files/');

    // ファイルが一覧に表示されていることを確認
    await expect(filesListPage.getFilesNameLocator(FILE_NAME)).toBeVisible();

    // APIリクエストを監視
    const apiResponses: any[] = [];

    page.on('response', response => {
      if (response.url().includes(`/files/${fileId}`) && response.request().method() === 'DELETE') {
        apiResponses.push(response);
      }
    });

    // UI操作でファイルを削除
    await filesListPage.clickDeleteButton(FILE_NAME);

    // 削除確認ダイアログが表示される場合は確認ボタンをクリック
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });

    // ファイル削除APIのレスポンスを待機（タイムアウトを30秒に設定）
    const response = await filesListPage.waitForResponse(`/files/${fileId}`, { timeout: 30000 });

    // APIが呼び出されたことを確認
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.message).toBe('ファイルが正常に削除されました');

    // 削除後の確認（少し待機してから確認）
    await page.waitForTimeout(1000);
    await expect(filesListPage.getFilesNameLocator(FILE_NAME)).not.toBeVisible();

    // 削除されたファイルでAPIアクセスすると404エラーになることを確認
    const getFileResponse = await page.request.get(`http://localhost:8000/files/${fileId}`);
    expect(getFileResponse.status()).toBe(404);
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});
