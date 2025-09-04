import { test, expect } from '@playwright/test';
import { cleanupMockData, setupMockData, getFileId, reconvertFile } from '../helpers/api-helpers';
import { UploadPage } from '../src/pages/uploadPage';
import { FilesListPage } from '../src/pages/filesListPage';
import { VALID_UPLOAD_DATA, VALID_UPDATE_DATA } from '../fixtures/test-data';

const FILE_NAME = VALID_UPLOAD_DATA.filename;
const UPDATE_FILE_NAME = VALID_UPDATE_DATA.filename;

test.describe('ファイル再生成APIの統合テスト', () => {
  // テストを直列実行して、データベースの状態を管理
  test.describe.configure({ mode: 'serial' });

  // 各テストの前後でクリーンアップ
  test.beforeEach(async ({ page }) => {
    // テスト開始前にデータベースをクリーンアップ
    await cleanupMockData(page);
  });

  test('ファイル再生成APIの統合テスト', async ({ page }) => {
    // モックデータを挿入し、ファイルIDを取得
    await setupMockData(page);
    const fileId = await getFileId(page, FILE_NAME);

    // ページオブジェクトを初期化
    const uploadPage = new UploadPage(page);
    const filesListPage = new FilesListPage(page);

    // ページ読み込み
    await uploadPage.goto('http://localhost:3000/upload');
    await uploadPage.waitForPageLoad('domcontentloaded');

    // ファイル一覧画面に遷移
    await uploadPage.clickSideMenu('ファイル一覧 変換済みファイル管理');
    await filesListPage.waitForPageUrl('http://localhost:3000/files/');

    // 更新前のファイル詳細モーダルを開いてファイル名を確認
    await filesListPage.clickFileName(FILE_NAME);

    // 更新前のファイル名を確認
    const originalFileName = filesListPage.getFileDetailModalFileName();
    await expect(originalFileName).toBeVisible();
    await expect(originalFileName).toContainText(FILE_NAME);

    // モーダルを閉じる
    await filesListPage.clickFileDetailModalCloseButton();

    // ファイル再生成APIを実行（PDFファイルの再変換）
    const updateResponse = await reconvertFile(page.request, fileId);

    // 更新APIのレスポンスを確認
    expect(updateResponse.status()).toBe(200);

    // 更新後のレスポンス内容を確認
    const updateResponseBody = await updateResponse.json();

    // ファイルIDが同じであることを確認
    expect(updateResponseBody.id).toBe(fileId);

    // ファイル名は変更されないことを確認（再生成APIではファイル名は保持される）
    expect(updateResponseBody.filename).toBe(FILE_NAME);

    // 再生成後のMarkdown内容が存在することを確認
    expect(updateResponseBody.markdown).toBeDefined();
    expect(updateResponseBody.markdown).toContain('PDF変換結果');

    // ステータスが完了状態であることを確認
    expect(updateResponseBody.status).toBe('completed');

    // ページを再読み込みして最新の状態を取得
    await filesListPage.reload();
    await filesListPage.waitForPageLoad('domcontentloaded');

    // 元のファイル名でファイル詳細モーダルを開く（再生成後もファイル名は同じ）
    await filesListPage.clickFileName(FILE_NAME);

    // ファイル詳細モーダルのファイル名を確認（再生成後もファイル名は同じ）
    const updatedFileName = filesListPage.getFileDetailModalFileName();
    await expect(updatedFileName).toBeVisible();
    await expect(updatedFileName).toContainText(FILE_NAME);

    // ファイル名が再生成後も同じであることを確認
    const actualFileName = await updatedFileName.textContent();
    expect(actualFileName).toContain(FILE_NAME);

    // 再生成APIではファイル名は変更されないことを確認
    expect(actualFileName).toBe(FILE_NAME);
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にデータベースをクリーンアップ
    await cleanupMockData(page);
  });
});
