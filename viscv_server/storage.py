"""sqlite3 本地持久化：projects / presets / notes / settings（JSON 落库）。"""
from __future__ import annotations

import json
import os
import sqlite3
from typing import Any, Dict, List

TABLES = ("projects", "presets", "notes")


def _db_path() -> str:
    data_dir = os.environ.get("VISCV_DATA_DIR") or "."
    return os.path.join(data_dir, "viscv.db")


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(_db_path())), exist_ok=True)
    conn = sqlite3.connect(_db_path())
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS presets (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    )
    conn.commit()
    return conn


def _table(name: str) -> str:
    if name not in TABLES:
        raise ValueError(f"unknown table: {name}")
    return name


def list_items(name: str) -> List[Dict[str, Any]]:
    table = _table(name)
    conn = _connect()
    try:
        rows = conn.execute(f"SELECT data FROM {table}").fetchall()
        return [json.loads(r[0]) for r in rows]
    finally:
        conn.close()


def upsert(name: str, item_id: str, obj: Dict[str, Any]) -> None:
    table = _table(name)
    conn = _connect()
    try:
        conn.execute(
            f"INSERT INTO {table} (id, data) VALUES (?, ?) "
            f"ON CONFLICT(id) DO UPDATE SET data = excluded.data",
            (item_id, json.dumps(obj, ensure_ascii=False)),
        )
        conn.commit()
    finally:
        conn.close()


def delete(name: str, item_id: str) -> None:
    table = _table(name)
    conn = _connect()
    try:
        conn.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def get_setting(key: str, default: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    try:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return json.loads(row[0]) if row else dict(default)
    finally:
        conn.close()


def set_setting(key: str, value: Dict[str, Any]) -> None:
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )
        conn.commit()
    finally:
        conn.close()