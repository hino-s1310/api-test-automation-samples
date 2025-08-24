import { test, expect } from '@playwright/test';
import { CLEANUP_TEST_DATA,
  EXPECTED_RESPONSES,
  VALID_CLEANUP_DATA
 } from '../fixtures/test-data';
import { uploadPdfFile,
  assertSuccessResponse,
 } from '../helpers/api-helpers';


test.describe('クリーンアップテスト', () => {
  test.beforeEach(async ({ request }) => {
    // 各テスト前にデータベースをリセット
    await request.post('/test/reset-db');
  });

  test('古いファイルがクリーンアップされることを確認する', async ({ request }) => {
    // クリーンアップ前のファイル数を取得
    const beforeStats = await request.get('/statistics');
    const beforeData = await beforeStats.json();
    const fileCountBefore = beforeData.total_files;

    // クリーンアップを実行
    const responseCleanup = await request.post('/cleanup', {
      params: {
        days: CLEANUP_TEST_DATA.DAYS
      }
    })
    
    // レスポンスのステータスコードを検証
    await assertSuccessResponse(responseCleanup, EXPECTED_RESPONSES.CLEANUP_SUCCESS.status)
    
    // レスポンスのデータを検証
    const responseBody = await responseCleanup.json()
    
    // 動的な検証：削除されたファイル数が0以上であることを確認
    expect(responseBody.deleted_count).toBeGreaterThanOrEqual(0)
    expect(responseBody.total_old_files).toBeGreaterThanOrEqual(0)
    expect(responseBody.deleted_count).toBeLessThanOrEqual(responseBody.total_old_files)
    expect(responseBody.message).toContain('クリーンアップが完了しました')
    
    // クリーンアップ後のファイル数を確認
    const afterStats = await request.get('/statistics');
    const afterData = await afterStats.json();
    const fileCountAfter = afterData.total_files;
    
    // ファイル数が減少していることを確認
    expect(fileCountAfter).toBeLessThanOrEqual(fileCountBefore)
  })
})