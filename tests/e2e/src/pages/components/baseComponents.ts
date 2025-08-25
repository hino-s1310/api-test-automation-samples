// コンポーネントの規定クラス
import { Page } from '@playwright/test';

export class BaseComponents {
  constructor(private page: Page) {
    this.page = page;
  }
}