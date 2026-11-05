mod commands;
mod store;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

use store::{now_ms, AppState, Task, WindowGeom};

pub static QUITTING: AtomicBool = AtomicBool::new(false);

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn toggle_quick_add(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("quick-add") {
        let focused = w.is_focused().unwrap_or(false);
        let visible = w.is_visible().unwrap_or(false);
        if visible && focused {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
            let _ = w.emit("quick-add-shown", ());
        }
        return;
    }
    if let Ok(win) = WebviewWindowBuilder::new(app, "quick-add", WebviewUrl::App("quick.html".into()))
        .title("快速添加")
        .inner_size(560.0, 150.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .center()
        .focused(true)
        .build()
    {
        let _ = win.set_focus();
    }
}

fn store_geometry(window: &tauri::Window) {
    let state = window.state::<AppState>();
    let pos = window.outer_position();
    let size = window.outer_size();
    if let (Ok(p), Ok(s)) = (pos, size) {
        if let Ok(mut db) = state.db.lock() {
            db.window_state = Some(WindowGeom {
                x: p.x,
                y: p.y,
                width: s.width,
                height: s.height,
            });
        }
    }
}

fn persist(app: &AppHandle) {
    let state = app.state::<AppState>();
    let saved = state.db.lock().map(|db| db.save(&state.path));
    if let Ok(Err(e)) = saved {
        eprintln!("persist failed: {e}");
    }
}

fn check_reminders(app: &AppHandle) {
    let state = app.state::<AppState>();
    let mut due: Vec<Task> = Vec::new();
    let mut changed = false;
    if let Ok(mut db) = state.db.lock() {
        let now = now_ms();
        for t in db.tasks.iter_mut() {
            if !t.done && !t.notified {
                if let Some(at) = t.remind_at {
                    if at <= now {
                        t.notified = true;
                        due.push(t.clone());
                        changed = true;
                    }
                }
            }
        }
        if changed {
            let _ = db.save(&state.path);
        }
    }
    for t in &due {
        let body = if t.note.trim().is_empty() {
            "该处理这件事了".to_string()
        } else {
            t.note.chars().take(80).collect::<String>()
        };
        let _ = app
            .notification()
            .builder()
            .title(format!("Quad Board · {}", t.title))
            .body(body)
            .show();
    }
    if changed {
        let _ = app.emit("tasks-changed", ());
    }
    let _ = app.emit("tick", now_ms());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let path = dir.join("quad-board-data.json");
            app.manage(AppState::new(path));

            {
                let state = app.state::<AppState>();
                let geom = state
                    .db
                    .lock()
                    .ok()
                    .and_then(|d| d.window_state.clone());
                if let Some(g) = geom {
                    if g.width >= 700 && g.height >= 500 && g.x > -5000 && g.y > -5000 {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.set_size(PhysicalSize::new(g.width, g.height));
                            let _ = w.set_position(PhysicalPosition::new(g.x, g.y));
                        }
                    }
                }
            }

            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };
                let mods = if cfg!(target_os = "macos") {
                    Modifiers::SUPER | Modifiers::SHIFT
                } else {
                    Modifiers::CONTROL | Modifiers::SHIFT
                };
                let shortcut = Shortcut::new(Some(mods), Code::Space);
                let _ = app.global_shortcut().on_shortcut(
                    shortcut,
                    |app_handle, _sc, event| {
                        if event.state() == ShortcutState::Pressed {
                            toggle_quick_add(app_handle);
                        }
                    },
                );
            }

            {
                let show_item = MenuItemBuilder::with_id("show", "显示主窗口").build(app)?;
                let quick_item = MenuItemBuilder::with_id("quick", "快速添加任务").build(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "退出 Quad Board").build(app)?;
                let menu = MenuBuilder::new(app)
                    .items(&[&show_item, &quick_item])
                    .separator()
                    .item(&quit_item)
                    .build()?;

                let mut builder = TrayIconBuilder::with_id("main-tray")
                    .tooltip("Quad Board · 四象限任务")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app_handle, event| match event.id.as_ref() {
                        "show" => show_main(app_handle),
                        "quick" => toggle_quick_add(app_handle),
                        "quit" => {
                            QUITTING.store(true, Ordering::SeqCst);
                            persist(app_handle);
                            app_handle.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_main(tray.app_handle());
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    builder = builder.icon(icon.clone());
                }
                builder.build(app)?;
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(20));
                check_reminders(&handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                if window.label() != "main" {
                    return;
                }
                if QUITTING.load(Ordering::SeqCst) {
                    store_geometry(window);
                    return;
                }
                let close_to_tray = window
                    .state::<AppState>()
                    .db
                    .lock()
                    .map(|d| d.settings.close_to_tray)
                    .unwrap_or(true);
                if close_to_tray {
                    api.prevent_close();
                    store_geometry(window);
                    let _ = window.hide();
                    persist(&window.app_handle().clone());
                } else {
                    store_geometry(window);
                }
            }
            WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                if window.label() == "main" {
                    store_geometry(window);
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_db,
            commands::save_tasks,
            commands::save_settings,
            commands::create_task,
            commands::data_dir,
            commands::reveal_data_dir,
            commands::hide_quick_add,
            commands::show_main,
            commands::set_autostart,
            commands::autostart_enabled,
            commands::notify_test
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                persist(app_handle);
            }
        });
}
