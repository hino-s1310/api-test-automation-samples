// フロント→API→DB統合テスト
import { test, expect } from '@playwright/test';

test.describe('フロント→API→DB統合テスト', () => {
  test('ファイル一覧画面に遷移したらAPIが正常に動作する', async ({ page }) => {
    // APIリクエストを監視
    const apiRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/files')) {
        apiRequests.push(request);
      }
    });

    // ページ読み込み
    await page.goto('http://localhost:3000');
    
    // ファイル一覧画面に遷移
    await page.getByRole('link', { name: 'ファイル一覧' }).click();
    
    // APIリクエストが送信されるまで待機
    await page.waitForLoadState('networkidle');

    // APIが呼び出されたことを確認
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // ファイル一覧が表示されることを確認
    const fileListElement = page.locator('table');
    await expect(fileListElement).toBeVisible();
  });
});