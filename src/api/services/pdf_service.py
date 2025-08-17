"""
PDF変換サービス

PDFファイルをMarkdown形式に変換する処理を担当
"""

import os
import time
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
import pypdf
import pdfplumber
import markitdown
from datetime import datetime

from ..database import db_manager
from ..models import FileStatus


class PDFService:
    """PDF変換サービス"""
    
    def __init__(self, upload_dir: str = "data/uploads", 
                 markdown_dir: str = "data/markdown"):
        self.upload_dir = Path(upload_dir)
        self.markdown_dir = Path(markdown_dir)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """必要なディレクトリの存在確認・作成"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.markdown_dir.mkdir(parents=True, exist_ok=True)
    
    def _validate_pdf_file(self, file_content: bytes, filename: str) -> tuple[bool, str]:
        """PDFファイルの検証"""
        # ファイルサイズチェック（10MB制限）
        if len(file_content) > 10 * 1024 * 1024:
            return False, "ファイルサイズは10MB以下にしてください"
        
        # ファイル拡張子チェック
        if not filename.lower().endswith('.pdf'):
            return False, "PDFファイルのみアップロード可能です"
        
        # PDFファイルの内容チェック
        try:
            from io import BytesIO
            pypdf.PdfReader(BytesIO(file_content))
            return True, "OK"
        except Exception as e:
            return False, "無効なPDFファイルです"
    
    def _save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """アップロードされたファイルを保存"""
        file_id = str(uuid.uuid4())
        file_path = self.upload_dir / f"{file_id}_{filename}"
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    def _convert_pdf_to_markdown(self, file_path: str) -> str:
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
                            lines = text.split('\n')
                            for line in lines:
                                line = line.strip()
                                if line:
                                    # 見出しっぽい行を検出
                                    if len(line) < 100 and line.isupper():
                                        markdown_content.append(f"## {line}")
                                    elif len(line) < 50 and line.endswith(':'):
                                        markdown_content.append(f"### {line}")
                                    else:
                                        markdown_content.append(line)
                            
                            markdown_content.append("")  # 空行を追加
            except Exception as e:
                print(f"pdfplumberでの変換に失敗: {e}")
            
            # フォールバック2: pypdfを使用
            if not markdown_content or all(not line.strip() for line in markdown_content):
                try:
                    with open(file_path, 'rb') as f:
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
            
            return "\n".join(markdown_content) if markdown_content else "# PDF変換結果\n\nテキストを抽出できませんでした。"
            
        except Exception as e:
            return f"# PDF変換エラー\n\n変換中にエラーが発生しました: {str(e)}"
    
    def _save_markdown(self, file_id: str, markdown_content: str) -> str:
        """Markdownをファイルに保存"""
        markdown_path = self.markdown_dir / f"{file_id}.md"
        
        with open(markdown_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)
        
        return str(markdown_path)
    
    async def process_pdf_upload(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """PDFアップロード処理"""
        start_time = time.time()
        
        # ファイル検証
        is_valid, message = self._validate_pdf_file(file_content, filename)
        if not is_valid:
            return {
                "success": False,
                "error": message,
                "file_id": None
            }
        
        # ファイルID生成
        file_id = str(uuid.uuid4())
        
        try:
            # ファイル保存
            file_path = self._save_uploaded_file(file_content, filename)
            file_size = len(file_content)
            
            # データベースにファイル情報を登録
            metadata = {
                "original_filename": filename,
                "upload_timestamp": datetime.now().isoformat()
            }
            
            if not db_manager.insert_file(file_id, filename, file_path, file_size, metadata):
                raise Exception("データベースへの登録に失敗しました")
            
            # 変換処理
            db_manager.update_file_status(file_id, FileStatus.PROCESSING)
            markdown_content = self._convert_pdf_to_markdown(file_path)
            
            # Markdown保存
            markdown_path = self._save_markdown(file_id, markdown_content)
            
            # 処理時間計算
            processing_time = time.time() - start_time
            
            # データベース更新
            db_manager.update_file_status(
                file_id, 
                FileStatus.COMPLETED, 
                markdown_content, 
                processing_time
            )
            
            # ログ記録
            db_manager.add_conversion_log(
                file_id, 
                "upload_and_convert", 
                "success", 
                "PDF to Markdown conversion completed",
                processing_time
            )
            
            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "markdown": markdown_content,
                "file_size": file_size,
                "processing_time": processing_time,
                "status": FileStatus.COMPLETED
            }
            
        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time
            db_manager.update_file_status(file_id, FileStatus.FAILED)
            db_manager.add_conversion_log(
                file_id, 
                "upload_and_convert", 
                "failed", 
                str(e),
                processing_time
            )
            
            return {
                "success": False,
                "error": str(e),
                "file_id": file_id
            }
    
    async def reconvert_pdf(self, file_id: str, file_content: bytes, 
                           filename: str) -> Dict[str, Any]:
        """PDFの再変換処理"""
        start_time = time.time()
        
        # ファイル検証
        is_valid, message = self._validate_pdf_file(file_content, filename)
        if not is_valid:
            return {
                "success": False,
                "error": message,
                "file_id": file_id
            }
        
        try:
            # 既存ファイルの確認
            existing_file = db_manager.get_file(file_id)
            if not existing_file:
                return {
                    "success": False,
                    "error": "ファイルが見つかりません",
                    "file_id": file_id
                }
            
            # 新しいファイルを保存
            file_path = self._save_uploaded_file(file_content, filename)
            file_size = len(file_content)
            
            # 変換処理
            db_manager.update_file_status(file_id, FileStatus.PROCESSING)
            markdown_content = self._convert_pdf_to_markdown(file_path)
            
            # Markdown保存
            markdown_path = self._save_markdown(file_id, markdown_content)
            
            # 処理時間計算
            processing_time = time.time() - start_time
            
            # データベース更新
            db_manager.update_file_status(
                file_id, 
                FileStatus.COMPLETED, 
                markdown_content, 
                processing_time
            )
            
            # ログ記録
            db_manager.add_conversion_log(
                file_id, 
                "reconvert", 
                "success", 
                "PDF reconversion completed",
                processing_time
            )
            
            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "markdown": markdown_content,
                "file_size": file_size,
                "processing_time": processing_time,
                "status": FileStatus.COMPLETED
            }
            
        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time
            db_manager.update_file_status(file_id, FileStatus.FAILED)
            db_manager.add_conversion_log(
                file_id, 
                "reconvert", 
                "failed", 
                str(e),
                processing_time
            )
            
            return {
                "success": False,
                "error": str(e),
                "file_id": file_id
            }
