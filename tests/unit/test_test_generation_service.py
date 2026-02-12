"""
AIテスト生成サービスのユニットテスト

TestGenerationServiceのビジネスロジックをテスト。
AI APIはモックして外部依存を排除する。
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.api.models import TestGenerationRequest
from src.api.services.test_generation_service import TestGenerationService


# ===========================
# フィクスチャ
# ===========================


@pytest.fixture
def service():
    """テスト用のTestGenerationServiceインスタンス"""
    with patch.dict(os.environ, {"AI_API_KEY": "test-api-key"}):
        svc = TestGenerationService.__new__(TestGenerationService)
        svc.api_key = "test-api-key"
        svc.base_url = "https://api.openai.com/v1"
        svc.model = "gpt-4o"
        svc.timeout = 60
        svc.sqlmodel_manager = MagicMock()
        return svc


@pytest.fixture
def service_no_key():
    """APIキーなしのTestGenerationServiceインスタンス"""
    svc = TestGenerationService.__new__(TestGenerationService)
    svc.api_key = None
    svc.base_url = "https://api.openai.com/v1"
    svc.model = "gpt-4o"
    svc.timeout = 60
    svc.sqlmodel_manager = MagicMock()
    return svc


@pytest.fixture
def default_options():
    """デフォルトのテスト生成オプション"""
    return TestGenerationRequest(
        test_framework="pytest",
        language="python",
        test_type="unit",
        max_tests=10,
        include_edge_cases=True,
    )


@pytest.fixture
def sample_markdown():
    """テスト用のMarkdownコンテンツ"""
    return """# API仕様書

## POST /users

ユーザーを作成するエンドポイント。

### リクエスト
- name: string (必須)
- email: string (必須)

### レスポンス
- 201: ユーザー作成成功
- 400: バリデーションエラー
- 409: メールアドレス重複
"""


@pytest.fixture
def mock_ai_response():
    """AI APIの成功レスポンスデータ"""
    return {
        "choices": [
            {
                "message": {
                    "content": (
                        'import pytest\n\n\n'
                        'def test_create_user_success():\n'
                        '    """ユーザー作成の正常系テスト"""\n'
                        '    assert True\n\n\n'
                        'def test_create_user_validation_error():\n'
                        '    """バリデーションエラーテスト"""\n'
                        '    assert True\n\n\n'
                        'def test_create_user_duplicate_email():\n'
                        '    """メールアドレス重複テスト"""\n'
                        '    assert True\n'
                    )
                }
            }
        ],
        "usage": {
            "prompt_tokens": 500,
            "completion_tokens": 300,
        },
        "model": "gpt-4o",
    }


# ===========================
# is_available テスト
# ===========================


class TestIsAvailable:
    """is_available メソッドのテスト"""

    def test_available_with_api_key(self, service):
        """APIキーが設定されている場合はTrueを返す"""
        assert service.is_available() is True

    def test_not_available_without_api_key(self, service_no_key):
        """APIキーが未設定の場合はFalseを返す"""
        assert service_no_key.is_available() is False

    def test_not_available_with_empty_api_key(self, service):
        """空のAPIキーの場合はFalseを返す"""
        service.api_key = ""
        assert service.is_available() is False


# ===========================
# _build_prompt テスト
# ===========================


class TestBuildPrompt:
    """_build_prompt メソッドのテスト"""

    def test_builds_system_and_user_messages(self, service, default_options, sample_markdown):
        """システムメッセージとユーザーメッセージが生成される"""
        messages = service._build_prompt(sample_markdown, default_options)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"

    def test_system_prompt_contains_test_instructions(self, service, default_options, sample_markdown):
        """システムプロンプトにテスト生成の指示が含まれる"""
        messages = service._build_prompt(sample_markdown, default_options)
        system_content = messages[0]["content"]

        assert "正常系テスト" in system_content
        assert "異常系テスト" in system_content
        assert "境界値テスト" in system_content

    def test_includes_edge_cases_when_enabled(self, service, sample_markdown):
        """エッジケースが有効の場合、プロンプトに含まれる"""
        options = TestGenerationRequest(include_edge_cases=True)
        messages = service._build_prompt(sample_markdown, options)
        system_content = messages[0]["content"]

        assert "エッジケーステスト" in system_content

    def test_excludes_edge_cases_when_disabled(self, service, sample_markdown):
        """エッジケースが無効の場合、プロンプトに含まれない"""
        options = TestGenerationRequest(include_edge_cases=False)
        messages = service._build_prompt(sample_markdown, options)
        system_content = messages[0]["content"]

        assert "エッジケーステスト" not in system_content

    def test_user_prompt_contains_options(self, service, default_options, sample_markdown):
        """ユーザープロンプトにオプション情報が含まれる"""
        messages = service._build_prompt(sample_markdown, default_options)
        user_content = messages[1]["content"]

        assert "pytest" in user_content
        assert "python" in user_content
        assert "unit" in user_content
        assert "10" in user_content

    def test_user_prompt_contains_markdown(self, service, default_options, sample_markdown):
        """ユーザープロンプトにMarkdownコンテンツが含まれる"""
        messages = service._build_prompt(sample_markdown, default_options)
        user_content = messages[1]["content"]

        assert "API仕様書" in user_content
        assert "POST /users" in user_content


# ===========================
# _count_tests テスト
# ===========================


class TestCountTests:
    """_count_tests メソッドのテスト"""

    def test_counts_pytest_functions(self, service):
        """pytestのテスト関数をカウント"""
        code = (
            "def test_first():\n    pass\n\n"
            "def test_second():\n    pass\n\n"
            "def helper_function():\n    pass\n"
        )
        assert service._count_tests(code, "pytest") == 2

    def test_counts_async_pytest_functions(self, service):
        """asyncなpytestテスト関数もカウント"""
        code = (
            "async def test_async_first():\n    pass\n\n"
            "def test_sync_second():\n    pass\n"
        )
        assert service._count_tests(code, "pytest") == 2

    def test_counts_jest_tests(self, service):
        """Jestのテストをカウント"""
        code = (
            "test('should do something', () => {\n});\n\n"
            "it('should do another thing', () => {\n});\n\n"
            "describe('group', () => {\n});\n"
        )
        assert service._count_tests(code, "jest") == 2

    def test_counts_playwright_tests(self, service):
        """Playwrightのテストをカウント"""
        code = (
            "test('first test', async ({ page }) => {\n});\n\n"
            "test('second test', async ({ page }) => {\n});\n"
        )
        assert service._count_tests(code, "playwright") == 2

    def test_returns_zero_for_unknown_framework(self, service):
        """未知のフレームワークの場合は0を返す"""
        assert service._count_tests("some code", "unknown") == 0

    def test_returns_zero_for_empty_code(self, service):
        """空のコードの場合は0を返す"""
        assert service._count_tests("", "pytest") == 0


# ===========================
# _strip_code_fences テスト
# ===========================


class TestStripCodeFences:
    """_strip_code_fences メソッドのテスト"""

    def test_strips_python_code_fence(self, service):
        """Pythonコードブロックの記法を除去"""
        text = "```python\nimport pytest\n```"
        assert service._strip_code_fences(text) == "import pytest"

    def test_strips_generic_code_fence(self, service):
        """汎用コードブロックの記法を除去"""
        text = "```\nimport pytest\n```"
        assert service._strip_code_fences(text) == "import pytest"

    def test_leaves_plain_text_unchanged(self, service):
        """コードブロック記法がない場合はそのまま"""
        text = "import pytest"
        assert service._strip_code_fences(text) == "import pytest"

    def test_strips_typescript_code_fence(self, service):
        """TypeScriptコードブロックの記法を除去"""
        text = "```typescript\nconst x = 1;\n```"
        assert service._strip_code_fences(text) == "const x = 1;"


# ===========================
# generate_tests テスト
# ===========================


class TestGenerateTests:
    """generate_tests メソッドのテスト"""

    @pytest.mark.asyncio
    async def test_returns_error_when_no_api_key(self, service_no_key, default_options, sample_markdown):
        """APIキーが未設定の場合エラーを返す"""
        result = await service_no_key.generate_tests(sample_markdown, default_options)

        assert result["success"] is False
        assert result["error_code"] == "API_KEY_NOT_SET"

    @pytest.mark.asyncio
    async def test_returns_error_for_empty_content(self, service, default_options):
        """空のMarkdownの場合エラーを返す"""
        result = await service.generate_tests("", default_options)

        assert result["success"] is False
        assert result["error_code"] == "EMPTY_CONTENT"

    @pytest.mark.asyncio
    async def test_returns_error_for_whitespace_content(self, service, default_options):
        """空白のみのMarkdownの場合エラーを返す"""
        result = await service.generate_tests("   \n  \t  ", default_options)

        assert result["success"] is False
        assert result["error_code"] == "EMPTY_CONTENT"

    @pytest.mark.asyncio
    async def test_successful_generation(self, service, default_options, sample_markdown, mock_ai_response):
        """AI APIから正常にテストが生成される"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_ai_response

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is True
        assert "test_code" in result
        assert result["test_count"] == 3
        assert result["prompt_tokens"] == 500
        assert result["completion_tokens"] == 300

    @pytest.mark.asyncio
    async def test_handles_rate_limit(self, service, default_options, sample_markdown):
        """レート制限レスポンスを適切に処理"""
        mock_response = MagicMock()
        mock_response.status_code = 429

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is False
        assert result["error_code"] == "RATE_LIMITED"

    @pytest.mark.asyncio
    async def test_handles_api_error(self, service, default_options, sample_markdown):
        """API エラーレスポンスを適切に処理"""
        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is False
        assert result["error_code"] == "API_ERROR"

    @pytest.mark.asyncio
    async def test_handles_timeout(self, service, default_options, sample_markdown):
        """タイムアウトを適切に処理"""
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.TimeoutException("timeout")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is False
        assert result["error_code"] == "TIMEOUT"

    @pytest.mark.asyncio
    async def test_handles_connection_error(self, service, default_options, sample_markdown):
        """接続エラーを適切に処理"""
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.ConnectError("connection failed")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is False
        assert result["error_code"] == "CONNECTION_ERROR"

    @pytest.mark.asyncio
    async def test_strips_code_fences_from_response(self, service, default_options, sample_markdown):
        """レスポンスからコードブロック記法を除去"""
        response_data = {
            "choices": [
                {
                    "message": {
                        "content": "```python\ndef test_example():\n    pass\n```"
                    }
                }
            ],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50},
            "model": "gpt-4o",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response_data

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_cls.return_value = mock_client

            result = await service.generate_tests(sample_markdown, default_options)

        assert result["success"] is True
        assert "```" not in result["test_code"]


# ===========================
# TestGenerationRequest モデルテスト
# ===========================


class TestTestGenerationRequest:
    """TestGenerationRequestモデルのテスト"""

    def test_default_values(self):
        """デフォルト値が正しく設定される"""
        request = TestGenerationRequest()
        assert request.test_framework == "pytest"
        assert request.language == "python"
        assert request.test_type == "unit"
        assert request.max_tests == 10
        assert request.include_edge_cases is True

    def test_custom_values(self):
        """カスタム値が正しく設定される"""
        request = TestGenerationRequest(
            test_framework="jest",
            language="typescript",
            test_type="integration",
            max_tests=20,
            include_edge_cases=False,
        )
        assert request.test_framework == "jest"
        assert request.language == "typescript"
        assert request.test_type == "integration"
        assert request.max_tests == 20
        assert request.include_edge_cases is False

    def test_max_tests_validation(self):
        """max_testsのバリデーション"""
        # 最小値 (1)
        request = TestGenerationRequest(max_tests=1)
        assert request.max_tests == 1

        # 最大値 (50)
        request = TestGenerationRequest(max_tests=50)
        assert request.max_tests == 50

        # 範囲外の値はバリデーションエラー
        with pytest.raises(Exception):
            TestGenerationRequest(max_tests=0)

        with pytest.raises(Exception):
            TestGenerationRequest(max_tests=51)
