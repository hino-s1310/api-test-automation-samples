"""
ユニットテストパッケージ

PDF to Markdown API のユニットテストモジュール

このパッケージには以下が含まれます:
- test_api.py: API エンドポイントのテスト
- test_services.py: サービス層のテスト  
- helpers/: テスト用ヘルパー関数とユーティリティ
"""

from pathlib import Path

# テストデータディレクトリのパス
TEST_DATA_DIR = Path(__file__).parent.parent / "data"

# テスト設定
DEFAULT_TEST_TIMEOUT = 30
TEST_FILE_NAME = "test_markdown.pdf"

# バージョン情報（プロジェクトと合わせる）
__version__ = "1.0.0"
