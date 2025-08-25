// コンポーネントの規定クラス
import { Locator, Page } from '@playwright/test';
import { BaseComponents } from './baseComponents';

export class fileDetailModal extends BaseComponents {

  private fileName: Locator;
  private fileId: Locator;
  private fileCharAmount: Locator;
  private fileCreatedAt: Locator;
  private fileUpdatedAt: Locator;
  private uploadButton: Locator;
  private downloadButton: Locator;
  private copyButton: Locator;
  private closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.fileName = page.getByTestId('file-filename');
    this.fileId = page.getByTestId('modal-file-id');
    this.fileCharAmount = page.getByTestId('modal-file-char-amount');
    this.fileCreatedAt = page.getByTestId('file-created-at');
    this.fileUpdatedAt = page.getByTestId('file-updated-at');
    this.uploadButton = page.getByTestId('update-file-button');
    this.downloadButton = page.getByTestId('download-button');
    this.copyButton = page.getByTestId('copy-button');
    this.closeButton = page.getByTestId('modal-close-button');
  }

  // ファイル名を取得
  getFileName() {
    return this.fileName;
  }

  // ファイルIDを取得
  getFileId() {
    return this.fileId;
  }

  // ファイル文字数を取得
  getFileCharAmount() {
    return this.fileCharAmount;
  }

  // ファイル作成日時を取得
  getFileCreatedAt() {
    return this.fileCreatedAt;
  }

  // ファイル更新日時を取得
  getFileUpdatedAt() {
    return this.fileUpdatedAt;
  }

  // ファイル更新ボタンを押下
  async clickUpdateFileButton() {
    await this.uploadButton.click();
  }

  // ダウンロードボタンを押下
  async clickDownloadButton() {
    await this.downloadButton.click();
  }

  // コピーボタンを押下
  async clickCopyButton() {
    await this.copyButton.click();
  }

  // 閉じるボタンを押下
  async clickCloseButton() {
    await this.closeButton.click();
  }


  
}