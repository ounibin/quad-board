use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn default_quadrant() -> u8 {
    1
}
fn default_true() -> bool {
    true
}
fn default_theme() -> String {
    "system".to_string()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub note: String,
    #[serde(default = "default_quadrant")]
    pub quadrant: u8,
    #[serde(default)]
    pub due_at: Option<i64>,
    #[serde(default)]
    pub remind_at: Option<i64>,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub done_at: Option<i64>,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default)]
    pub order: i64,
    #[serde(default)]
    pub notified: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowGeom {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub launch_at_login: bool,
    #[serde(default = "default_true")]
    pub close_to_tray: bool,
    #[serde(default = "default_quadrant")]
    pub quick_add_quadrant: u8,
    #[serde(default)]
    pub reminder_lead_minutes: i64,
    #[serde(default)]
    pub hide_done: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            launch_at_login: false,
            close_to_tray: true,
            quick_add_quadrant: 1,
            reminder_lead_minutes: 0,
            hide_done: false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Db {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub tasks: Vec<Task>,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default)]
    pub window_state: Option<WindowGeom>,
}

fn default_version() -> u32 {
    1
}

impl Default for Db {
    fn default() -> Self {
        Self {
            version: 1,
            tasks: Vec::new(),
            settings: Settings::default(),
            window_state: None,
        }
    }
}

impl Db {
    pub fn load(path: &Path) -> Db {
        let candidates = [path.to_path_buf(), path.with_extension("json.bak")];
        for p in candidates {
            if let Ok(text) = fs::read_to_string(&p) {
                if let Ok(db) = serde_json::from_str::<Db>(&text) {
                    return db;
                }
            }
        }
        Db::default()
    }

    pub fn save(&self, path: &Path) -> std::io::Result<()> {
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let json = serde_json::to_vec_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, &json)?;
        if path.exists() {
            let _ = fs::copy(path, path.with_extension("json.bak"));
        }
        fs::rename(&tmp, path)?;
        Ok(())
    }
}

pub struct AppState {
    pub db: Mutex<Db>,
    pub path: PathBuf,
}

impl AppState {
    pub fn new(path: PathBuf) -> Self {
        let db = Db::load(&path);
        Self {
            db: Mutex::new(db),
            path,
        }
    }
}
