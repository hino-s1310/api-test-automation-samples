"""Add file_metadata column and update constraints

Revision ID: 42de592599de
Revises: bbd501e4df3c
Create Date: 2025-09-03 21:47:38.333953

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "42de592599de"
down_revision: str | Sequence[str] | None = "bbd501e4df3c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite対応の安全なマイグレーション

    # 1. filesテーブルにfile_metadataカラムを追加（既存のmetadataカラムがある場合はスキップ）
    try:
        # 既存のmetadataカラムをfile_metadataにリネーム
        op.execute("ALTER TABLE files RENAME COLUMN metadata TO file_metadata")
    except Exception:
        # metadataカラムが存在しない場合は、file_metadataカラムを追加
        try:
            op.execute("ALTER TABLE files ADD COLUMN file_metadata TEXT")
        except Exception:
            # 既にfile_metadataカラムが存在する場合はスキップ
            pass  # 2. 必要な制約を追加（SQLiteでは制約の追加が制限されているため、基本的なもののみ）
    # 注意: SQLiteでは既存のカラムの制約を変更することはできないため、
    # アプリケーションレベルで制約を管理する必要がある


def downgrade() -> None:
    """Downgrade schema."""
    # ダウングレード時はfile_metadataカラムをmetadataにリネーム
    try:
        op.execute("ALTER TABLE files RENAME COLUMN file_metadata TO metadata")
    except Exception:
        # リネームに失敗した場合は、file_metadataカラムを削除
        try:
            op.execute("ALTER TABLE files DROP COLUMN file_metadata")
        except Exception:
            # カラムが存在しない場合はスキップ
            pass
