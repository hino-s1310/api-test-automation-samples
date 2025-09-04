"""Add performance indexes

Revision ID: 8a1b2c3d4e5f
Revises: 42de592599de
Create Date: 2024-01-01 00:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "8a1b2c3d4e5f"
down_revision = "42de592599de"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes"""
    # files テーブルのインデックス
    try:
        op.create_index("ix_files_status", "files", ["status"])
    except Exception:
        pass  # インデックスが既に存在する場合はスキップ

    try:
        op.create_index("ix_files_created_at", "files", ["created_at"])
    except Exception:
        pass

    try:
        op.create_index("ix_files_is_edited", "files", ["is_edited"])
    except Exception:
        pass

    try:
        op.create_index("ix_files_filename", "files", ["filename"])
    except Exception:
        pass

    # conversion_logs テーブルのインデックス
    try:
        op.create_index("ix_conversion_logs_file_id", "conversion_logs", ["file_id"])
    except Exception:
        pass

    try:
        op.create_index("ix_conversion_logs_status", "conversion_logs", ["status"])
    except Exception:
        pass

    try:
        op.create_index("ix_conversion_logs_action", "conversion_logs", ["action"])
    except Exception:
        pass

    try:
        op.create_index(
            "ix_conversion_logs_timestamp", "conversion_logs", ["timestamp"]
        )
    except Exception:
        pass

    # file_edit_history テーブルのインデックス
    try:
        op.create_index(
            "ix_file_edit_history_file_id", "file_edit_history", ["file_id"]
        )
    except Exception:
        pass

    try:
        op.create_index(
            "ix_file_edit_history_created_at", "file_edit_history", ["created_at"]
        )
    except Exception:
        pass


def downgrade() -> None:
    """Remove performance indexes"""
    # files テーブルのインデックス削除
    op.drop_index("ix_files_status", table_name="files")
    op.drop_index("ix_files_created_at", table_name="files")
    op.drop_index("ix_files_is_edited", table_name="files")
    op.drop_index("ix_files_filename", table_name="files")

    # conversion_logs テーブルのインデックス削除
    op.drop_index("ix_conversion_logs_file_id", table_name="conversion_logs")
    op.drop_index("ix_conversion_logs_status", table_name="conversion_logs")
    op.drop_index("ix_conversion_logs_action", table_name="conversion_logs")
    op.drop_index("ix_conversion_logs_timestamp", table_name="conversion_logs")

    # file_edit_history テーブルのインデックス削除
    op.drop_index("ix_file_edit_history_file_id", table_name="file_edit_history")
    op.drop_index("ix_file_edit_history_created_at", table_name="file_edit_history")
