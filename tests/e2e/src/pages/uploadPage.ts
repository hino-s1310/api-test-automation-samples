// アップロード画面
import { Page, Locator } from '@playwright/test';
import { BasePage } from './basePage';

export class UploadPage extends BasePage {

  private fileInput: Locator;
  private uploadButton: Locator;
  private uploadSuccess: Locator;
  private fileId: Locator;


  constructor(page: Page) {
    super(page);
    this.fileInput = page.getByTestId('file-input');
    this.uploadButton = page.getByTestId('select-file-button');
    this.uploadSuccess = page.getByTestId('success-message').filter({ has: page.locator('p')});
    this.fileId = page.getByTestId('file-id');
  }

  // ファイルをアップロード
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  // アップロードボタンをクリック
  async clickUploadButton() {
    await this.uploadButton.click();
  }

  // アップロード成功のテキストを取得
  getUploadSuccess() {
    return this.uploadSuccess;
  }

  // ファイルIDを取得
  getFileId() {
    return this.fileId;
  }
  
}