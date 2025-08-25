// アップロード画面
import { Page, Locator } from '@playwright/test';
import { BasePage } from './basePage';
import { fileDetailModal } from './components/fileDetailModal';

export class FilesListPage extends BasePage {

  private filesTable: Locator;
  private filesName: Locator;
  private fileDetailModal: fileDetailModal;

  constructor(page: Page) {
    super(page);
    this.filesTable = page.getByTestId('files-card');
    this.filesName = page.getByTestId(/filename/);
    this.fileDetailModal = new fileDetailModal(page);
  }

  // ファイル一覧のテーブルを取得
  getFilesTable() {
    return this.filesTable;
  }

  // ファイル名のロケータを取得
  getFilesNameLocator(fileName: string) {
    return this.filesName.filter({ hasText: fileName });
  }

  // ファイル詳細モーダルを開く
  async clickFileName(fileName: string) {
    await this.filesName.filter({ hasText: fileName }).click();
  }

  // ファイル詳細モーダルのファイル名を取得
  getFileDetailModalFileName() {
    return this.fileDetailModal.getFileName();
  }
}