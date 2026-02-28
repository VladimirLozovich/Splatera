> В данном проекте "Domain" это структуры данных, которые использует Rust-бэкенд для логики и сохранения в локальную базу данных.

### 1.1 - Asset (Основная сущность ресурса)

Представляет собой единицу контента (файл), добавленную в библиотеку.

```rust
struct Asset {
    id: String,              // UUID v4
    original_path: String,   // Абсолютный путь к исходному файлу на диске
    preview_path: Option<String>, // Путь к сгенерированному превью (для картинок)
    kind: AssetKind,         // Тип контента
    dominant_colors: Vec<String>, // HEX-коды (напр. ["#FF0000", "#00FF00"])
    tags: Vec<String>,       // Список тегов (авто + ручные)
    metadata: FileMetadata,  // Технические данные
    created_at: u64,         // Unix timestamp добавления в базу
}
```

### 1.2 AssetKind (Перечисление типов)

```rust
enum AssetKind {
    Image, // JPG, PNG, WEBP, GIF, SVG
    Code,  // JS, PY, RS, JSON, CSS...
    Text,  // TXT, MD
    Unknown
}
```

### 1.3 FileMetadata (Метаданные файла)

```rust
struct FileMetadata {
    size_bytes: u64,
    file_name: String,
    extension: String,
    last_modified_os: u64, // Дата изменения файла в ОС
}
```

### 1.4  AppConfig (Конфигурация приложения)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    library_path: String, // Путь к папке, где лежит db.json и превью
    theme_mode: String, // "dark" | "light" | "system"
    thumbnail_size: u32,
    auto_extract_colors: bool,
    max_text_preview_lines: u32,
    io_timeout_seconds: u64,
    items_per_page: u32, // Для пагинации/виртуализации (по умолчанию 50)
}
```

## 2. DTO (Data Transfer Objects)

Объекты для передачи данных между процессами: Rust Backend (Core) <-> Frontend (Webview). Сериализуются в JSON.

### 2.1 AssetViewDto (Отправка -> Frontend)

Облегченная версия ассета для отрисовки в сетке.

```json
{
  "id": "550e8400-e29b-...",
  "src": "asset://localhost/Users/.../preview.jpg", // Сконвертированный путь для WebView
  "title": "logo_final.png",
  "kind": "IMAGE",
  "colors": ["#333333", "#F2A900"],
  "width": 800,   // Нужно для Masonry Layout (расчет пропорций)
  "height": 600,
  "badges": ["PNG", "Yellow"] // Готовый список для бейджей UI
}
```

### 2.2 AssetDetailDto (Отправка -> Frontend -> Modal)

Полная информация для режима Quick Look.

```json
{
  "id": "550e8400-e29b-...",
  "originalSrc": "asset://localhost/Users/.../logo_final.png",
  "rawContent": "...", // Для текстовых файлов: первые N кб текста
  "fullPath": "C:\\Projects\\Assets\\logo_final.png", // Для отображения пользователю
  "fileSize": "2.4 MB", // Форматированная строка
  "allTags": ["logo", "work", "png"]
}
```

### 2.3 ImportRequestDto (Frontend -> Rust)

Команда на импорт файлов после Drag&Drop.

```json
{
  "paths": [
    "C:\\Downloads\\image1.jpg",
    "C:\\Downloads\\project_folder"
  ]
}
```

# 3. Инварианты и ограничения данных

|**Понятие**|**Ограничение**|
|---|---|
|**Цветовая палитра**|<ol><li>Массив `dominant_colors` содержит от 0 до 5 цветов.</li><li>Формат цвета: Строгий HEX (`#RRGGBB`).</li><li>Для текстовых файлов массив пуст.</li></ol>|
|**Теги**|<ol><li>Теги хранятся в нижнем регистре (`kebab-case` предпочтителен для поиска).</li><li>Максимальная длина тега: 30 символов.</li><li>Дубликаты тегов внутри одного Asset запрещены.</li></ol>|
|**Превью (Thumbnail)**|<ol><li>Максимальная ширина/высота генерируемого превью: 600px (достаточно для сетки).</li><li>Формат превью: WebP (для оптимизации места) или JPEG (качество 80).</li></ol>|
|**Файловая система**|<ol><li>Приложение не перемещает исходные файлы.</li><li>Если исходный файл удален, `original_path` остается в БД, но при попытке доступа флаг валидности сбрасывается (UI показывает "Broken Link").</li></ol>|

# 4. Таблица маппинга "Source -> Domain -> DTO"

Процесс преобразования данных при импорте и чтении.

| Источник данных (Source) | Поле в Domain (Rust) | Поле в DTO (JSON для UI) | Логика преобразования / Примечание |
|--------------------------|----------------------|---------------------------|-------------------------------------|
| OS File System | `Asset.original_path` | `AssetDetailDto.fullPath` | Храним "сырой" путь. В DTO экранируем слеши. |
| OS File Metadata | `Asset.metadata_extension` | `AssetViewDto.badges` | Расширение (.png) становится верхним регистром (PNG). |
| Библиотека images | `Asset.dominant_colors` | `AssetViewDto.colors` | Алгоритм k-means / color-thief. Берем топ-5 цветов. |
| Генератор превью | `Asset.preview_path` | `AssetViewDto.src` | Rust сохраняет файл в `%AppData%`. В DTO путь оборачивается в протокол `asset://` или `https://asset.localhost`. |
| Анализ контента | `Asset.kind` | `AssetViewDto.kind` | Расширение → Enum. jpg → Image, py → Code. |
| Image Dimensions | `Asset.metadata` (w/h) | `AssetViewDto.width/height` | Важно: размеры сохраняются в БД, чтобы UI мог построить скелет сетки (layout) до загрузки самой картинки. |
| Пользовательский BDD | `Asset.tags` | `AssetDetailDto.allTags` | Ввод "My Tag" → trim → lowercase → "my tag". |