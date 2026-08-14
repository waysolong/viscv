mod commands;
mod db;
mod enhance;
mod histogram;
mod models;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            app.manage(commands::Db(dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
