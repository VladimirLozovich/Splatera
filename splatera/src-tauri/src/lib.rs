use arboard::{Clipboard, ImageData};
use image::io::Reader as ImageReader;
use std::borrow::Cow;

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
        .invoke_handler(tauri::generate_handler![read_file_bytes, copy_image_to_clipboard])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
