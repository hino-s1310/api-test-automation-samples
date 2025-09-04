"""Mark current schema as baseline

Revision ID: bbd501e4df3c
Revises:
Create Date: 2025-09-03 21:41:56.292663

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "bbd501e4df3c"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # 既存のテーブル構造をベースラインとしてマーク
    # 実際の変更は行わない（既存のテーブル構造を維持）
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # ベースラインからのダウングレードは何もしない
    pass
