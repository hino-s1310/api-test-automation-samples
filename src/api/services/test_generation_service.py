"""
AIテスト生成サービス

Markdownコンテンツからテストコードを自動生成するサービス。
OpenAI互換APIを使用してAIによるテスト生成を行う。
"""

import os
import re
import time
from typing import Any

import httpx
from sqlmodel import select

from ..database import SQLModelSessionManager
from ..models import GeneratedTest, TestGenerationRequest


class TestGenerationService:
    """AIテスト生成サービス"""

    def __init__(
        self,
        sqlmodel_manager: SQLModelSessionManager | None = None,
    ) -> None:
        self.api_key: str | None = os.getenv("AI_API_KEY")
        self.base_url: str = os.getenv(
            "AI_API_BASE_URL", "https://api.openai.com/v1"
        )
        self.model: str = os.getenv("AI_API_MODEL", "gpt-4o")
        self.timeout: int = int(os.getenv("AI_API_TIMEOUT", "60"))
        self.sqlmodel_manager = sqlmodel_manager or SQLModelSessionManager()

    def is_available(self) -> bool:
        """AI APIが利用可能かチェック"""
        return self.api_key is not None and len(self.api_key) > 0

    def _build_prompt(
        self,
        markdown_content: str,
        options: TestGenerationRequest,
    ) -> list[dict[str, str]]:
        """テスト生成用プロンプトを構築"""
        system_prompt = (
            "あなたはソフトウェアテストの専門家です。"
            "提供されたMarkdownドキュメント（API仕様書やドキュメント）を分析し、"
            "指定されたフレームワーク・言語でテストコードを生成してください。\n\n"
            "生成するテストには以下を含めてください:\n"
            "1. 正常系テスト\n"
            "2. 異常系テスト（エラーハンドリング）\n"
            "3. 境界値テスト\n"
        )

        if options.include_edge_cases:
            system_prompt += "4. エッジケーステスト\n"

        system_prompt += (
            "\n出力はテストコードのみを返してください。"
            "説明文やMarkdownのコードブロック記法（```）は不要です。"
        )

        user_prompt = (
            f"以下の設定でテストコードを生成してください。\n\n"
            f"- テストフレームワーク: {options.test_framework}\n"
            f"- プログラミング言語: {options.language}\n"
            f"- テスト種類: {options.test_type}\n"
            f"- 最大テスト数: {options.max_tests}\n"
            f"- エッジケース: {'含める' if options.include_edge_cases else '含めない'}\n\n"
            f"--- 対象ドキュメント ---\n\n"
            f"{markdown_content}"
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _count_tests(self, test_code: str, framework: str) -> int:
        """生成されたテストコード内のテスト数をカウント"""
        if framework in ("pytest", "unittest"):
            # def test_ で始まる関数をカウント
            return len(re.findall(r"(?:def|async def)\s+test_\w+", test_code))
        elif framework in ("jest", "vitest"):
            # it( または test( をカウント
            return len(re.findall(r"(?:it|test)\s*\(", test_code))
        elif framework == "playwright":
            # test( をカウント
            return len(re.findall(r"test\s*\(", test_code))
        return 0

    def _strip_code_fences(self, text: str) -> str:
        """コードブロック記法を除去"""
        # ```python ... ``` や ``` ... ``` を除去
        stripped = re.sub(
            r"^```[\w]*\n?", "", text.strip(), flags=re.MULTILINE
        )
        stripped = re.sub(r"\n?```$", "", stripped.strip(), flags=re.MULTILINE)
        return stripped.strip()

    async def generate_tests(
        self,
        markdown_content: str,
        options: TestGenerationRequest,
    ) -> dict[str, Any]:
        """Markdownコンテンツからテストを生成"""
        if not self.is_available():
            return {
                "success": False,
                "error": "AI APIキーが設定されていません。環境変数 AI_API_KEY を設定してください。",
                "error_code": "API_KEY_NOT_SET",
            }

        if not markdown_content or not markdown_content.strip():
            return {
                "success": False,
                "error": "Markdownコンテンツが空です。",
                "error_code": "EMPTY_CONTENT",
            }

        messages = self._build_prompt(markdown_content, options)

        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 4096,
                    },
                )

            generation_time = time.time() - start_time

            if response.status_code == 429:
                return {
                    "success": False,
                    "error": "AI APIのレート制限に達しました。しばらく待ってから再試行してください。",
                    "error_code": "RATE_LIMITED",
                }

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"AI APIエラー: ステータスコード {response.status_code}",
                    "error_code": "API_ERROR",
                }

            data = response.json()
            generated_text = data["choices"][0]["message"]["content"]
            generated_text = self._strip_code_fences(generated_text)
            usage = data.get("usage", {})

            test_count = self._count_tests(generated_text, options.test_framework)

            return {
                "success": True,
                "test_code": generated_text,
                "test_count": test_count,
                "model_name": data.get("model", self.model),
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "generation_time": generation_time,
            }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "AI APIへのリクエストがタイムアウトしました。",
                "error_code": "TIMEOUT",
            }
        except httpx.ConnectError:
            return {
                "success": False,
                "error": "AI APIに接続できませんでした。",
                "error_code": "CONNECTION_ERROR",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"テスト生成中にエラーが発生しました: {str(e)}",
                "error_code": "UNKNOWN_ERROR",
            }

    def save_generated_test(
        self,
        file_id: str,
        result: dict[str, Any],
        options: TestGenerationRequest,
    ) -> GeneratedTest:
        """生成されたテストをDBに保存"""
        generated_test = GeneratedTest(
            file_id=file_id,
            test_code=result["test_code"],
            test_framework=options.test_framework,
            language=options.language,
            test_type=options.test_type,
            test_count=result["test_count"],
            model_name=result.get("model_name"),
            prompt_tokens=result.get("prompt_tokens", 0),
            completion_tokens=result.get("completion_tokens", 0),
            generation_time=result.get("generation_time", 0.0),
        )

        with self.sqlmodel_manager as session:
            session.add(generated_test)
            session.flush()
            session.refresh(generated_test)

        return generated_test

    def get_generated_tests(self, file_id: str) -> list[GeneratedTest]:
        """ファイルに関連する生成テスト一覧を取得"""
        with self.sqlmodel_manager as session:
            statement = (
                select(GeneratedTest)
                .where(GeneratedTest.file_id == file_id)
                .order_by(GeneratedTest.created_at.desc())  # type: ignore[union-attr]
            )
            results = session.exec(statement).all()
            return list(results)

    def get_generated_test_by_id(
        self, file_id: str, test_id: int
    ) -> GeneratedTest | None:
        """特定の生成テストを取得"""
        with self.sqlmodel_manager as session:
            statement = select(GeneratedTest).where(
                GeneratedTest.file_id == file_id,
                GeneratedTest.id == test_id,
            )
            return session.exec(statement).first()
