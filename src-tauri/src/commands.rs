//! Tauri 命令层：把前端的 invoke 原样转发给 Python(OpenCV) sidecar，保持接口与返回值形状不变。
//! 所有涉及引擎的调用都在后台线程池执行，避免阻塞 UI 主线程。
use std::sync::{Arc, Mutex};
use serde_json::{json, Value};
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

async fn run_blocking<T: Send + 'static>(
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("后台任务失败: {e}"))?
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
pub async fn load_image(engine: State<'_, Arc<Mutex<Engine>>>, path: String) -> Result<ImageInfo, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "load_image", json!({"path": path}))).await
}

#[tauri::command]
pub async fn process_pipeline(engine: State<'_, Arc<Mutex<Engine>>>, path: String, steps: Vec<Step>) -> Result<ImageInfo, String> {
    let e = engine.inner().clone();
    run_blocking(move || {
        forward(
            &mut e.lock().unwrap(),
            "process_pipeline",
            json!({"path": path, "steps": steps}),
        )
    })
    .await
}

#[tauri::command]
pub async fn export_image(engine: State<'_, Arc<Mutex<Engine>>>, path: String, steps: Vec<Step>, out_path: String) -> Result<bool, String> {
    let e = engine.inner().clone();
    run_blocking(move || {
        forward(
            &mut e.lock().unwrap(),
            "export_image",
            json!({"path": path, "steps": steps, "outPath": out_path}),
        )
    })
    .await
}

// ---------- 项目 ----------

#[tauri::command]
pub async fn list_projects(engine: State<'_, Arc<Mutex<Engine>>>) -> Result<Vec<Project>, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "list_projects", json!({}))).await
}

#[tauri::command]
pub async fn save_project(engine: State<'_, Arc<Mutex<Engine>>>, project: Project) -> Result<Project, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "save_project", json!({"project": project}))).await
}

#[tauri::command]
pub async fn delete_project(engine: State<'_, Arc<Mutex<Engine>>>, id: String) -> Result<(), String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "delete_project", json!({"id": id}))).await
}

// ---------- 预设 ----------

#[tauri::command]
pub async fn list_presets(engine: State<'_, Arc<Mutex<Engine>>>) -> Result<Vec<Preset>, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "list_presets", json!({}))).await
}

#[tauri::command]
pub async fn save_preset(engine: State<'_, Arc<Mutex<Engine>>>, preset: Preset) -> Result<Preset, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "save_preset", json!({"preset": preset}))).await
}

#[tauri::command]
pub async fn delete_preset(engine: State<'_, Arc<Mutex<Engine>>>, id: String) -> Result<(), String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "delete_preset", json!({"id": id}))).await
}

// ---------- 笔记 ----------

#[tauri::command]
pub async fn list_notes(engine: State<'_, Arc<Mutex<Engine>>>) -> Result<Vec<Note>, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "list_notes", json!({}))).await
}

#[tauri::command]
pub async fn save_note(engine: State<'_, Arc<Mutex<Engine>>>, note: Note) -> Result<Note, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "save_note", json!({"note": note}))).await
}

#[tauri::command]
pub async fn delete_note(engine: State<'_, Arc<Mutex<Engine>>>, id: String) -> Result<(), String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "delete_note", json!({"id": id}))).await
}

// ---------- 设置 / 更新 ----------

#[tauri::command]
pub async fn get_settings(engine: State<'_, Arc<Mutex<Engine>>>) -> Result<AppSettings, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "get_settings", json!({}))).await
}

#[tauri::command]
pub async fn save_settings(engine: State<'_, Arc<Mutex<Engine>>>, settings: AppSettings) -> Result<AppSettings, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "save_settings", json!({"settings": settings}))).await
}

#[tauri::command]
pub async fn check_update(engine: State<'_, Arc<Mutex<Engine>>>) -> Result<UpdateInfo, String> {
    let e = engine.inner().clone();
    run_blocking(move || forward(&mut e.lock().unwrap(), "check_update", json!({}))).await
}