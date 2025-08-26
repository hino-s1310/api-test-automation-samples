// フロントエンド統合テスト
import { test, expect } from '@playwright/test';

test.describe('UIサーバーとAPIサーバーのヘルスチェックテスト', () => {
  // テストを直列実行して、データベースの状態を管理
  test.describe.configure({ mode: 'serial' });
  
  test('APIサーバーの状態を確認する', async ({ page }) => {
    // APIサーバーが動作しているか確認
    const healthResponse = await page.request.get('http://localhost:8000/health');
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    console.log('APIサーバーの状態:', healthData);
  });

  test('UIサーバーの状態を確認する', async ({ page }) => {
    console.log('=== UIサーバーの状態確認 ===');
    
    // UIサーバーにアクセス
    console.log('1. UIサーバーにアクセス開始...');
    await page.goto('http://localhost:3000/');
    
    // 現在の状態を確認
    console.log('2. 現在のURL:', page.url());
    console.log('3. ページタイトル:', await page.title());
    
    // ページの内容を確認
    console.log('4. ページの内容を確認...');
    const pageContent = await page.content();
    console.log('HTML長さ:', pageContent.length);
    console.log('HTMLの最初の1000文字:', pageContent.substring(0, 1000));
    
    // 期待される要素の存在を確認
    console.log('5. 期待される要素の存在を確認...');
    
    // Directory Listingが表示されているかチェック
    const isDirectoryListing = await page.locator('text=Directory Listing For').isVisible();
    if (isDirectoryListing) {
      console.log('⚠️ Directory Listingが表示されています - ビルドに問題があります');
      
      // ディレクトリ一覧の内容を確認
      const directoryItems = page.locator('a');
      const count = await directoryItems.count();
      console.log(`ディレクトリ内のアイテム数: ${count}`);
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const item = directoryItems.nth(i);
        const text = await item.textContent();
        const href = await item.getAttribute('href');
        console.log(`アイテム ${i}: ${text} (${href})`);
      }
      
      // スクリーンショットを撮影
      await page.screenshot({ path: 'debug-directory-listing.png', fullPage: true });
      
      throw new Error('UIサーバーがDirectory Listingを表示しています。ビルドに問題があります。');
    }
    
    // 期待される要素の確認
    const expectedElements = [
      'text=PDF Converter',
      'text=ファイル一覧',
      'text=アップロード'
    ];
    
    for (const selector of expectedElements) {
      try {
        const element = page.locator(selector);
        const isVisible = await element.isVisible();
        console.log(`要素 "${selector}": ${isVisible ? '表示' : '非表示'}`);
      } catch (error) {
        console.log(`要素 "${selector}": エラー - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('=== UIサーバーの状態確認完了 ===');
  });
});