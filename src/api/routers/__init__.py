"""
ルーティング層

FastAPIのルーター定義を管理
"""

from .files import router as files_router
from .redaction import router as redaction_router
from .system import router as system_router
from .test_generation import router as test_generation_router

__all__ = [
    "files_router",
    "redaction_router",
    "system_router",
    "test_generation_router",
]
