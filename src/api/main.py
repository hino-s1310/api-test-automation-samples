"""
PDF to Markdown API

PDFファイルをMarkdown形式に変換するAPI
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    files_router,
    redaction_router,
    system_router,
    test_generation_router,
)

# アプリケーションの作成
app = FastAPI(
    title="PDF to Markdown API",
    description="PDFファイルをMarkdown形式に変換するAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの統合
app.include_router(files_router)
app.include_router(redaction_router)
app.include_router(system_router)
app.include_router(test_generation_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
