#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script for RelayPACS

This script helps migrate data from SQLite to PostgreSQL database.
It supports export, import, and verification operations.
"""

import argparse
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import psycopg2


class DatabaseMigrator:
    def __init__(self, sqlite_path: str, postgres_conn_str: str):
        self.sqlite_path = Path(sqlite_path)
        self.postgres_conn_str = postgres_conn_str

        if not self.sqlite_path.exists():
            raise FileNotFoundError(f"SQLite database not found: {sqlite_path}")

    def export_sqlite_to_sql(self, output_file: str) -> None:
        """Export SQLite database to SQL file."""
        print(f"Exporting SQLite database from {self.sqlite_path}...")

        try:
            # Connect to SQLite
            sqlite_conn = sqlite3.connect(self.sqlite_path)
            sqlite_cursor = sqlite_conn.cursor()

            # Get all tables
            sqlite_cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row[0] for row in sqlite_cursor.fetchall()]

            print(f"Found {len(tables)} tables: {', '.join(tables)}")

            # Create output file
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w") as f:
                f.write("-- SQLite to PostgreSQL Export\n")
                f.write(f"-- Generated: {datetime.now().isoformat()}\n")
                f.write(f"-- Source: {self.sqlite_path}\n\n")

                for table in tables:
                    print(f"  Exporting table: {table}")

                    # Get column info
                    sqlite_cursor.execute(f"PRAGMA table_info({table})")
                    columns = [row[1] for row in sqlite_cursor.fetchall()]

                    # Get all rows
                    sqlite_cursor.execute(f"SELECT * FROM {table}")
                    rows = sqlite_cursor.fetchall()

                    if not rows:
                        f.write(f"-- Table {table} is empty\n\n")
                        continue

                    f.write(f"-- Table: {table} ({len(rows)} rows)\n")
                    f.write("BEGIN;\n")

                    for row in rows:
                        # Prepare values
                        values = []
                        for val in row:
                            if val is None:
                                values.append("NULL")
                            elif isinstance(val, (int, float)):
                                values.append(str(val))
                            elif isinstance(val, bool):
                                values.append("TRUE" if val else "FALSE")
                            else:
                                # Escape single quotes
                                escaped = str(val).replace("'", "''")
                                values.append(f"'{escaped}'")

                        cols_str = ", ".join(columns)
                        vals_str = ", ".join(values)
                        f.write(f"INSERT INTO {table} ({cols_str}) VALUES ({vals_str});\n")

                    f.write("COMMIT;\n\n")

            sqlite_conn.close()
            print(f"✓ Export completed: {output_path}")
            print(f"  File size: {output_path.stat().st_size / 1024:.2f} KB")

        except Exception as e:
            print(f"✗ Export failed: {e}")
            sys.exit(1)

    def import_sql_to_postgres(self, sql_file: str) -> None:
        """Import SQL file into PostgreSQL."""
        print("Importing data into PostgreSQL...")

        sql_path = Path(sql_file)
        if not sql_path.exists():
            raise FileNotFoundError(f"SQL file not found: {sql_file}")

        try:
            # Connect to PostgreSQL
            pg_conn = psycopg2.connect(self.postgres_conn_str)
            pg_cursor = pg_conn.cursor()

            # Read SQL file
            with open(sql_path) as f:
                sql_content = f.read()

            # Execute SQL (split by semicolon and filter out comments)
            statements = [
                stmt.strip()
                for stmt in sql_content.split(";")
                if stmt.strip() and not stmt.strip().startswith("--")
            ]

            print(f"Executing {len(statements)} SQL statements...")

            for i, stmt in enumerate(statements, 1):
                if i % 100 == 0:
                    print(f"  Progress: {i}/{len(statements)} statements")

                try:
                    pg_cursor.execute(stmt)
                except Exception as e:
                    print(f"  Warning: Statement {i} failed: {e}")
                    print(f"  Statement: {stmt[:100]}...")
                    # Continue with other statements

            pg_conn.commit()
            pg_cursor.close()
            pg_conn.close()

            print("✓ Import completed successfully")

        except Exception as e:
            print(f"✗ Import failed: {e}")
            sys.exit(1)

    def verify_migration(self) -> None:
        """Verify that migration was successful by comparing record counts."""
        print("Verifying migration...")

        try:
            # Connect to both databases
            sqlite_conn = sqlite3.connect(self.sqlite_path)
            sqlite_cursor = sqlite_conn.cursor()

            pg_conn = psycopg2.connect(self.postgres_conn_str)
            pg_cursor = pg_conn.cursor()

            # Get tables from SQLite
            sqlite_cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row[0] for row in sqlite_cursor.fetchall()]

            print(f"\nVerifying {len(tables)} tables:\n")
            print(f"{'Table':<30} {'SQLite':<15} {'PostgreSQL':<15} {'Status'}")
            print("-" * 75)

            all_match = True

            for table in tables:
                # Get SQLite count
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                sqlite_count = sqlite_cursor.fetchone()[0]

                # Get PostgreSQL count
                pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                pg_count = pg_cursor.fetchone()[0]

                # Compare
                status = "✓ Match" if sqlite_count == pg_count else "✗ Mismatch"
                if sqlite_count != pg_count:
                    all_match = False

                print(f"{table:<30} {sqlite_count:<15} {pg_count:<15} {status}")

            sqlite_conn.close()
            pg_conn.close()

            print("-" * 75)
            if all_match:
                print("\n✓ Verification passed: All table counts match")
            else:
                print("\n✗ Verification failed: Some table counts don't match")
                sys.exit(1)

        except Exception as e:
            print(f"✗ Verification failed: {e}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Migrate RelayPACS data from SQLite to PostgreSQL")
    parser.add_argument(
        "--sqlite",
        default="backend/relaypacs.db",
        help="Path to SQLite database (default: backend/relaypacs.db)",
    )
    parser.add_argument(
        "--postgres",
        default="postgresql://relaypacs:relaypacs@localhost:5433/relaypacs",
        help="PostgreSQL connection string",
    )

    # Operation selection (mutually exclusive)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument(
        "--export", action="store_true", help="Export SQLite database to SQL file"
    )
    operation.add_argument("--import", metavar="SQL_FILE", help="Import SQL file into PostgreSQL")
    operation.add_argument(
        "--verify", action="store_true", help="Verify migration by comparing record counts"
    )
    operation.add_argument(
        "--full", action="store_true", help="Run full migration: export, import, and verify"
    )

    args = parser.parse_args()

    # Initialize migrator
    migrator = DatabaseMigrator(args.sqlite, args.postgres)

    # Execute requested operation
    if args.export:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"backups/sqlite_export_{timestamp}.sql"
        migrator.export_sqlite_to_sql(output_file)

    elif args.import_:
        migrator.import_sql_to_postgres(args.import_)

    elif args.verify:
        migrator.verify_migration()

    elif args.full:
        # Full migration workflow
        print("Starting full migration workflow...\n")

        # Step 1: Export
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_file = f"backups/sqlite_export_{timestamp}.sql"
        migrator.export_sqlite_to_sql(export_file)

        print("\n" + "=" * 75 + "\n")

        # Step 2: Import
        migrator.import_sql_to_postgres(export_file)

        print("\n" + "=" * 75 + "\n")

        # Step 3: Verify
        migrator.verify_migration()

        print("\n✓ Full migration completed successfully!")


if __name__ == "__main__":
    main()
