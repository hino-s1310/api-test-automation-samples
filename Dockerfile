# Python 3.10 slimイメージを使用（3.8ではmarkitdownが動作しないため）
FROM python:3.10-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Pythonの依存関係をコピー
COPY pyproject.toml uv.lock ./

# uvをインストール
RUN pip install uv

# 依存関係をインストール
RUN uv sync --frozen

# アプリケーションコードをコピー
COPY apps/api/ ./apps/api/
COPY data/ ./data/

# ポート8000を公開
EXPOSE 8000

# アプリケーションを起動
CMD ["uv", "run", "uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
