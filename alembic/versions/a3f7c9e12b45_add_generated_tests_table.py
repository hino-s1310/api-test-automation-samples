"""add_generated_tests_table

Revision ID: a3f7c9e12b45
Revises: 78216dd8e167
Create Date: 2026-02-12 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f7c9e12b45"
down_revision: str | Sequence[str] | None = "78216dd8e167"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """generated_tests テーブルを作成"""
    op.create_table(
        "generated_tests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "file_id",
            sa.String(),
            sa.ForeignKey("files.id"),
            nullable=False,
        ),
        sa.Column("test_code", sa.Text(), nullable=False),
        sa.Column(
            "test_framework", sa.String(), nullable=False, server_default="pytest"
        ),
        sa.Column("language", sa.String(), nullable=False, server_default="python"),
        sa.Column("test_type", sa.String(), nullable=False, server_default="unit"),
        sa.Column("test_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("model_name", sa.String(), nullable=True),
        sa.Column(
            "prompt_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "completion_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "generation_time", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # インデックスの作成
    try:
        op.create_index(
            "ix_generated_tests_file_id", "generated_tests", ["file_id"]
        )
    except Exception:
        pass

    try:
        op.create_index(
            "ix_generated_tests_created_at", "generated_tests", ["created_at"]
        )
    except Exception:
        pass


def downgrade() -> None:
    """generated_tests テーブルを削除"""
    try:
        op.drop_index("ix_generated_tests_created_at", table_name="generated_tests")
    except Exception:
        pass

    try:
        op.drop_index("ix_generated_tests_file_id", table_name="generated_tests")
    except Exception:
        pass

    op.drop_table("generated_tests")
