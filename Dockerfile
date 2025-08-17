# Python 3.10 slimイメージを使用（3.8ではmarkitdownが動作しないため）
FROM python:3.10-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージを更新し、必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係をコピー
COPY pyproject.toml uv.lock ./

# uvをインストール
RUN pip install uv

# Python依存関係をインストール
RUN uv sync --frozen

# ソースコードをコピー
COPY src/ ./src/
COPY .env* ./

# 必要なディレクトリを作成
RUN mkdir -p data/uploads data/markdown

# ポート8000を公開
EXPOSE 8000

# ヘルスチェック用のエンドポイントを追加するため、一時的にコピー
COPY src/main.py ./main.py

# ヘルスチェック用のエンドポイントを追加
RUN echo 'from fastapi import FastAPI\n\
from fastapi.responses import JSONResponse\n\
import uvicorn\n\
\n\
app = FastAPI(title="PDF to Markdown API", version="1.0.0")\n\
\n\
@app.get("/health")\n\
async def health_check():\n\
    return JSONResponse(content={"status": "healthy"}, status_code=200)\n\
\n\
if __name__ == "__main__":\n\
    uvicorn.run(app, host="0.0.0.0", port=8000)\n\
' > main.py

# アプリケーションを起動
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
