use arboard::{Clipboard, ImageData};
use image::GenericImageView;
use image::io::Reader as ImageReader;
use std::borrow::Cow;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use image::imageops::FilterType;

#[derive(Debug, Serialize, Deserialize)]
enum AssetKind {
    Image,
    Code,
    Text,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileMetadata {
    size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
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
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    library_path: String,
    theme_mode: String,
    thumbnail_size: u32,
    auto_extract_colors: bool,
    max_text_preview_lines: u32,
    io_timeout_seconds: u64,
    items_per_page: u32,
}

fn get_config() -> AppConfig {
    let lib_path = "./.splatera_library".to_string(); 
    
    fs::create_dir_all(&lib_path).unwrap_or_default();
    fs::create_dir_all(format!("{}/thumbnails", lib_path)).unwrap_or_default();

    AppConfig {
        library_path: lib_path,
        theme_mode: "dark".to_string(),
        thumbnail_size: 400, 
        auto_extract_colors: true,
        max_text_preview_lines: 20,
        io_timeout_seconds: 10,
        items_per_page: 50,
    }
}

#[tauri::command]
async fn process_asset(path: String) -> Result<Asset, String> {
    let result = tokio::task::spawn_blocking(move || -> Result<Asset, String> {
        let config = get_config(); 
        let original_path = Path::new(&path);
        
        let metadata = fs::metadata(&original_path).map_err(|e| e.to_string())?;
        let size_bytes = metadata.len();
        let asset_id = Uuid::new_v4().to_string();

        let mut preview_path = None;
        let mut kind = AssetKind::Unknown;
        
        let mut width = 0;
        let mut height = 0;

        if let Some(ext) = original_path.extension().and_then(|e| e.to_str()) {
            let ext_lower = ext.to_lowercase();
            
            match ext_lower.as_str() {
                "png" | "jpg" | "jpeg" | "webp" | "bmp" => {
                    kind = AssetKind::Image;
                    
                    if let Ok(img) = image::open(&original_path) {
                        let dims = img.dimensions();
                        width = dims.0;
                        height = dims.1;

                        let thumbnail = img.resize(
                            config.thumbnail_size, 
                            config.thumbnail_size, 
                            FilterType::Triangle 
                        );
                        
                        let thumb_filename = format!("{}.jpg", asset_id);
                        let thumb_filepath = Path::new(&config.library_path)
                            .join("thumbnails")
                            .join(&thumb_filename);
                        
                        if thumbnail.save(&thumb_filepath).is_ok() {
                            preview_path = Some(thumb_filepath.to_string_lossy().into_owned());
                        }
                    }
                },
                "txt" | "md" => kind = AssetKind::Text,
                "js" | "py" | "rs" | "css" | "html" => kind = AssetKind::Code,
                _ => kind = AssetKind::Unknown,
            }
        }

        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

        Ok(Asset {
            id: asset_id,
            original_path: path,
            preview_path,
            kind,
            dominant_colors: vec![], 
            tags: vec![],            
            metadata: FileMetadata { size_bytes },
            width,
            height,
            created_at: timestamp,
        })
    }).await;

    match result {
        Ok(Ok(asset)) => Ok(asset),
        Ok(Err(e)) => Err(e),
        Err(e) => Err(format!("Task panicked: {}", e)),
    }
}

#[tauri::command]
async fn copy_image_to_clipboard(path: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

    let img = ImageReader::open(&path).map_err(|e| e.to_string())?
        .decode().map_err(|e| e.to_string())?;

    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let bytes = rgba.into_raw();

    let image_data = ImageData {
        width: w as usize,
        height: h as usize,
        bytes: Cow::from(bytes),
    };

    clipboard.set_image(image_data).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_file_bytes, copy_image_to_clipboard, process_asset])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
