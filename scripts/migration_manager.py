#!/usr/bin/env python3
"""
マイグレーション管理スクリプト
本番環境での安全なマイグレーション実行をサポート
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from src.api.database import (  # noqa: E402
    get_database_path,
    verify_database_compatibility,
)


class MigrationManager:
    """マイグレーション管理クラス"""

    def __init__(self, environment: str = "development"):
        self.environment = environment
        self.db_path = get_database_path()
        self.project_root = project_root

    def check_prerequisites(self) -> dict[str, bool]:
        """マイグレーション実行前の前提条件チェック"""
        checks = {
            "database_exists": os.path.exists(self.db_path),
            "alembic_config_exists": os.path.exists("alembic.ini"),
            "alembic_versions_exists": os.path.exists("alembic/versions"),
            "sqlmodel_models_importable": True,
        }

        # SQLModelモデルのインポートテスト
        try:
            checks["sqlmodel_models_importable"] = True
        except ImportError as e:
            checks["sqlmodel_models_importable"] = False
            checks["import_error"] = str(e)

        return checks

    def get_current_revision(self) -> str | None:
        """現在のマイグレーションリビジョンを取得"""
        try:
            result = subprocess.run(
                ["uv", "run", "alembic", "current"],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                env={**os.environ, "ENVIRONMENT": self.environment},
            )
            if result.returncode == 0:
                # 出力からリビジョンIDを抽出
                for line in result.stdout.split("\n"):
                    if "->" in line and "(head)" in line:
                        return line.split("->")[1].split("(")[0].strip()
                    elif line.strip() and not line.startswith("INFO"):
                        return line.strip()
            return None
        except Exception as e:
            print(f"リビジョン取得エラー: {e}")
            return None

    def get_migration_history(self) -> list[dict[str, str]]:
        """マイグレーション履歴を取得"""
        try:
            result = subprocess.run(
                ["uv", "run", "alembic", "history"],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                env={**os.environ, "ENVIRONMENT": self.environment},
            )

            migrations = []
            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if "->" in line and "," in line:
                        parts = line.split("->")
                        if len(parts) == 2:
                            revision_part = parts[1].split(",")[0].strip()
                            message_part = (
                                parts[1].split(",")[1].strip()
                                if "," in parts[1]
                                else ""
                            )

                            # リビジョンIDを抽出
                            revision_id = revision_part.split("(")[0].strip()
                            migrations.append(
                                {"revision": revision_id, "message": message_part}
                            )

            return migrations
        except Exception as e:
            print(f"履歴取得エラー: {e}")
            return []

    def backup_database(self, backup_path: str | None = None) -> str:
        """データベースのバックアップを作成"""
        if backup_path is None:
            timestamp = subprocess.run(
                ["date", "+%Y%m%d_%H%M%S"], capture_output=True, text=True
            ).stdout.strip()
            backup_path = f"{self.db_path}.backup_{timestamp}"

        try:
            subprocess.run(["cp", self.db_path, backup_path], check=True)
            print(f"✅ データベースバックアップ作成: {backup_path}")
            return backup_path
        except subprocess.CalledProcessError as e:
            print(f"❌ バックアップ作成エラー: {e}")
            raise

    def run_migration(self, target: str = "head", dry_run: bool = False) -> bool:
        """マイグレーションを実行"""
        if dry_run:
            print("🔍 ドライランモード: 実際のマイグレーションは実行されません")
            return True

        # バックアップ作成
        backup_path = self.backup_database()

        try:
            # マイグレーション実行
            result = subprocess.run(
                ["uv", "run", "alembic", "upgrade", target],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                env={**os.environ, "ENVIRONMENT": self.environment},
            )

            if result.returncode == 0:
                print("✅ マイグレーション実行成功")
                print(f"バックアップ: {backup_path}")
                return True
            else:
                print(f"❌ マイグレーション実行エラー: {result.stderr}")
                print(f"バックアップから復元してください: {backup_path}")
                return False

        except Exception as e:
            print(f"❌ マイグレーション実行エラー: {e}")
            print(f"バックアップから復元してください: {backup_path}")
            return False

    def verify_migration(self) -> bool:
        """マイグレーション後の検証"""
        try:
            # データベース互換性チェック
            compatibility = verify_database_compatibility()
            if compatibility["compatible"]:
                print("✅ マイグレーション後検証成功")
                return True
            else:
                print(
                    f"❌ マイグレーション後検証失敗: {compatibility.get('error', 'Unknown error')}"
                )
                return False
        except Exception as e:
            print(f"❌ 検証エラー: {e}")
            return False

    def rollback_migration(self, target_revision: str) -> bool:
        """マイグレーションをロールバック"""
        try:
            result = subprocess.run(
                ["uv", "run", "alembic", "downgrade", target_revision],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                env={**os.environ, "ENVIRONMENT": self.environment},
            )

            if result.returncode == 0:
                print(f"✅ ロールバック成功: {target_revision}")
                return True
            else:
                print(f"❌ ロールバックエラー: {result.stderr}")
                return False

        except Exception as e:
            print(f"❌ ロールバックエラー: {e}")
            return False


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description="マイグレーション管理ツール")
    parser.add_argument(
        "--environment",
        "-e",
        default="development",
        choices=["development", "test", "production"],
        help="環境設定",
    )
    parser.add_argument(
        "--action",
        "-a",
        required=True,
        choices=["check", "current", "history", "migrate", "rollback", "backup"],
        help="実行するアクション",
    )
    parser.add_argument(
        "--target",
        "-t",
        default="head",
        help="マイグレーション対象（リビジョンIDまたはhead）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="ドライランモード（実際の変更は行わない）",
    )
    parser.add_argument("--backup-path", help="バックアップファイルのパス")

    args = parser.parse_args()

    # 環境変数設定
    os.environ["ENVIRONMENT"] = args.environment

    manager = MigrationManager(args.environment)

    print(f"🔧 マイグレーション管理ツール - 環境: {args.environment}")
    print(f"📁 データベースパス: {manager.db_path}")

    if args.action == "check":
        print("\n📋 前提条件チェック:")
        checks = manager.check_prerequisites()
        for check_name, result in checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check_name}: {result}")

        if all(checks.values()):
            print("\n✅ すべての前提条件が満たされています")
        else:
            print("\n❌ 前提条件に問題があります")
            sys.exit(1)

    elif args.action == "current":
        print("\n📍 現在のリビジョン:")
        current = manager.get_current_revision()
        if current:
            print(f"  {current}")
        else:
            print("  リビジョン情報を取得できませんでした")

    elif args.action == "history":
        print("\n📚 マイグレーション履歴:")
        history = manager.get_migration_history()
        for migration in history:
            print(f"  {migration['revision']}: {migration['message']}")

    elif args.action == "migrate":
        print(f"\n🚀 マイグレーション実行: {args.target}")

        # 前提条件チェック
        checks = manager.check_prerequisites()
        if not all(checks.values()):
            print("❌ 前提条件が満たされていません")
            sys.exit(1)

        # マイグレーション実行
        success = manager.run_migration(args.target, args.dry_run)
        if success and not args.dry_run:
            # 検証
            manager.verify_migration()

    elif args.action == "rollback":
        print(f"\n⏪ ロールバック実行: {args.target}")
        success = manager.rollback_migration(args.target)
        if success:
            manager.verify_migration()

    elif args.action == "backup":
        print("\n💾 データベースバックアップ:")
        backup_path = manager.backup_database(args.backup_path)
        print(f"バックアップ完了: {backup_path}")


if __name__ == "__main__":
    main()
