"""
リポジトリ層

データアクセス処理を担当
データベース操作の抽象化とカプセル化
"""

from .file_repository import FileRepository

__all__ = ["FileRepository"]
