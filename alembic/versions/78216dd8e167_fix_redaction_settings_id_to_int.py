"""fix_redaction_settings_id_to_int

Revision ID: 78216dd8e167
Revises: 19abad1933a6
Create Date: 2025-09-06 18:14:25.454530

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "78216dd8e167"
down_revision: str | Sequence[str] | None = "19abad1933a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLiteではALTER COLUMNがサポートされていないため、
    # テーブルを再作成する必要があります

    # redaction_settings_sharesテーブルを削除
    op.drop_table("redaction_settings_shares")

    # redaction_settingsテーブルを削除
    op.drop_table("redaction_settings")

    # redaction_settingsテーブルを再作成（idをint型に）
    op.create_table(
        "redaction_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("show_all", sa.Boolean(), nullable=False),
        sa.Column("level_settings", sa.String(), nullable=False),
        sa.Column("revealed_items", sa.String(), nullable=False),
        sa.Column("is_shared", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # redaction_settings_sharesテーブルを再作成（idをint型に）
    op.create_table(
        "redaction_settings_shares",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("settings_id", sa.Integer(), nullable=False),
        sa.Column("shared_with_user_id", sa.String(), nullable=True),
        sa.Column("shared_with_team_id", sa.String(), nullable=True),
        sa.Column("permission_level", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["settings_id"],
            ["redaction_settings.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # インデックスを再作成
    op.create_index(
        "ix_redaction_settings_file_user",
        "redaction_settings",
        ["file_id", "user_id"],
        unique=False,
    )
    op.create_index(
        "ix_redaction_settings_shared",
        "redaction_settings",
        ["is_shared", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_redaction_settings_shares_settings",
        "redaction_settings_shares",
        ["settings_id"],
        unique=False,
    )
    op.create_index(
        "ix_redaction_settings_shares_shared_with",
        "redaction_settings_shares",
        ["shared_with_user_id", "shared_with_team_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # インデックスを削除
    op.drop_index(
        "ix_redaction_settings_shares_shared_with",
        table_name="redaction_settings_shares",
    )
    op.drop_index(
        "ix_redaction_settings_shares_settings", table_name="redaction_settings_shares"
    )
    op.drop_index("ix_redaction_settings_shared", table_name="redaction_settings")
    op.drop_index("ix_redaction_settings_file_user", table_name="redaction_settings")

    # テーブルを削除
    op.drop_table("redaction_settings_shares")
    op.drop_table("redaction_settings")

    # 元のテーブルを再作成（idをstr型に）
    op.create_table(
        "redaction_settings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("file_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("show_all", sa.Boolean(), nullable=False),
        sa.Column("level_settings", sa.String(), nullable=False),
        sa.Column("revealed_items", sa.String(), nullable=False),
        sa.Column("is_shared", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "redaction_settings_shares",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("settings_id", sa.String(), nullable=False),
        sa.Column("shared_with_user_id", sa.String(), nullable=True),
        sa.Column("shared_with_team_id", sa.String(), nullable=True),
        sa.Column("permission_level", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["settings_id"],
            ["redaction_settings.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
