use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use image::imageops::FilterType;
use color_thief::{get_palette, ColorFormat};
use walkdir::WalkDir;

// ==========================================
// 1. КОНСТАНТЫ
// ==========================================

const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "bmp", "gif"];
const TEXT_EXTENSIONS:  &[&str] = &["txt", "md"];
const CODE_EXTENSIONS:  &[&str] = &["js", "py", "rs", "css", "html"];
const ALL_EXTENSIONS:   &[&str] = &["png", "jpg", "jpeg", "webp", "bmp", "gif", "txt", "md", "js", "py", "rs", "css", "html"];

// ==========================================
// 2. СТРУКТУРЫ ДАННЫХ
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
enum AssetKind { Image, Code, Text, Unknown }

impl AssetKind {
    fn default_tags(&self) -> Vec<String> {
        match self {
            AssetKind::Image   => vec!["image".to_string()],
            AssetKind::Text    => vec!["text".to_string()],
            AssetKind::Code    => vec!["code".to_string()],
            AssetKind::Unknown => vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileMetadata {
    size_bytes: u64,
    file_name: String,
    extension: String,
    last_modified_os: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    id: String,
    original_path: String,
    preview_path: Option<String>,
    kind: AssetKind,
    dominant_colors: Vec<String>,
    tags: Vec<String>,
    metadata: FileMetadata,
    width: u32,
    height: u32,
    created_at: u64,
    content_snippet: Option<String>,
    #[serde(default)]
    is_broken: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    library_path: String,
    theme_mode: String,
    thumbnail_size: u32,
}

fn get_config() -> AppConfig {
    let lib_path = "./.splatera_library".to_string();
    fs::create_dir_all(format!("{}/thumbnails", &lib_path)).unwrap_or_default();
    AppConfig {
        library_path: lib_path,
        theme_mode: "dark".to_string(),
        thumbnail_size: 400,
    }
}

// ==========================================
// 3. БАЗА ДАННЫХ
// ==========================================

fn get_db_path(config: &AppConfig) -> PathBuf {
    Path::new(&config.library_path).join("database.json")
}

fn read_db(config: &AppConfig) -> Result<Vec<Asset>, String> {
    let db_path = get_db_path(config);
    if !db_path.exists() { return Ok(vec![]); }
    let data = fs::read_to_string(&db_path).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&data).unwrap_or_else(|_| vec![]))
}

fn write_db(assets: &[Asset], config: &AppConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(assets).map_err(|e| e.to_string())?;
    fs::write(get_db_path(config), json).map_err(|e| e.to_string())
}

// ==========================================
// 4. ОБРАБОТКА ФАЙЛОВ
// ==========================================

fn extract_metadata(path: &Path) -> Result<FileMetadata, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    Ok(FileMetadata {
        size_bytes: meta.len(),
        file_name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        extension: path.extension().unwrap_or_default().to_string_lossy().to_string(),
        last_modified_os: meta.modified()
            .unwrap_or(SystemTime::now())
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    })
}

fn extract_colors(img: &image::DynamicImage) -> Vec<String> {
    let sample = img.resize(256, 256, FilterType::Nearest);
    get_palette(sample.into_rgb8().as_raw(), ColorFormat::Rgb, 5, 5)
        .map(|palette| palette.into_iter()
            .map(|c| format!("#{:02X}{:02X}{:02X}", c.r, c.g, c.b))
            .collect())
        .unwrap_or_default()
}

fn save_thumbnail(img: &image::DynamicImage, asset_id: &str, config: &AppConfig) -> Option<String> {
    let thumb = img.resize(config.thumbnail_size, config.thumbnail_size, FilterType::Triangle);
    let path = Path::new(&config.library_path)
        .join("thumbnails")
        .join(format!("{}.jpg", asset_id));
    thumb.into_rgb8().save(&path).ok()?;
    Some(path.to_string_lossy().into_owned())
}

fn read_text_snippet(path: &Path) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    Some(content.lines().take(20).collect::<Vec<_>>().join("\n"))
}

fn process_single_path(path: &Path, config: &AppConfig) -> Result<Asset, String> {
    let metadata = extract_metadata(path)?;
    let asset_id = Uuid::new_v4().to_string();

    let ext = metadata.extension.to_lowercase();
    let mut tags = if ext.is_empty() { vec![] } else { vec![ext.clone()] };

    let kind;
    let mut preview_path = None;
    let mut dominant_colors = vec![];
    let mut content_snippet = None;
    let mut width = 0u32;
    let mut height = 0u32;

    if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        kind = AssetKind::Image;
        if let Ok(img) = image::open(path) {
            width = img.width();
            height = img.height();
            dominant_colors = extract_colors(&img);
            preview_path = save_thumbnail(&img, &asset_id, config);
        }
    } else if TEXT_EXTENSIONS.contains(&ext.as_str()) {
        kind = AssetKind::Text;
        content_snippet = read_text_snippet(path);
        width = 400; height = 300;
    } else if CODE_EXTENSIONS.contains(&ext.as_str()) {
        kind = AssetKind::Code;
        content_snippet = read_text_snippet(path);
        width = 400; height = 300;
    } else {
        kind = AssetKind::Unknown;
    }

    tags.extend(kind.default_tags());

    Ok(Asset {
        id: asset_id,
        original_path: path.to_string_lossy().into_owned(),
        preview_path,
        kind,
        dominant_colors,
        tags,
        metadata,
        width,
        height,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs(),
        content_snippet,
        is_broken: false,
    })
}

// ==========================================
// 5. КОМАНДЫ TAURI
// ==========================================

#[tauri::command]
async fn process_asset(path: String) -> Result<Vec<Asset>, String> {
    tokio::task::spawn_blocking(move || {
        let config = get_config();
        let root = Path::new(&path);

        let paths: Vec<PathBuf> = if root.is_dir() {
            WalkDir::new(root).into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
                .map(|e| e.path().to_path_buf())
                .collect()
        } else {
            vec![root.to_path_buf()]
        };

        let new_assets: Vec<Asset> = paths.into_iter()
            .filter(|p| p.extension()
                .map(|e| ALL_EXTENSIONS.contains(&e.to_string_lossy().to_lowercase().as_str()))
                .unwrap_or(false))
            .filter_map(|p| process_single_path(&p, &config).ok())
            .collect();

        let mut all_assets = read_db(&config)?;
        let existing: std::collections::HashSet<String> =
            all_assets.iter().map(|a| a.original_path.clone()).collect();

        let unique: Vec<Asset> = new_assets.into_iter()
            .filter(|a| !existing.contains(&a.original_path))
            .collect();

        if !unique.is_empty() {
            all_assets.extend(unique.clone());
            write_db(&all_assets, &config)?;
        }

        Ok(unique)
    })
    .await
    .unwrap_or_else(|e| Err(format!("Task panicked: {}", e)))
}

#[tauri::command]
fn get_library(filter_tag: Option<String>) -> Result<Vec<Asset>, String> {
    let config = get_config();
    let mut assets = read_db(&config)?;

    for asset in assets.iter_mut() {
        asset.is_broken = !Path::new(&asset.original_path).exists();
    }

    if let Some(tag) = filter_tag {
        let tag_lower = tag.to_lowercase();
        if tag_lower == "images" {
            assets.retain(|a| a.tags.iter().any(|t| IMAGE_EXTENSIONS.contains(&t.to_lowercase().as_str())));
        } else {
            assets.retain(|a| a.tags.iter().any(|t| t.to_lowercase().contains(&tag_lower)));
        }
    }

    Ok(assets)
}

#[tauri::command]
fn get_top_tags() -> Result<Vec<String>, String> {
    let config = get_config();
    let assets = read_db(&config)?;

    let mut counts: HashMap<String, usize> = HashMap::new();
    for asset in assets {
        for tag in asset.tags {
            *counts.entry(tag.to_uppercase()).or_insert(0) += 1;
        }
    }

    let mut sorted: Vec<(String, usize)> = counts.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    Ok(sorted.into_iter().map(|(tag, _)| tag).collect())
}

#[tauri::command]
async fn recalculate_db() -> Result<(), String> {
    let config = get_config();
    let assets = read_db(&config)?;

    let valid: Vec<Asset> = assets.into_iter()
        .filter(|a| Path::new(&a.original_path).exists())
        .map(|mut a| {
            if let Ok(meta) = extract_metadata(Path::new(&a.original_path)) {
                a.metadata = meta;
            }
            for tag in a.kind.default_tags() {
                if !a.tags.contains(&tag) { a.tags.push(tag); }
            }
            a
        })
        .collect();

    write_db(&valid, &config)?;
    println!("Recalculate complete. {} assets in DB.", valid.len());
    Ok(())
}

#[tauri::command]
async fn recalculate_colors() -> Result<usize, String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    let mut updated = 0;

    for asset in assets.iter_mut() {
        if !asset.dominant_colors.is_empty() { continue; }
        let path = Path::new(&asset.original_path);
        if !path.exists() { continue; }
        if let Ok(img) = image::open(path) {
            asset.dominant_colors = extract_colors(&img);
            updated += 1;
        }
    }

    write_db(&assets, &config)?;
    Ok(updated)
}

#[tauri::command]
async fn copy_image_to_clipboard(path: String) -> Result<(), String> {
    use arboard::ImageData;
    use image::io::Reader as ImageReader;
    use std::borrow::Cow;

    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    clipboard.set_image(ImageData {
        width: w as usize,
        height: h as usize,
        bytes: Cow::from(rgba.into_raw()),
    }).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn copy_text_to_clipboard(path: String) -> Result<(), String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_asset_tags(id: String, tags: Vec<String>) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    assets.iter_mut().find(|a| a.id == id)
        .ok_or("Asset not found".to_string())
        .map(|a| a.tags = tags)?;
    write_db(&assets, &config)
}

#[tauri::command]
async fn delete_asset(id: String) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    let index = assets.iter().position(|a| a.id == id)
        .ok_or("Asset not found".to_string())?;
    if let Some(preview) = &assets[index].preview_path {
        let _ = fs::remove_file(preview);
    }
    assets.remove(index);
    write_db(&assets, &config)
}

#[tauri::command]
async fn rename_asset(id: String, new_name: String) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    assets.iter_mut().find(|a| a.id == id)
        .ok_or("Asset not found".to_string())
        .map(|a| a.metadata.file_name = new_name)?;
    write_db(&assets, &config)
}

#[tauri::command]
async fn open_in_folder(path: String) -> Result<(), String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    Command::new("explorer").arg("/select,").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    Command::new("open").arg("-R").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn read_full_text_file(path: String) -> Result<String, String> {
    use std::io::Read;
    let mut handle = fs::File::open(&path).map_err(|e| e.to_string())?.take(2 * 1024 * 1024);
    let mut buffer = Vec::new();
    handle.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

#[tauri::command]
fn resolve_path(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let abs = if p.is_absolute() {
        p.to_path_buf()
    } else {
        std::env::current_dir().map_err(|e| e.to_string())?.join(p)
    };
    Ok(abs.to_string_lossy().into_owned())
}

// ==========================================
// 6. ТОЧКА ВХОДА
// ==========================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            copy_image_to_clipboard,
            copy_text_to_clipboard,
            process_asset,
            get_library,
            recalculate_db,
            recalculate_colors,
            get_top_tags,
            update_asset_tags,
            delete_asset,
            rename_asset,
            open_in_folder,
            read_full_text_file,
            resolve_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}