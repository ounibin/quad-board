use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;

use crate::store::{now_ms, AppState, Db, Settings, Task};

fn next_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static SEQ: AtomicU64 = AtomicU64::new(0);
    format!("t{}-{}", now_ms(), SEQ.fetch_add(1, Ordering::SeqCst))
}

#[tauri::command]
pub fn load_db(state: State<'_, AppState>) -> Db {
    state.db.lock().map(|d| d.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn save_tasks(state: State<'_, AppState>, tasks: Vec<Task>) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    db.tasks = tasks;
    db.save(&state.path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    db.settings = settings;
    db.save(&state.path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_task(
    app: AppHandle,
    state: State<'_, AppState>,
    title: String,
    quadrant: Option<u8>,
) -> Result<Task, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("标题不能为空".into());
    }
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let q = quadrant.unwrap_or(db.settings.quick_add_quadrant).clamp(1, 4);
    let order = db
        .tasks
        .iter()
        .filter(|t| t.quadrant == q)
        .map(|t| t.order)
        .max()
        .unwrap_or(-1)
        + 1;
    let now = now_ms();
    let task = Task {
        id: next_id(),
        title,
        note: String::new(),
        quadrant: q,
        due_at: None,
        remind_at: None,
        done: false,
        done_at: None,
        created_at: now,
        updated_at: now,
        order,
        notified: false,
    };
    db.tasks.push(task.clone());
    db.save(&state.path).map_err(|e| e.to_string())?;
    drop(db);
    let _ = app.emit("tasks-changed", ());
    Ok(task)
}

#[tauri::command]
pub fn data_dir(state: State<'_, AppState>) -> String {
    state
        .path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub fn reveal_data_dir(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let dir = state
        .path
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "数据目录不可用".to_string())?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    let _ = app;
    Ok(())
}

#[tauri::command]
pub fn hide_quick_add(app: AppHandle) {
    if let Some(w) = app.get_webview_window("quick-add") {
        let _ = w.hide();
    }
}

#[tauri::command]
pub fn show_main(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let al = app.autolaunch();
    let res = if enabled { al.enable() } else { al.disable() };
    res.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn autostart_enabled(app: AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn notify_test(app: AppHandle) {
    let _ = app
        .notification()
        .builder()
        .title("Quad Board")
        .body("通知工作正常，任务到期会这样提醒你。")
        .show();
}
