use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::{DynamicImage, ImageFormat, RgbImage};
use std::path::PathBuf;
use tauri::State;

use crate::db;
use crate::enhance;
use crate::histogram;
use crate::models::{AppSettings, ImageInfo, Note, Preset, Project, Step, UpdateInfo};

pub const DEFAULT_UPDATE_URL: &str = "https://example.com/viscv/latest.json";

/// 应用状态：本地数据目录。
pub struct Db(pub PathBuf);

impl Db {
    fn open(&self) -> Result<rusqlite::Connection, String> {
        db::open_and_init(&self.0).map_err(|e| e.to_string())
    }
}

fn encode_png(img: &RgbImage) -> Result<String, String> {
    let dynimg = DynamicImage::ImageRgb8(img.clone());
    let mut buf = std::io::Cursor::new(Vec::new());
    dynimg
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(buf.into_inner())
    ))
}

fn build_info(img: RgbImage) -> Result<ImageInfo, String> {
    Ok(ImageInfo {
        data_url: encode_png(&img)?,
        width: img.width(),
        height: img.height(),
        histograms: histogram::compute(&img),
    })
}

fn decode(path: &str) -> Result<RgbImage, String> {
    Ok(image::open(path)
        .map_err(|e| format!("无法打开图像（{}）：{}", path, e))?
        .to_rgb8())
}

// ---------- 图像处理 ----------

#[tauri::command]
pub fn load_image(path: String) -> Result<ImageInfo, String> {
    eprintln!("[viscv] load_image path={}", path);
    match decode(&path).and_then(build_info) {
        Ok(i) => Ok(i),
        Err(e) => {
            eprintln!("[viscv] load_image ERROR: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub fn process_pipeline(path: String, steps: Vec<Step>) -> Result<ImageInfo, String> {
    eprintln!("[viscv] process_pipeline path={} steps={}", path, steps.len());
    let img = match decode(&path) {
        Ok(i) => i,
        Err(e) => { eprintln!("[viscv] process_pipeline decode ERROR: {}", e); return Err(e); }
    };
    let result = enhance::run_pipeline(&img, &steps);
    build_info(result)
}

#[tauri::command]
pub fn export_image(path: String, steps: Vec<Step>, out_path: String) -> Result<bool, String> {
    let img = decode(&path)?;
    let result = enhance::run_pipeline(&img, &steps);
    DynamicImage::ImageRgb8(result)
        .save_with_format(&out_path, ImageFormat::Png)
        .map_err(|e| format!("导出失败: {e}"))?;
    Ok(true)
}

// ---------- 项目 ----------

#[tauri::command]
pub fn list_projects(db: State<'_, Db>) -> Result<Vec<Project>, String> {
    let conn = db.open()?;
    db::list(&conn, "projects")
}

#[tauri::command]
pub fn save_project(project: Project, db: State<'_, Db>) -> Result<Project, String> {
    let conn = db.open()?;
    db::upsert(&conn, "projects", &project.id, &project)?;
    Ok(project)
}

#[tauri::command]
pub fn delete_project(id: String, db: State<'_, Db>) -> Result<(), String> {
    let conn = db.open()?;
    db::delete(&conn, "projects", &id)
}

// ---------- 预设 ----------

#[tauri::command]
pub fn list_presets(db: State<'_, Db>) -> Result<Vec<Preset>, String> {
    let conn = db.open()?;
    db::list(&conn, "presets")
}

#[tauri::command]
pub fn save_preset(preset: Preset, db: State<'_, Db>) -> Result<Preset, String> {
    let conn = db.open()?;
    db::upsert(&conn, "presets", &preset.id, &preset)?;
    Ok(preset)
}

#[tauri::command]
pub fn delete_preset(id: String, db: State<'_, Db>) -> Result<(), String> {
    let conn = db.open()?;
    db::delete(&conn, "presets", &id)
}

// ---------- 笔记 ----------

#[tauri::command]
pub fn list_notes(db: State<'_, Db>) -> Result<Vec<Note>, String> {
    let conn = db.open()?;
    db::list(&conn, "notes")
}

#[tauri::command]
pub fn save_note(note: Note, db: State<'_, Db>) -> Result<Note, String> {
    let conn = db.open()?;
    db::upsert(&conn, "notes", &note.id, &note)?;
    Ok(note)
}

#[tauri::command]
pub fn delete_note(id: String, db: State<'_, Db>) -> Result<(), String> {
    let conn = db.open()?;
    db::delete(&conn, "notes", &id)
}

// ---------- 设置 ----------

#[tauri::command]
pub fn get_settings(db: State<'_, Db>) -> Result<AppSettings, String> {
    let conn = db.open()?;
    let s = db::get_setting(
        &conn,
        "app",
        AppSettings {
            theme: "light".to_string(),
            update_url: DEFAULT_UPDATE_URL.to_string(),
            check_on_start: false,
        },
    );
    Ok(s)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, db: State<'_, Db>) -> Result<AppSettings, String> {
    let conn = db.open()?;
    db::set_setting(&conn, "app", &settings)?;
    Ok(settings)
}

// ---------- 更新检查（reqwest） ----------

#[tauri::command]
pub async fn check_update(db: State<'_, Db>) -> Result<UpdateInfo, String> {
    let conn = db.open()?;
    let s = db::get_setting(
        &conn,
        "app",
        AppSettings {
            theme: "light".to_string(),
            update_url: DEFAULT_UPDATE_URL.to_string(),
            check_on_start: false,
        },
    );
    let current = env!("CARGO_PKG_VERSION").to_string();
    let client = reqwest::Client::new();
    let no_update = UpdateInfo {
        current: current.clone(),
        latest: current.clone(),
        update_available: false,
        message: "更新源不可用，已是最新版本".to_string(),
    };
    let resp = match client.get(&s.update_url).send().await {
        Ok(r) if r.status().is_success() => r,
        _ => return Ok(no_update),
    };
    let json: serde_json::Value = match resp.json().await {
        Ok(v) => v,
        Err(_) => return Ok(no_update),
    };
    let latest = json
        .get("version")
        .or_else(|| json.get("latest"))
        .and_then(|v| v.as_str())
        .unwrap_or(&current)
        .to_string();
    Ok(UpdateInfo {
        update_available: latest != current,
        message: if latest != current {
            "发现新版本，请从官网下载".to_string()
        } else {
            "已是最新版本".to_string()
        },
        current,
        latest,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgb;

    #[test]
    fn image_info_serializes_camel_case_data_url() {
        let img = RgbImage::from_fn(2, 2, |x, y| Rgb([x as u8 * 100, y as u8 * 100, 128]));
        let info = build_info(img).unwrap();
        let json = serde_json::to_value(&info).unwrap();
        // 前端契约是 camelCase 的 dataUrl
        assert!(json.get("dataUrl").is_some());
        assert!(json.get("data_url").is_none());
        let s = json["dataUrl"].as_str().unwrap();
        assert!(s.starts_with("data:image/png;base64,"));
        let hist = json["histograms"].as_object().unwrap();
        assert!(hist.contains_key("gray"));
    }

    #[test]
    fn pipeline_end_to_end_round_trip() {
        let img = RgbImage::from_fn(4, 4, |_, _| Rgb([10, 10, 10]));
        let mut buf = std::io::Cursor::new(Vec::new());
        DynamicImage::ImageRgb8(img).write_to(&mut buf, ImageFormat::Png).unwrap();
        let tmp = std::env::temp_dir().join(format!("viscv_e2e_{}.png", std::process::id()));
        std::fs::write(&tmp, buf.into_inner()).unwrap();
        let decoded = decode(tmp.to_str().unwrap()).unwrap();
        let mut m = std::collections::HashMap::new();
        m.insert("value".into(), serde_json::Value::from(100.0));
        let step = Step { id: "s".into(), kind: "brightness".into(), enabled: true, params: m };
        let out = enhance::run_pipeline(&decoded, &[step]);
        let info = build_info(out).unwrap();
        assert_eq!(info.width, 4);
        assert_eq!(info.height, 4);
        let _ = std::fs::remove_file(&tmp);
    }
}