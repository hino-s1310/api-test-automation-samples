import { test, expect } from '@playwright/test';
import { assertSuccessResponse } from '../helpers/api-helpers';

test.describe('ヘルスチェックテスト', () => {
  test.beforeEach(async ({ request }) => {
    // 各テスト前にデータベースをリセット
    await request.post('/test/reset-db');
  });

  test('ヘルスチェックAPIが正常に動作することを確認する', async ({ request }) => {
    const response = await request.get('/health')
    await assertSuccessResponse(response, 200)
    const responseBody = await response.json()
    expect(responseBody.status).toEqual('healthy')
    expect(responseBody.version).toEqual('1.0.0')
    expect(responseBody.uptime).toBeGreaterThan(0)
  })
  
});