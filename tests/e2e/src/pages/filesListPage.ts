// アップロード画面
import { Page, Locator } from '@playwright/test';
import { BasePage } from './basePage';
import { FileDetailModal } from './components/fileDetailModal';

export class FilesListPage extends BasePage {

  private filesTable: Locator;
  private filesName: Locator;
  private fileDetailModal: FileDetailModal;
  private deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.filesTable = page.getByTestId('files-card');
    this.filesName = page.getByTestId(/filename/);
    this.fileDetailModal = new FileDetailModal(page);
    this.deleteButton = page.locator('td');
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

  // ファイル詳細モーダルを閉じる
  async clickFileDetailModalCloseButton() {
    await this.fileDetailModal.clickCloseButton();
  }

  // ファイル削除ボタンをクリック
  async clickDeleteButton(fileName: string) {
    // ダイアログが表示されたら確認ボタンをクリック
    this.page.on('dialog', (dialog) => {
      dialog.accept();
    });

    // ファイル削除ボタンをクリック
    await this.deleteButton.filter({ has: this.page.getByRole('button', { name: `${fileName}を削除` }) }).click();
  }
}
