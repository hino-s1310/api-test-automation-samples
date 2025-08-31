"""
ルーティング層

FastAPIのルーター定義を管理
"""

from .files import router as files_router

__all__ = ["files_router"]
