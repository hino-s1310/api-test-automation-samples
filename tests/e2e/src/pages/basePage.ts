// POMの基底クラス
import { Page, Response } from '@playwright/test';
import { sideMenu, sideMenuName } from './components/sideMenu';

export class BasePage {
  protected sideMenu: sideMenu;

  constructor(protected page: Page) {
    this.page = page;
    this.sideMenu = new sideMenu(page);
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async clickSideMenu(menuName: sideMenuName) {
    await this.sideMenu.clickSideMenu(menuName);
  }

  // ページURLを取得
  async getPageUrl() {
    return await this.page.url();
  }

  // ページが完全に読み込まれるまで待機
  async waitForPageLoad(state: 'domcontentloaded' | 'load' | 'networkidle'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  async waitForPageUrl(url: string) {
    await this.page.waitForURL(url);
  }

  // APIレスポンスが返ってくるまで明示的に待機
  async waitForResponse(apiUrl: string, options?: { 
    waitForSuccess?: boolean; 
    timeout?: number; 
  }): Promise<Response> {
    const { waitForSuccess = false, timeout = 30000 } = options || {};
    
    if (waitForSuccess) {
      // リダイレクト完了を明示的に待機（最終的な200レスポンスまで）
      return await this.page.waitForResponse(response => 
        response.url().includes(apiUrl) && response.status() === 200
      , { timeout });
    } else {
      // 従来の動作（最初のレスポンスを待機）
      return await this.page.waitForResponse(response => 
        response.url().includes(apiUrl)
      , { timeout });
    }
  }
}