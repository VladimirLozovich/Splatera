use arboard::{Clipboard, ImageData};
use image::io::Reader as ImageReader;
use std::borrow::Cow;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use image::imageops::FilterType;
use color_thief::{get_palette, ColorFormat};
use std::collections::HashMap;
use walkdir::WalkDir;

// ==========================================
// 1. СТРУКТУРЫ ДАННЫХ
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

    fn image_extensions() -> &'static [&'static str] {
        &["png", "jpg", "jpeg", "webp", "bmp", "gif"]
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
// 2. РАБОТА С БАЗОЙ ДАННЫХ
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
    let db_path = get_db_path(config);
    let json = serde_json::to_string_pretty(assets).map_err(|e| e.to_string())?;
    fs::write(db_path, json).map_err(|e| e.to_string())
}

// ==========================================
// 3. ОБРАБОТКА ФАЙЛОВ И ИЗОБРАЖЕНИЙ
// ==========================================

fn extract_metadata(path: &Path) -> Result<FileMetadata, String> {
    let metadata_fs = fs::metadata(path).map_err(|e| e.to_string())?;
    Ok(FileMetadata {
        size_bytes: metadata_fs.len(),
        file_name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        extension: path.extension().unwrap_or_default().to_string_lossy().to_string(),
        last_modified_os: metadata_fs
            .modified()
            .unwrap_or(SystemTime::now())
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    })
}

// ==========================================
// 4. КОМАНДЫ TAURI (API)
// ==========================================

fn process_single_path(path: &Path, config: &AppConfig) -> Result<Asset, String> {
    let metadata = extract_metadata(path)?;
    let asset_id = Uuid::new_v4().to_string();

    let mut preview_path = None;
    let mut kind = AssetKind::Unknown;
    let mut width = 0;
    let mut height = 0;
    let mut dominant_colors = Vec::new();
    let mut tags = vec![];

    if !metadata.extension.is_empty() {
        let ext_lower = metadata.extension.to_lowercase();
        tags.push(ext_lower.clone());

        match ext_lower.as_str() {
            "png" | "jpg" | "jpeg" | "webp" | "bmp" => {
                kind = AssetKind::Image;
                if let Ok(img) = image::open(path) {
                    width = img.width();
                    height = img.height();

                    let color_sample = img.resize(256, 256, FilterType::Nearest);
                    if let Ok(palette) = get_palette(
                        color_sample.into_rgb8().as_raw(),
                        ColorFormat::Rgb,
                        5,
                        5,
                    ) {
                        dominant_colors = palette
                            .into_iter()
                            .map(|c| format!("#{:02X}{:02X}{:02X}", c.r, c.g, c.b))
                            .collect();
                    }

                    let thumbnail = img.resize(
                        config.thumbnail_size,
                        config.thumbnail_size,
                        FilterType::Triangle,
                    );
                    let thumb_filepath = Path::new(&config.library_path)
                        .join("thumbnails")
                        .join(format!("{}.jpg", asset_id));

                    if thumbnail.into_rgb8().save(&thumb_filepath).is_ok() {
                        preview_path = Some(thumb_filepath.to_string_lossy().into_owned());
                    }
                }
            }
            "txt" | "md" => kind = AssetKind::Text,
            "js" | "py" | "rs" | "css" | "html" => kind = AssetKind::Code,
            _ => (),
        }
    }

    // Читаем текст для кода и текстовых файлов
    let mut content_snippet = None;
    if kind == AssetKind::Text || kind == AssetKind::Code {
        use std::io::Read;
        if let Ok(mut file) = std::fs::File::open(path) {
            let mut buffer = [0; 2048];
            if let Ok(bytes_read) = file.read(&mut buffer) {
                let text = String::from_utf8_lossy(&buffer[..bytes_read]);
                let lines: Vec<&str> = text.lines().take(20).collect();
                content_snippet = Some(lines.join("\n"));
            }
        }
        width = 400;
        height = 300;
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
    })
}

#[tauri::command]
async fn process_asset(path: String) -> Result<Vec<Asset>, String> {
    let result = tokio::task::spawn_blocking(move || -> Result<Vec<Asset>, String> {
        let config = get_config();
        let root_path = Path::new(&path);
        let mut new_assets = Vec::new();

        let mut target_paths = Vec::new();
        if root_path.is_dir() {
            for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    target_paths.push(entry.path().to_path_buf());
                }
            }
        } else {
            target_paths.push(root_path.to_path_buf());
        }

        for p in target_paths {
            if let Some(ext) = p.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if !["png", "jpg", "jpeg", "webp", "bmp", "gif", "txt", "md", "js", "py", "rs", "css", "html"]
                    .contains(&ext_str.as_str()) {
                    continue;
                }
            } else { continue; }

            if let Ok(asset) = process_single_path(&p, &config) {
                new_assets.push(asset);
            }
        }

        let mut all_assets = read_db(&config)?;
        let existing_paths: std::collections::HashSet<String> =
            all_assets.iter().map(|a| a.original_path.clone()).collect();
        
        let unique_new: Vec<Asset> = new_assets
            .into_iter()
            .filter(|a| !existing_paths.contains(&a.original_path))
            .collect();
        
        if !unique_new.is_empty() {
            all_assets.extend(unique_new.clone());
            write_db(&all_assets, &config)?;
        }
        
        Ok(unique_new)
    })
    .await;

    result.unwrap_or_else(|e| Err(format!("Task panicked: {}", e)))
}

#[tauri::command]
fn get_library(filter_tag: Option<String>) -> Result<Vec<Asset>, String> {
    let config = get_config();
    let mut assets = read_db(&config)?;

    if let Some(tag) = filter_tag {
        let tag_lower = tag.to_lowercase();

        if tag_lower == "images" {
            // Специальный случай — фильтруем по всем известным форматам картинок
            assets.retain(|asset| {
                asset.tags.iter().any(|t| {
                    AssetKind::image_extensions().contains(&t.to_lowercase().as_str())
                })
            });
        } else {
            assets.retain(|asset| {
                asset.tags.iter().any(|t| t.to_lowercase().contains(&tag_lower))
            });
        }
    }

    Ok(assets)
}

#[tauri::command]
fn get_top_tags() -> Result<Vec<String>, String> {
    let config = get_config();
    let db_path = Path::new(&config.library_path).join("database.json");

    if !db_path.exists() {
        return Ok(vec![]);
    }

    let data = fs::read_to_string(&db_path).map_err(|e| e.to_string())?;
    let assets: Vec<Asset> = serde_json::from_str(&data).unwrap_or_else(|_| vec![]);

    let mut tag_counts: HashMap<String, usize> = HashMap::new();

    for asset in assets {
        for tag in asset.tags {
            let formatted_tag = tag.to_uppercase();
            *tag_counts.entry(formatted_tag).or_insert(0) += 1;
        }
    }

    let mut count_vec: Vec<(String, usize)> = tag_counts.into_iter().collect();
    count_vec.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(count_vec.into_iter().map(|(tag, _)| tag).collect())
}

#[tauri::command]
async fn recalculate_db() -> Result<(), String> {
    println!("Начат пересчет базы данных...");
    let config = get_config();
    let assets = read_db(&config)?;

    let mut valid_assets = Vec::new();

    for mut asset in assets {
        let path = Path::new(&asset.original_path);
        if path.exists() {
            if let Ok(new_meta) = extract_metadata(path) {
                asset.metadata = new_meta;
            }

            // Добавляем дефолтные теги если их нет — для миграции старых ассетов
            for default_tag in asset.kind.default_tags() {
                if !asset.tags.contains(&default_tag) {
                    asset.tags.push(default_tag);
                }
            }

            valid_assets.push(asset);
        }
    }

    write_db(&valid_assets, &config)?;
    println!("Пересчет завершен. В базе {} файлов.", valid_assets.len());
    Ok(())
}

#[tauri::command]
async fn recalculate_colors() -> Result<usize, String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    let mut updated = 0;

    for asset in assets.iter_mut() {
        if !asset.dominant_colors.is_empty() {
            continue;
        }

        let path = Path::new(&asset.original_path);
        if !path.exists() {
            continue;
        }

        if let Ok(img) = image::open(path) {
            let color_sample = img.resize(256, 256, FilterType::Nearest);
            if let Ok(palette) = get_palette(
                color_sample.into_rgb8().as_raw(),
                ColorFormat::Rgb,
                5,
                5,
            ) {
                asset.dominant_colors = palette
                    .into_iter()
                    .map(|c| format!("#{:02X}{:02X}{:02X}", c.r, c.g, c.b))
                    .collect();
                updated += 1;
            }
        }
    }

    write_db(&assets, &config)?;
    Ok(updated)
}

#[tauri::command]
async fn copy_image_to_clipboard(path: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    clipboard
        .set_image(ImageData {
            width: w as usize,
            height: h as usize,
            bytes: Cow::from(rgba.into_raw()),
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_asset_tags(id: String, tags: Vec<String>) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    
    if let Some(asset) = assets.iter_mut().find(|a| a.id == id) {
        asset.tags = tags;
        write_db(&assets, &config)?;
        Ok(())
    } else {
        Err("Asset not found".to_string())
    }
}

#[tauri::command]
async fn delete_asset(id: String) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    
    if let Some(index) = assets.iter().position(|a| a.id == id) {
        let asset = &assets[index];
        if let Some(preview) = &asset.preview_path {
            let _ = fs::remove_file(preview);
        }
        assets.remove(index);
        write_db(&assets, &config)?;
        Ok(())
    } else {
        Err("Asset not found".to_string())
    }
}

#[tauri::command]
async fn rename_asset(id: String, new_name: String) -> Result<(), String> {
    let config = get_config();
    let mut assets = read_db(&config)?;
    
    if let Some(asset) = assets.iter_mut().find(|a| a.id == id) {
        asset.metadata.file_name = new_name;
        write_db(&assets, &config)?;
        Ok(())
    } else {
        Err("Asset not found".to_string())
    }
}

#[tauri::command]
async fn open_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn read_full_text_file(path: String) -> Result<String, String> {
    use std::io::Read;
    use std::fs::File;

    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    // Ограничиваем чтение 2 МБ, чтобы фронтенд не завис на гигантских логах
    let mut handle = file.take(2 * 1024 * 1024);
    let mut buffer = Vec::new();
    handle.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    let text = String::from_utf8_lossy(&buffer).into_owned();
    Ok(text)
}

#[tauri::command]
fn resolve_path(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let abs = if p.is_absolute() {
        p.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(p)
    };
    Ok(abs.to_string_lossy().into_owned())
}

#[tauri::command]
async fn copy_text_to_clipboard(path: String) -> Result<(), String> {
    use std::io::Read;
    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(content).map_err(|e| e.to_string())?;
    Ok(())
}

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
            copy_text_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}