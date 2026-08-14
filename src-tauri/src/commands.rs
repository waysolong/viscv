//! Tauri 命令层：把前端的 invoke 原样转发给 Python(OpenCV) sidecar，保持接口与返回值形状不变。
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::engine::Engine;
use crate::models::{AppSettings, ImageInfo, Note, Preset, Project, Step, UpdateInfo};

fn forward<T: serde::de::DeserializeOwned>(
    engine: &mut Engine,
    command: &str,
    args: Value,
) -> Result<T, String> {
    let data = engine.rpc(command, args)?;
    serde_json::from_value(data).map_err(|e| format!("引擎返回结构不符: {e}"))
}

/// 返回内置示例图路径（dev 用源码目录，打包后用 Tauri 资源目录）。
#[tauri::command]
pub fn default_image_path(app: AppHandle) -> Result<String, String> {
    let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/lenna.png");
    if manifest.exists() {
        return Ok(manifest.to_string_lossy().to_string());
    }
    let dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    for c in [dir.join("lenna.png"), dir.join("resources/lenna.png")] {
        if c.exists() {
            return Ok(c.to_string_lossy().to_string());
        }
    }
    Err("找不到内置示例图 lenna.png".to_string())
}

// ---------- 图像 ----------

#[tauri::command]
pub fn load_image(engine: State<'_, Mutex<Engine>>, path: String) -> Result<ImageInfo, String> {
    forward(
        &mut engine.lock().unwrap(),
        "load_image",
        json!({"path": path}),
    )
}

#[tauri::command]
pub fn process_pipeline(
    engine: State<'_, Mutex<Engine>>,
    path: String,
    steps: Vec<Step>,
) -> Result<ImageInfo, String> {
    forward(
        &mut engine.lock().unwrap(),
        "process_pipeline",
        json!({"path": path, "steps": steps}),
    )
}

#[tauri::command]
pub fn export_image(
    engine: State<'_, Mutex<Engine>>,
    path: String,
    steps: Vec<Step>,
    out_path: String,
) -> Result<bool, String> {
    forward(
        &mut engine.lock().unwrap(),
        "export_image",
        json!({"path": path, "steps": steps, "outPath": out_path}),
    )
}

// ---------- 项目 ----------

#[tauri::command]
pub fn list_projects(engine: State<'_, Mutex<Engine>>) -> Result<Vec<Project>, String> {
    forward(&mut engine.lock().unwrap(), "list_projects", json!({}))
}

#[tauri::command]
pub fn save_project(engine: State<'_, Mutex<Engine>>, project: Project) -> Result<Project, String> {
    forward(
        &mut engine.lock().unwrap(),
        "save_project",
        json!({"project": project}),
    )
}

#[tauri::command]
pub fn delete_project(engine: State<'_, Mutex<Engine>>, id: String) -> Result<(), String> {
    forward(
        &mut engine.lock().unwrap(),
        "delete_project",
        json!({"id": id}),
    )
}

// ---------- 预设 ----------

#[tauri::command]
pub fn list_presets(engine: State<'_, Mutex<Engine>>) -> Result<Vec<Preset>, String> {
    forward(&mut engine.lock().unwrap(), "list_presets", json!({}))
}

#[tauri::command]
pub fn save_preset(engine: State<'_, Mutex<Engine>>, preset: Preset) -> Result<Preset, String> {
    forward(
        &mut engine.lock().unwrap(),
        "save_preset",
        json!({"preset": preset}),
    )
}

#[tauri::command]
pub fn delete_preset(engine: State<'_, Mutex<Engine>>, id: String) -> Result<(), String> {
    forward(
        &mut engine.lock().unwrap(),
        "delete_preset",
        json!({"id": id}),
    )
}

// ---------- 笔记 ----------

#[tauri::command]
pub fn list_notes(engine: State<'_, Mutex<Engine>>) -> Result<Vec<Note>, String> {
    forward(&mut engine.lock().unwrap(), "list_notes", json!({}))
}

#[tauri::command]
pub fn save_note(engine: State<'_, Mutex<Engine>>, note: Note) -> Result<Note, String> {
    forward(
        &mut engine.lock().unwrap(),
        "save_note",
        json!({"note": note}),
    )
}

#[tauri::command]
pub fn delete_note(engine: State<'_, Mutex<Engine>>, id: String) -> Result<(), String> {
    forward(
        &mut engine.lock().unwrap(),
        "delete_note",
        json!({"id": id}),
    )
}

// ---------- 设置 / 更新 ----------

#[tauri::command]
pub fn get_settings(engine: State<'_, Mutex<Engine>>) -> Result<AppSettings, String> {
    forward(&mut engine.lock().unwrap(), "get_settings", json!({}))
}

#[tauri::command]
pub fn save_settings(
    engine: State<'_, Mutex<Engine>>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    forward(
        &mut engine.lock().unwrap(),
        "save_settings",
        json!({"settings": settings}),
    )
}

#[tauri::command]
pub fn check_update(engine: State<'_, Mutex<Engine>>) -> Result<UpdateInfo, String> {
    forward(&mut engine.lock().unwrap(), "check_update", json!({}))
}
