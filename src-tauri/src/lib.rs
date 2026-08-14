mod commands;
mod engine;
mod models;

use std::sync::Mutex;
use tauri::Manager;

use engine::Engine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let port: u16 = std::env::var("VISCV_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(engine::DEFAULT_PORT);
            let mut engine = Engine::new(dir, port);
            if let Err(e) = engine.start() {
                eprintln!("[viscv] 图像引擎启动失败：{}", e);
            }
            app.manage(Mutex::new(engine));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::default_image_path,
            commands::load_image,
            commands::process_pipeline,
            commands::export_image,
            commands::list_projects,
            commands::save_project,
            commands::delete_project,
            commands::list_presets,
            commands::save_preset,
            commands::delete_preset,
            commands::list_notes,
            commands::save_note,
            commands::delete_note,
            commands::get_settings,
            commands::save_settings,
            commands::check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ViSCV");
}
