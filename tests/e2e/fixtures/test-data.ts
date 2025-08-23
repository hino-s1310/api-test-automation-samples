/**
 * テストデータの定義ファイル
 * APIテストで使用するモックデータを管理
 */

export interface UploadTestData {
  id: string;
  filename: string;
  markdown: string;
  status: string;
}

export interface ApiEndpoints {
  upload: string;
  files: string;
  fileDetail: (id: string) => string;
  fileLogs: (id: string) => string;
  statistics: string;
}

/**
 * テスト用のAPIエンドポイント
 */
export const API_ENDPOINTS: ApiEndpoints = {
  upload: '/upload',
  files: '/files',
  fileDetail: (id: string) => `/files/${id}`,
  fileLogs: (id: string) => `/files/${id}/logs`,
  statistics: '/statistics'
};

/**
 * 各テストで一意のデータを生成するヘルパー関数
 */
export const generateUniqueTestData = (): UploadTestData => ({
  id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  filename: `test-${Date.now()}.pdf`,
  markdown: 'test',
  status: 'completed',
});

/**
 * PDFアップロード用の正常系テストデータ
 */
export const VALID_UPLOAD_DATA: UploadTestData = {
  id: '1',
  filename: 'test.pdf',
  markdown: 'test',
  status: 'completed',
};

/**
 * 異常系テスト用のデータ
 */
export const INVALID_UPLOAD_DATA = {
  EMPTY_FILENAME: {
    ...VALID_UPLOAD_DATA,
    filename: ''
  },
  INVALID_STATUS: {
    ...VALID_UPLOAD_DATA,
    status: 'invalid_status'
  },
  NEGATIVE_FILE_SIZE: {
    ...VALID_UPLOAD_DATA,
    file_size: -1
  }
};

/**
 * クリーンアップ用のテスト日数
 */
export const CLEANUP_DAYS = 1;

/**
 * クリーンアップ用のテストデータ
 */
export const CLEANUP_TEST_DATA = {
  DAYS: CLEANUP_DAYS
};

/**
 * クリーンアップ用の正常系テストデータ
 */
export const VALID_CLEANUP_DATA: UploadTestData = {
  id: '1',
  filename: 'test.pdf',
  markdown: 'test',
  status: 'completed',
};

/**
 * レスポンス期待値
 */
export const EXPECTED_RESPONSES = {
  UPLOAD_SUCCESS: {
    status: 200,
    message: 'PDFファイルのアップロードと変換が完了しました'
  },
  BAD_REQUEST: {
    status: 400
  },
  INTERNAL_SERVER_ERROR: {
    status: 500
  },
  GET_FILES_LIST_SUCCESS: {
    status: 200,
    files: [
      {
        id: '1',
        filename: 'test.pdf',
        markdown: 'test',
        status: 'completed',
        created_at: '2021-01-01',
        updated_at: '2021-01-01',
        file_size: 100,
        processing_time: 100
      }
    ],
    total_count: 1,
    page: 1,
    per_page: 10
  },
  GET_FILE_SUCCESS: {
    status: 200
  },
  GET_FILE_NOT_FOUND: {
    status: 404,
    message: 'ファイルが見つかりません'
  },
  GET_FILE_LOGS_SUCCESS: {
    logs: [
      {
        id: '1',
        file_id: '1',
        action: 'upload',
        status: 'completed',
        created_at: '2021-01-01',
        updated_at: '2021-01-01',
        file_size: 100,
        processing_time: 100
      },
      {
        id: '2',
        file_id: '1',
        action: 'convert',
        status: 'completed',
        created_at: '2021-01-01',
        updated_at: '2021-01-01',
        file_size: 100,
        processing_time: 100
      }
    ],
    status: 200
  },
  GET_FILE_STATISTICS_SUCCESS: {
    status: 200,
    statistics: {
      total_files: 1,
      status_counts: {
        completed: 1,
        processing: 0,
        failed: 0
      },
      total_size_bytes: 100,
      total_size_mb: 0.1,
      total_processing_time: 100,
      average_processing_time: 100
    }
  },
  RECONVERT_SUCCESS: {
    status: 200
  },
  DELETE_SUCCESS: {
    status: 200,
    message: 'ファイルが正常に削除されました'
  },
  CLEANUP_SUCCESS: {
    status: 200,
    message: '30日より古いファイルのクリーンアップが完了しました',
    deleted_count: 1,
    total_old_files: 1
  }
};
