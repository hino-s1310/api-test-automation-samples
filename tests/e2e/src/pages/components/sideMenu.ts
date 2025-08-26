// コンポーネントの規定クラス
import { Locator, Page } from '@playwright/test';
import { BaseComponents } from './baseComponents';

export type sideMenuName = 'ファイル一覧 変換済みファイル管理' | 'アップロード PDFをMarkdownに変換';

export class sideMenu extends BaseComponents {

  private fileList: Locator;
  private uploadPdf: Locator;

  constructor(page: Page) {
    super(page);
    this.fileList = page.getByRole('link', { name: 'ファイル一覧 変換済みファイル管理' });
    this.uploadPdf = page.getByRole('link', { name: 'アップロード PDFをMarkdownに変換' });
  }

  // サイドメニューをクリック
  async clickSideMenu(menuName: sideMenuName) {
    switch (menuName) {
      case 'ファイル一覧 変換済みファイル管理':
        await this.fileList.click();
        break;
      case 'アップロード PDFをMarkdownに変換':
        await this.uploadPdf.click();
        break;
      default:
        throw new Error(`${menuName}はサイドメニューに存在しません`);
    }
  }
}