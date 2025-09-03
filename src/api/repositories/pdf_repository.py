"""
PDFリポジトリ

PDF関連のデータアクセス処理を担当
PDF変換処理、ファイルシステム操作、変換ログの管理
"""

import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pdfplumber
import pypdf
from sqlmodel import func, select

from ..database import SQLModelSessionManager, db_manager
from ..models import ConversionLog, FileStatus


class PDFRepository:
    """PDFリポジトリクラス"""

    def __init__(
        self,
        upload_dir: str = None,
        markdown_dir: str = None,
        use_sqlmodel: bool = False,
    ):
        # 環境変数からディレクトリパスを取得、なければデフォルト値を使用
        import os

        if upload_dir is None:
            upload_dir = os.environ.get("UPLOAD_DIR", "data/uploads")
        if markdown_dir is None:
            markdown_dir = os.environ.get("MARKDOWN_DIR", "data/markdown")

        self.upload_dir = Path(upload_dir)
        self.markdown_dir = Path(markdown_dir)
        self.use_sqlmodel = use_sqlmodel
        self.db_manager = db_manager

        # SQLModelサポートの初期化
        if self.use_sqlmodel:
            self.sqlmodel_manager = SQLModelSessionManager()
        else:
            self.sqlmodel_manager = None

        self._ensure_directories()

    def _ensure_directories(self):
        """必要なディレクトリの存在確認・作成"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.markdown_dir.mkdir(parents=True, exist_ok=True)

    # ===========================
    # PDFファイル検証
    # ===========================

    def validate_pdf_file(self, file_content: bytes, filename: str) -> tuple[bool, str]:
        """PDFファイルの検証"""
        # ファイルサイズチェック（10MB制限）
        if len(file_content) > 10 * 1024 * 1024:
            return False, "ファイルサイズは10MB以下にしてください"

        # ファイル拡張子チェック
        if not filename.lower().endswith(".pdf"):
            return False, "PDFファイルのみアップロード可能です"

        # PDFファイルの内容チェック
        try:
            from io import BytesIO

            pypdf.PdfReader(BytesIO(file_content))
            return True, "OK"
        except Exception:
            return False, "無効なPDFファイルです"

    # ===========================
    # ファイルシステム操作
    # ===========================

    def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """アップロードされたファイルを保存"""
        file_id = str(uuid.uuid4())
        file_path = self.upload_dir / f"{file_id}_{filename}"

        with open(file_path, "wb") as f:
            f.write(file_content)

        return str(file_path)

    def save_markdown(self, file_id: str, markdown_content: str) -> str:
        """Markdownをファイルに保存"""
        markdown_path = self.markdown_dir / f"{file_id}.md"

        with open(markdown_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        return str(markdown_path)

    def delete_pdf_file(self, file_path: str) -> bool:
        """PDFファイルを削除"""
        try:
            Path(file_path).unlink(missing_ok=True)
            return True
        except Exception:
            return False

    def delete_markdown_file(self, file_id: str) -> bool:
        """Markdownファイルを削除"""
        try:
            markdown_path = self.markdown_dir / f"{file_id}.md"
            markdown_path.unlink(missing_ok=True)
            return True
        except Exception:
            return False

    def file_exists(self, file_path: str) -> bool:
        """ファイルの存在確認"""
        return Path(file_path).exists()

    def get_file_size(self, file_path: str) -> int:
        """ファイルサイズを取得"""
        try:
            return Path(file_path).stat().st_size
        except Exception:
            return 0

    # ===========================
    # PDF変換処理
    # ===========================

    def convert_pdf_to_markdown(self, file_path: str) -> str:
        """PDFをMarkdownに変換"""
        markdown_content = []

        try:
            try:
                from markitdown import MarkItDown

                markitdown_converter = MarkItDown()
                result = markitdown_converter.convert(file_path)
                if result and result.text_content and result.text_content.strip():
                    return result.text_content
            except Exception as e:
                print(f"MarkItDownでの変換に失敗: {e}")

            # フォールバック1: pdfplumberを使用
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page_num, page in enumerate(pdf.pages, 1):
                        text = page.extract_text()
                        if text:
                            # ページ区切りを追加
                            if page_num > 1:
                                markdown_content.append("\n---\n")

                            # テキストをMarkdown形式に整形
                            lines = text.split("\n")
                            for line in lines:
                                line = line.strip()
                                if line:
                                    # 見出しっぽい行を検出
                                    if len(line) < 100 and line.isupper():
                                        markdown_content.append(f"## {line}")
                                    elif len(line) < 50 and line.endswith(":"):
                                        markdown_content.append(f"### {line}")
                                    else:
                                        markdown_content.append(line)

                            markdown_content.append("")  # 空行を追加
            except Exception as e:
                print(f"pdfplumberでの変換に失敗: {e}")

            # フォールバック2: pypdfを使用
            if not markdown_content or all(
                not line.strip() for line in markdown_content
            ):
                try:
                    with open(file_path, "rb") as f:
                        pdf_reader = pypdf.PdfReader(f)
                        for page_num, page in enumerate(pdf_reader.pages, 1):
                            text = page.extract_text()
                            if text:
                                if page_num > 1:
                                    markdown_content.append("\n---\n")
                                markdown_content.append(text)
                                markdown_content.append("")
                except Exception as e:
                    print(f"pypdfでの変換に失敗: {e}")

            return (
                "\n".join(markdown_content)
                if markdown_content
                else "# PDF変換結果\n\nテキストを抽出できませんでした。"
            )

        except Exception as e:
            return f"# PDF変換エラー\n\n変換中にエラーが発生しました: {str(e)}"

    # ===========================
    # PDFアップロード処理
    # ===========================

    async def process_pdf_upload(
        self, file_content: bytes, filename: str
    ) -> dict[str, Any]:
        """PDFアップロード処理"""
        start_time = time.time()

        # ファイル検証
        is_valid, message = self.validate_pdf_file(file_content, filename)
        if not is_valid:
            return {"success": False, "error": message, "file_id": None}

        # ファイルID生成
        file_id = str(uuid.uuid4())

        try:
            # ファイル保存
            file_path = self.save_uploaded_file(file_content, filename)
            file_size = len(file_content)

            # データベースにファイル情報を登録
            metadata = {
                "original_filename": filename,
                "upload_timestamp": datetime.now().isoformat(),
            }

            if not db_manager.insert_file(
                file_id, filename, file_path, file_size, metadata
            ):
                raise Exception("データベースへの登録に失敗しました")

            # 変換処理
            db_manager.update_file_status(file_id, FileStatus.PROCESSING)
            markdown_content = self.convert_pdf_to_markdown(file_path)

            # Markdown保存
            self.save_markdown(file_id, markdown_content)

            # 処理時間計算
            processing_time = time.time() - start_time

            # データベース更新
            db_manager.update_file_status(
                file_id, FileStatus.COMPLETED, markdown_content, processing_time
            )

            # ログ記録
            db_manager.add_conversion_log(
                file_id,
                "upload_and_convert",
                "success",
                "PDF to Markdown conversion completed",
                processing_time,
            )

            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "markdown": markdown_content,
                "file_size": file_size,
                "processing_time": processing_time,
                "status": FileStatus.COMPLETED,
            }

        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time
            db_manager.update_file_status(file_id, FileStatus.FAILED)
            db_manager.add_conversion_log(
                file_id, "upload_and_convert", "failed", str(e), processing_time
            )

            return {"success": False, "error": str(e), "file_id": file_id}

    # ===========================
    # PDF再変換処理
    # ===========================

    async def reconvert_pdf(
        self, file_id: str, file_content: bytes, filename: str
    ) -> dict[str, Any]:
        """PDFの再変換処理（新しいファイル名で更新）"""
        start_time = time.time()

        # ファイル検証
        is_valid, message = self.validate_pdf_file(file_content, filename)
        if not is_valid:
            return {"success": False, "error": message, "file_id": file_id}

        try:
            # 既存ファイルの確認
            existing_file = db_manager.get_file(file_id)
            if not existing_file:
                return {
                    "success": False,
                    "error": "ファイルが見つかりません",
                    "file_id": file_id,
                }

            # 新しいファイルを保存
            file_path = self.save_uploaded_file(file_content, filename)
            file_size = len(file_content)

            # 変換処理
            db_manager.update_file_status(file_id, FileStatus.PROCESSING)
            markdown_content = self.convert_pdf_to_markdown(file_path)

            # Markdown保存
            self.save_markdown(file_id, markdown_content)

            # 処理時間計算
            processing_time = time.time() - start_time

            # データベース更新（ファイル名も更新）
            db_manager.update_file_status(
                file_id, FileStatus.COMPLETED, markdown_content, processing_time
            )

            # ファイル名を更新
            db_manager.update_filename(file_id, filename)

            # ログ記録
            db_manager.add_conversion_log(
                file_id,
                "reconvert",
                "success",
                f"PDF reconversion completed with new filename: {filename}",
                processing_time,
            )

            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "markdown": markdown_content,
                "file_size": file_size,
                "processing_time": processing_time,
                "status": FileStatus.COMPLETED,
            }

        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time
            db_manager.update_file_status(file_id, FileStatus.FAILED)
            db_manager.add_conversion_log(
                file_id, "reconvert", "failed", str(e), processing_time
            )

            return {"success": False, "error": str(e), "file_id": file_id}

    # ===========================
    # 変換ログの管理
    # ===========================

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(ConversionLog).where(
                        ConversionLog.file_id == file_id
                    )
                    logs = session.exec(statement).all()
                    return [log.to_dict() for log in logs]
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.get_conversion_logs(file_id)
        else:
            return self.db_manager.get_conversion_logs(file_id)

    def add_conversion_log(
        self,
        file_id: str,
        action: str,
        status: str,
        message: str | None = None,
        processing_time: float | None = None,
    ) -> bool:
        """変換ログを追加"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    log_obj = ConversionLog(
                        file_id=file_id,
                        action=action,
                        status=status,
                        message=message,
                        timestamp=datetime.now(),
                        processing_time=processing_time,
                    )
                    session.add(log_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                try:
                    return self.db_manager.add_conversion_log(
                        file_id=file_id,
                        action=action,
                        status=status,
                        message=message,
                        processing_time=processing_time,
                    )
                except Exception:
                    return False
        else:
            try:
                return self.db_manager.add_conversion_log(
                    file_id=file_id,
                    action=action,
                    status=status,
                    message=message,
                    processing_time=processing_time,
                )
            except Exception:
                return False

    def get_conversion_logs_by_action(self, action: str) -> list[dict[str, Any]]:
        """指定されたアクションの変換ログを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(ConversionLog).where(
                        ConversionLog.action == action
                    )
                    logs = session.exec(statement).all()
                    return [log.to_dict() for log in logs]
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                all_logs = []
                for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                    "files"
                ]:
                    logs = self.get_conversion_logs(file_info["id"])
                    for log in logs:
                        if log.get("action") == action:
                            all_logs.append(log)
                return all_logs
        else:
            all_logs = []
            for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                "files"
            ]:
                logs = self.get_conversion_logs(file_info["id"])
                for log in logs:
                    if log.get("action") == action:
                        all_logs.append(log)
            return all_logs

    def get_conversion_logs_by_status(self, status: str) -> list[dict[str, Any]]:
        """指定されたステータスの変換ログを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(ConversionLog).where(
                        ConversionLog.status == status
                    )
                    logs = session.exec(statement).all()
                    return [log.to_dict() for log in logs]
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                all_logs = []
                for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                    "files"
                ]:
                    logs = self.get_conversion_logs(file_info["id"])
                    for log in logs:
                        if log.get("status") == status:
                            all_logs.append(log)
                return all_logs
        else:
            all_logs = []
            for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                "files"
            ]:
                logs = self.get_conversion_logs(file_info["id"])
                for log in logs:
                    if log.get("status") == status:
                        all_logs.append(log)
            return all_logs

    def get_conversion_statistics(self) -> dict[str, Any]:
        """変換統計情報を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # 総ログ数
                    total_logs_statement = select(func.count(ConversionLog.id))
                    total_logs = session.exec(total_logs_statement).one()

                    # 成功・失敗数
                    success_statement = select(func.count(ConversionLog.id)).where(
                        ConversionLog.status == "success"
                    )
                    success_count = session.exec(success_statement).one()

                    failed_statement = select(func.count(ConversionLog.id)).where(
                        ConversionLog.status == "failed"
                    )
                    failed_count = session.exec(failed_statement).one()

                    # 総処理時間
                    total_time_statement = select(
                        func.sum(ConversionLog.processing_time)
                    ).where(ConversionLog.processing_time.is_not(None))
                    total_processing_time = (
                        session.exec(total_time_statement).one() or 0
                    )

                    # アクション別カウント（簡易版）
                    action_counts = {}
                    try:
                        all_logs_statement = select(
                            ConversionLog.action, func.count(ConversionLog.id)
                        ).group_by(ConversionLog.action)
                        action_results = session.exec(all_logs_statement).all()
                        for action, count in action_results:
                            action_counts[action] = count
                    except Exception:
                        # アクション別カウントが失敗した場合は空の辞書を返す
                        action_counts = {}

                    return {
                        "total_logs": total_logs,
                        "success_count": success_count,
                        "failed_count": failed_count,
                        "success_rate": round(success_count / total_logs * 100, 2)
                        if total_logs > 0
                        else 0,
                        "total_processing_time": round(total_processing_time, 2),
                        "average_processing_time": round(
                            total_processing_time / total_logs, 2
                        )
                        if total_logs > 0
                        else 0,
                        "action_counts": action_counts,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                try:
                    total_logs = 0
                    success_count = 0
                    failed_count = 0
                    total_processing_time = 0
                    action_counts = {}

                    for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                        "files"
                    ]:
                        logs = self.get_conversion_logs(file_info["id"])
                        for log in logs:
                            total_logs += 1

                            # ステータス別カウント
                            if log.get("status") == "success":
                                success_count += 1
                            elif log.get("status") == "failed":
                                failed_count += 1

                            # 処理時間の合計
                            processing_time = log.get("processing_time", 0)
                            if (
                                isinstance(processing_time, int | float)
                                and processing_time >= 0
                            ):
                                total_processing_time += processing_time

                            # アクション別カウント
                            action = log.get("action", "unknown")
                            action_counts[action] = action_counts.get(action, 0) + 1

                    return {
                        "total_logs": total_logs,
                        "success_count": success_count,
                        "failed_count": failed_count,
                        "success_rate": round(success_count / total_logs * 100, 2)
                        if total_logs > 0
                        else 0,
                        "total_processing_time": round(total_processing_time, 2),
                        "average_processing_time": round(
                            total_processing_time / total_logs, 2
                        )
                        if total_logs > 0
                        else 0,
                        "action_counts": action_counts,
                    }
                except Exception as e:
                    return {
                        "error": str(e),
                        "total_logs": 0,
                        "success_count": 0,
                        "failed_count": 0,
                        "success_rate": 0,
                        "total_processing_time": 0,
                        "average_processing_time": 0,
                        "action_counts": {},
                    }
        else:
            # Legacy実装
            try:
                total_logs = 0
                success_count = 0
                failed_count = 0
                total_processing_time = 0
                action_counts = {}

                for file_info in self.db_manager.list_files(page=1, per_page=10000)[
                    "files"
                ]:
                    logs = self.get_conversion_logs(file_info["id"])
                    for log in logs:
                        total_logs += 1

                        # ステータス別カウント
                        if log.get("status") == "success":
                            success_count += 1
                        elif log.get("status") == "failed":
                            failed_count += 1

                        # 処理時間の合計
                        processing_time = log.get("processing_time", 0)
                        if (
                            isinstance(processing_time, int | float)
                            and processing_time >= 0
                        ):
                            total_processing_time += processing_time

                        # アクション別カウント
                        action = log.get("action", "unknown")
                        action_counts[action] = action_counts.get(action, 0) + 1

                return {
                    "total_logs": total_logs,
                    "success_count": success_count,
                    "failed_count": failed_count,
                    "success_rate": round(success_count / total_logs * 100, 2)
                    if total_logs > 0
                    else 0,
                    "total_processing_time": round(total_processing_time, 2),
                    "average_processing_time": round(
                        total_processing_time / total_logs, 2
                    )
                    if total_logs > 0
                    else 0,
                    "action_counts": action_counts,
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "total_logs": 0,
                    "success_count": 0,
                    "failed_count": 0,
                    "success_rate": 0,
                    "total_processing_time": 0,
                    "average_processing_time": 0,
                    "action_counts": {},
                }

    # ===========================
    # クリーンアップ・メンテナンス
    # ===========================

    def cleanup_old_files(self, days: int = 30) -> dict[str, Any]:
        """古いファイルをクリーンアップ"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            deleted_count = 0
            failed_count = 0

            # アップロードディレクトリのクリーンアップ
            for file_path in self.upload_dir.glob("*"):
                try:
                    if file_path.is_file():
                        file_age = datetime.now() - datetime.fromtimestamp(
                            file_path.stat().st_mtime
                        )
                        if file_age > cutoff_date:
                            if self.delete_pdf_file(str(file_path)):
                                deleted_count += 1
                            else:
                                failed_count += 1
                except Exception:
                    failed_count += 1

            # Markdownディレクトリのクリーンアップ
            for file_path in self.markdown_dir.glob("*.md"):
                try:
                    if file_path.is_file():
                        file_age = datetime.now() - datetime.fromtimestamp(
                            file_path.stat().st_mtime
                        )
                        if file_age > cutoff_date:
                            if self.delete_markdown_file(file_path.stem):
                                deleted_count += 1
                            else:
                                failed_count += 1
                except Exception:
                    failed_count += 1

            return {
                "success": True,
                "deleted_count": deleted_count,
                "failed_count": failed_count,
                "cutoff_date": cutoff_date.isoformat(),
            }
        except Exception as e:
            return {"success": False, "error": str(e), "deleted_count": 0}

    def get_orphaned_files(self) -> dict[str, Any]:
        """孤立したファイルを取得（データベースに記録されていないファイル）"""
        try:
            orphaned_pdfs = []
            orphaned_markdowns = []

            # データベースに記録されていないPDFファイルを検出
            for file_path in self.upload_dir.glob("*"):
                if file_path.is_file():
                    file_id = file_path.stem.split("_")[0]  # UUID部分を抽出
                    if not self.db_manager.get_file(file_id):
                        orphaned_pdfs.append(
                            {
                                "path": str(file_path),
                                "size": self.get_file_size(str(file_path)),
                                "modified": datetime.fromtimestamp(
                                    file_path.stat().st_mtime
                                ).isoformat(),
                            }
                        )

            # データベースに記録されていないMarkdownファイルを検出
            for file_path in self.markdown_dir.glob("*.md"):
                if file_path.is_file():
                    file_id = file_path.stem
                    if not self.db_manager.get_file(file_id):
                        orphaned_markdowns.append(
                            {
                                "path": str(file_path),
                                "size": self.get_file_size(str(file_path)),
                                "modified": datetime.fromtimestamp(
                                    file_path.stat().st_mtime
                                ).isoformat(),
                            }
                        )

            return {
                "orphaned_pdfs": orphaned_pdfs,
                "orphaned_markdowns": orphaned_markdowns,
                "total_orphaned": len(orphaned_pdfs) + len(orphaned_markdowns),
            }
        except Exception as e:
            return {
                "error": str(e),
                "orphaned_pdfs": [],
                "orphaned_markdowns": [],
                "total_orphaned": 0,
            }

    # ===========================
    # バッチ操作
    # ===========================

    async def batch_reconvert_files(
        self, file_ids: list[str], file_contents: list[bytes], filenames: list[str]
    ) -> dict[str, Any]:
        """複数のファイルを一括再変換"""
        try:
            if len(file_ids) != len(file_contents) or len(file_ids) != len(filenames):
                return {
                    "success": False,
                    "error": "ファイルID、コンテンツ、ファイル名の数が一致しません",
                }

            if not file_ids:
                return {"success": False, "error": "ファイルIDが指定されていません"}

            results = []
            success_count = 0
            failed_count = 0

            for file_id, file_content, filename in zip(
                file_ids, file_contents, filenames, strict=False
            ):
                try:
                    result = await self.reconvert_pdf(file_id, file_content, filename)
                    results.append(
                        {
                            "file_id": file_id,
                            "success": result["success"],
                            "error": result.get("error"),
                        }
                    )

                    if result["success"]:
                        success_count += 1
                    else:
                        failed_count += 1
                except Exception as e:
                    results.append(
                        {
                            "file_id": file_id,
                            "success": False,
                            "error": str(e),
                        }
                    )
                    failed_count += 1

            return {
                "success": True,
                "total_files": len(file_ids),
                "success_count": success_count,
                "failed_count": failed_count,
                "results": results,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"一括再変換中にエラーが発生しました: {str(e)}",
            }

    # ===========================
    # データベース管理
    # ===========================

    def get_database_info(self) -> dict[str, Any]:
        """データベース情報を取得"""
        try:
            total_files = self.db_manager.list_files(page=1, per_page=1)["total_count"]
            conversion_stats = self.get_conversion_statistics()

            return {
                "total_files": total_files,
                "conversion_statistics": conversion_stats,
                "upload_directory": str(self.upload_dir),
                "markdown_directory": str(self.markdown_dir),
            }
        except Exception as e:
            return {"error": str(e)}
