// フロント→API→DB統合テスト
import { test, expect } from '@playwright/test';

test.describe('フロント→API→DB統合テスト', () => {
  test('ファイル一覧画面に遷移したらAPIが正常に動作する', async ({ page }) => {
    // APIリクエストを監視
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/files')) {
        apiResponses.push(response);
      }
    });

    // ページ読み込み
    await page.goto('http://localhost:3000');
    
    // ファイル一覧画面に遷移
    await page.getByRole('link', { name: 'ファイル一覧' }).click();
    
    // APIレスポンスが返ってくるまで明示的に待機
    await page.waitForResponse(response => response.url().includes('/api/files'));
    // さらにネットワークが安定するまで待機
    await page.waitForLoadState('networkidle');
    // ページ読み込み完了を待機
    await page.waitForLoadState('domcontentloaded');

    // APIが呼び出されたことを確認
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status()).toBe(200);
    
    // ファイル一覧が表示されることを確認
    const fileListElement = page.locator('table');
    await expect(fileListElement).toBeVisible();
  });
});