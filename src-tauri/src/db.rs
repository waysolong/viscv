//! rusqlite 本地持久化：projects / presets / notes / settings。
//! 每条记录存 JSON 文本，便于演进 schema。

use rusqlite::{params, Connection};
use serde::{de::DeserializeOwned, Serialize};
use std::path::Path;

pub fn open_and_init(dir: &Path) -> rusqlite::Result<Connection> {
    std::fs::create_dir_all(dir)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
    let conn = Connection::open(dir.join("viscv.db"))?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS presets  (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS notes    (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    )?;
    Ok(conn)
}

pub fn list<T: DeserializeOwned>(conn: &Connection, table: &str) -> Result<Vec<T>, String> {
    let sql = format!("SELECT data FROM {}", table);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        let json = r.map_err(|e| e.to_string())?;
        out.push(serde_json::from_str(&json).map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn upsert<T: Serialize>(
    conn: &Connection,
    table: &str,
    id: &str,
    value: &T,
) -> Result<(), String> {
    let sql = format!(
        "INSERT INTO {} (id, data) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        table
    );
    let data = serde_json::to_string(value).map_err(|e| e.to_string())?;
    conn.execute(&sql, params![id, data])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete(conn: &Connection, table: &str, id: &str) -> Result<(), String> {
    let sql = format!("DELETE FROM {} WHERE id = ?1", table);
    conn.execute(&sql, params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_setting<T: DeserializeOwned>(conn: &Connection, key: &str, default: T) -> T {
    let res: rusqlite::Result<String> = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match res {
        Ok(v) => serde_json::from_str(&v).unwrap_or(default),
        Err(_) => default,
    }
}

pub fn set_setting<T: Serialize>(conn: &Connection, key: &str, value: &T) -> Result<(), String> {
    let json = serde_json::to_string(value).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AppSettings, Preset};

    #[test]
    fn preset_round_trip() {
        let dir = std::env::temp_dir().join(format!("viscv_db_test_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let conn = open_and_init(&dir).unwrap();
        let p = Preset {
            id: "p1".into(),
            name: "preset".into(),
            steps: vec![],
            created_at: 1,
        };
        upsert(&conn, "presets", &p.id, &p).unwrap();
        let items: Vec<Preset> = list(&conn, "presets").unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "p1");
        delete(&conn, "presets", &p.id).unwrap();
        let list2: Vec<Preset> = list(&conn, "presets").unwrap();
        assert_eq!(list2.len(), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn settings_round_trip() {
        let dir = std::env::temp_dir().join(format!("viscv_db_cfg_{}", std::process::id()));
        let conn = open_and_init(&dir).unwrap();
        set_setting(
            &conn,
            "app",
            &AppSettings {
                theme: "dark".into(),
                update_url: "u".into(),
                check_on_start: true,
            },
        )
        .unwrap();
        let s2: AppSettings = get_setting(
            &conn,
            "app",
            AppSettings {
                theme: "light".into(),
                update_url: "".into(),
                check_on_start: false,
            },
        );
        assert_eq!(s2.theme, "dark");
        assert!(s2.check_on_start);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
