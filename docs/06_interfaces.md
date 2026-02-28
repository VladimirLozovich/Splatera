> Взаимодействие строится на строгих контрактах. Со стороны Backend (Rust) используются `Traits`, со стороны Frontend - `Interfaces`.

## 1. Backend Traits (Rust)

Эти трейты определяют границы архитектурных слоев и позволяют тестировать бизнес-логику изолированно от файловой системы и OS.

### 1.1 Работа с хранилищем (Repository Pattern)

Трейт, отвечающий за сохранение метаданных библиотеки (JSON/SQLite).

```rust
/// Контракт для постоянного хранения данных об ассетах
pub trait AssetRepository {
    /// Загрузить всю библиотеку в память при старте
    fn load_library(&self) -> Result<Vec<Asset>, AppError>;

    /// Сохранить новый ассет или обновить существующий
    fn save_asset(&self, asset: &Asset) -> Result<(), AppError>;

    /// Удалить ассет из индекса (но не обязательно файл)
    fn delete_asset(&self, id: &str) -> Result<(), AppError>;

    /// Найти ассет по ID
    fn get_by_id(&self, id: &str) -> Result<Option<Asset>, AppError>;

    /// Обновить теги у конкретного файла
    fn update_tags(&self, id: &str, tags: Vec<String>) -> Result<(), AppError>;
}
```

### 1.2 Обработка изображений (Image Processing)

Трейт для "тяжелых" операций с графикой. Выносится в отдельный сервис, чтобы не блокировать основной поток.

```rust
/// Контракт для процессинга медиа-файлов
pub trait ImageProcessor {
    /// Создать уменьшенную копию (thumbnail)
    /// Возвращает путь к созданному файлу
    fn generate_thumbnail(&self, source_path: &Path, output_dir: &Path) -> Result<PathBuf, AppError>;

    /// Извлечь доминантные цвета из изображения
    /// Возвращает вектор HEX-строк (например, ["#FF0000", "#000000"])
    fn extract_palette(&self, source_path: &Path, count: u8) -> Result<Vec<String>, AppError>;

    /// Получить размеры изображения без полной загрузки в память
    fn get_dimensions(&self, source_path: &Path) -> Result<(u32, u32), AppError>;
}
```

### 1.3 Взаимодействие с ОС (System Interactions)

Абстракция над файловой системой и нативными диалогами.

```rust
pub trait FileSystemOps {
    /// Проверить существование файла
    fn file_exists(&self, path: &str) -> bool;

    /// Получить метаданные (размер, дата создания)
    fn get_metadata(&self, path: &str) -> Result<FileMetadata, AppError>;

    /// Открыть файл в программе по умолчанию (Shell execute)
    fn open_in_default_app(&self, path: &str) -> Result<(), AppError>;

    /// Показать файл в проводнике/Finder
    fn reveal_in_explorer(&self, path: &str) -> Result<(), AppError>;
}
```

## 2. Типы ошибок (Error Handling)

Единый `enum` для типизации всех возможных проблем в приложении. Эти ошибки сериализуются и отправляются на Frontend.

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("File not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    AccessDenied(String),

    #[error("Image processing failed: {0}")]
    ImageProcessingError(String),

    #[error("Database corruption: {0}")]
    DatabaseError(String),

    #[error("File too large for preview")]
    FileTooLarge,

    #[error("Unsupported file format: {0}")]
    UnsupportedFormat(String),
    
    #[error("Unknown system error")]
    Unknown,
}
```

## 3. Frontend Interfaces (TypeScript)

Контракты для UI-компонентов и стейт-менеджера.

### 3.1 State Manager (Zustand Store)

Интерфейс глобального состояния приложения.

```typescript
export interface ILibraryStore {
  // State
  assets: AssetViewDto[];
  isLoading: boolean;
  searchQuery: string;
  activeFilters: FilterState; // { colors: string[], type: string }
  
  // Actions
  importFiles: (paths: string[]) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  filterByColor: (color: string) => void;
  
  // Computed
  filteredAssets: () => AssetViewDto[];
}
```

### 3.2 IPC Bridge (Tauri Invoker)

Интерфейс для вызова Rust-функций из JS.

```typescript
export interface IBackendApi {
  // Команды (Commands)
  scanDirectory(path: string): Promise<string[]>;
  generatePreview(path: string): Promise<string>; // returns asset:// url
  saveTags(id: string, tags: string[]): Promise<void>;
  openFile(path: string): Promise<void>;
  
  // События (Events), на которые можно подписаться
  onScanProgress(callback: (progress: number) => void): UnlistenFn;
  onError(callback: (error: AppError) => void): UnlistenFn;
}
```

### 3.3 UI Components Props

Пример контракта для основного компонента сетки.

```typescript
export interface IMasonryGridProps {
  items: AssetViewDto[];
  columnCount: number; // Адаптивное кол-во колонок
  gutter: number;      // Отступ между элементами
  
  onItemClick: (id: string) => void;
  onItemDragStart: (id: string) => void;
}
```