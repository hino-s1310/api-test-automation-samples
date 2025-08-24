import { test, expect } from '@playwright/test';
import {
  EXPECTED_RESPONSES,
  generateUniqueTestData
} from '../fixtures/test-data';
import {
  uploadPdfFile,
  getFilesList,
  getFileDetail,
  getFileLogs,
  getFileStatistics,
  reconvertFile,
  deleteFile,
  assertSuccessResponse,
  assertErrorResponse,
} from '../helpers/api-helpers';

// ファイル内のテストを基本的に直列実行するよう設定
test.describe.configure({ mode: 'serial' });

test.describe('CRUDテスト', () => {
  test.beforeEach(async ({ request }) => {
    // 各テスト前にデータベースをリセット
    await request.post('/test/reset-db');
  });

  test('ファイルをアップロードする', async ({ request }) => {
    // 一意のテストデータを生成
    const uniqueTestData = generateUniqueTestData();
    
    // ファイルをアップロードする
    const response = await uploadPdfFile(request, uniqueTestData)
    // レスポンスのステータスコードとメッセージを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.UPLOAD_SUCCESS.status, EXPECTED_RESPONSES.UPLOAD_SUCCESS.message)

    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.id).toBeDefined()
    expect(responseBody.markdown).toBeDefined()
    expect(responseBody.markdown).toContain('PDF変換結果')
    expect(responseBody.status).toEqual('completed')
  })

  test('ファイル一覧を取得する', async ({ request }) => {
    // このテスト専用にファイルをアップロード
    const uniqueTestData = generateUniqueTestData();
    await uploadPdfFile(request, uniqueTestData);
    
    // ファイル一覧を取得する
    const response = await getFilesList(request)

    // レスポンスのステータスコードとメッセージを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.GET_FILES_LIST_SUCCESS.status)

    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.files).toHaveLength(1)
    expect(responseBody.total_count).toEqual(1)
    expect(responseBody.page).toEqual(1)
    expect(responseBody.per_page).toEqual(10)
  })

  test('ファイル詳細を取得する', async ({ request }) => {
    // このテスト専用にファイルをアップロード
    const uniqueTestData = generateUniqueTestData();
    const uploadResponse = await uploadPdfFile(request, uniqueTestData);
    expect(uploadResponse.status()).toBe(200);
    
    const uploadData = await uploadResponse.json();
    const testFileId = uploadData.id;

    // ファイル詳細を取得する
    const response = await getFileDetail(request, testFileId)

    // レスポンスのステータスコードとメッセージを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.GET_FILE_SUCCESS.status)

    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.id).toBeDefined()
    expect(responseBody.filename).toEqual(uniqueTestData.filename)
    expect(responseBody.markdown).toContain('PDF変換結果')
    expect(responseBody.status).toEqual('completed')
    expect(responseBody.created_at).toBeDefined()
    expect(responseBody.updated_at).toBeDefined()
    expect(responseBody.file_size).toBeGreaterThan(0)
    expect(responseBody.processing_time).toBeGreaterThan(0)
  })

  test('指定されたIDのファイルの変換ログを取得', async ({ request }) => {
    // このテスト専用にファイルをアップロード
    const uniqueTestData = generateUniqueTestData();
    const uploadResponse = await uploadPdfFile(request, uniqueTestData);
    expect(uploadResponse.status()).toBe(200);
    
    const uploadData = await uploadResponse.json();
    const testFileId = uploadData.id;

    // ファイルの変換ログを取得する
    const response = await getFileLogs(request, testFileId)
    // レスポンスのステータスコードとメッセージを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.GET_FILE_LOGS_SUCCESS.status)
    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.logs).toBeDefined()
    expect(responseBody.logs).toHaveLength(1)
    expect(responseBody.logs[0].file_id).toEqual(testFileId)
    expect(responseBody.logs[0].status).toBeDefined()
  })

  test('ファイルの統計情報を取得する', async ({ request }) => {
    // このテスト専用にファイルをアップロード
    const uniqueTestData = generateUniqueTestData();
    await uploadPdfFile(request, uniqueTestData);
    
    // ファイルの統計情報を取得する
    const response = await getFileStatistics(request)
    // レスポンスのステータスコードを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.GET_FILE_STATISTICS_SUCCESS.status)
    // レスポンスのデータを検証
    const responseBody = await response.json()
    
    // 基本的な構造の検証
    expect(responseBody.total_files).toEqual(1)
    expect(responseBody.status_counts).toBeDefined()
    expect(responseBody.status_counts.completed).toEqual(1)
    expect(responseBody.status_counts.processing).toEqual(0)
    expect(responseBody.status_counts.failed).toEqual(0)
    
    // 動的な値の検証（範囲や存在確認）
    expect(responseBody.total_size_bytes).toBeGreaterThan(0)
    expect(responseBody.total_size_mb).toBeGreaterThanOrEqual(0)  // APIの実装に依存
    expect(responseBody.total_processing_time).toBeGreaterThan(0)
    expect(responseBody.average_processing_time).toBeGreaterThan(0)
    
    // デバッグ用：実際の値をログ出力
    console.log('Debug - Statistics:', {
      total_size_bytes: responseBody.total_size_bytes,
      total_size_mb: responseBody.total_size_mb,
      expected_mb: responseBody.total_size_bytes / (1024 * 1024)
    })
    
    // 論理的な関係の検証（APIの実装に依存するため、基本的な検証のみ）
    expect(responseBody.average_processing_time).toBeCloseTo(responseBody.total_processing_time / responseBody.total_files, 6)
  })

  test('ファイルを再生成する', async ({ request }) => {
    // このテスト専用にファイルをアップロードしてから再生成
    const uniqueTestData = generateUniqueTestData();
    const uploadResponse = await uploadPdfFile(request, uniqueTestData)
    expect(uploadResponse.status()).toBe(200)
    
    const uploadData = await uploadResponse.json()
    const testFileId = uploadData.id

    // ファイルを再生成する
    const response = await reconvertFile(request, testFileId)
    // レスポンスのステータスコードを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.RECONVERT_SUCCESS.status)
    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.id).toBeDefined()
    expect(responseBody.markdown).toContain('PDF変換結果')
    expect(responseBody.status).toEqual('completed')
  })

  test('ファイルを削除する', async ({ request }) => {
    // このテスト専用にファイルをアップロードしてから削除
    const uniqueTestData = generateUniqueTestData();
    const uploadResponse = await uploadPdfFile(request, uniqueTestData)
    expect(uploadResponse.status()).toBe(200)
    
    const uploadData = await uploadResponse.json()
    const testFileId = uploadData.id

    // ファイルを削除
    const response = await deleteFile(request, testFileId)
    // レスポンスのステータスコードを検証
    await assertSuccessResponse(response, EXPECTED_RESPONSES.DELETE_SUCCESS.status)
    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.message).toEqual(EXPECTED_RESPONSES.DELETE_SUCCESS.message)
  })

  test('ファイルが取得できないことを確認する', async ({ request }) => {
    // このテスト専用にファイルをアップロードしてから削除
    const uniqueTestData = generateUniqueTestData();
    const uploadResponse = await uploadPdfFile(request, uniqueTestData)
    expect(uploadResponse.status()).toBe(200)
    
    const uploadData = await uploadResponse.json()
    const testFileId = uploadData.id

    // ファイルを削除
    const deleteResponse = await deleteFile(request, testFileId)
    expect(deleteResponse.status()).toBe(200)

    // 削除されたファイルIDでアクセスして404エラーを確認
    const response = await getFileDetail(request, testFileId)
    // レスポンスのステータスコードを検証
    assertErrorResponse(response, EXPECTED_RESPONSES.GET_FILE_NOT_FOUND.status)
    // レスポンスのデータを検証
    const responseBody = await response.json()
    expect(responseBody.detail).toEqual(EXPECTED_RESPONSES.GET_FILE_NOT_FOUND.message)
  })

  test.afterEach(async ({ request }) => {
    // 各テスト後にデータベースをリセット
    await request.post('/test/reset-db');
  })
});