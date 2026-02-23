# Детальная структура кода (Classes & Structs)

В этом документе описана структура классов (для TS) и структур (для Rust), которые реализуют архитектуру приложения.

## 1. Backend: Структуры Rust (Core Logic)

Ядро приложения построено на композиции структур.

### 1.1 Точка входа и Состояние (App State)

`AppState` — это разделяемый ресурс, доступный во всех командах Tauri (Thread-safe).

```rust
struct AppState {
    // Мьютекс для безопасного доступа к сервису из разных потоков
    library_service: Mutex<LibraryService>,
    config: AppConfig,
}
```

### 1.2 Сервисный слой (Service Layer)

`LibraryService` — фасад для всей бизнес-логики. Он координирует работу репозитория и процессора изображений.

```rust
struct LibraryService {
    // Зависимости внедряются через трейты (для тестируемости)
    repository: Box<dyn AssetRepository>, 
    image_processor: Box<dyn ImageProcessor>,
    file_system: Box<dyn FileSystemOps>,
}

impl LibraryService {
    fn new(repo: JsonRepository, img: ImageSharpProcessor) -> Self { ... }
    
    // Use Cases
    fn import_files(&self, paths: Vec<String>) -> Result<Vec<Asset>> { ... }
    fn get_assets(&self, filter: FilterCriteria) -> Vec<Asset> { ... }
    fn scan_directory(&self, path: &str) -> Result<ScanReport> { ... }
}
```

### 1.3 Инфраструктура (Infrastructure Implementation)

Реализация интерфейсов, описанных в этапе 6.1.

```rust
struct JsonRepository {
    db_path: PathBuf,
    cache: HashMap<String, Asset>, // In-memory кеш для быстрого поиска
}

struct ImageSharpProcessor {
    // Обертка над крейтом image-rs
    supported_formats: Vec<String>,
}
```

### 1.4 Домен (Domain Entities)

Основные сущности данных (как описано в этапе 4, но более детально для кода).

```rust
struct Asset {
    id: Uuid,
    original_path: PathBuf,
    kind: AssetKind,
    metadata: FileMetadata,
    tags: HashSet<String>, // HashSet для уникальности и быстрого поиска
    color_palette: Palette,
}

struct Palette {
    primary: String,   // HEX
    secondary: String,
    accents: Vec<String>,
}
```

## 2. Frontend: Классы и Компоненты (TypeScript/React)

На клиенте используется функциональный подход (React Hooks), но архитектурно выделяются следующие блоки.

### 2.1 State Management (Store)

`useLibraryStore` (Zustand) выполняет роль ViewModel для всего приложения.

```typescript
class LibraryStore {
    // State
    assets: AssetViewDto[] = [];
    selectedAssetId: string | null = null;
    isScanning: boolean = false;
    
    // Actions (Methods)
    async importFiles(files: FileList): Promise<void> {
        this.isScanning = true;
        await invoke('import_command', { files });
        await this.refreshLibrary();
        this.isScanning = false;
    }

    setFilter(criteria: FilterCriteria): void {
        // Локальная фильтрация списка assets
    }
}
```

### 2.2 UI Components (Views)

Иерархия компонентов интерфейса.
- `AppShell`: Корневой лейаут (TitleBar + ContentArea).
- `MasonryGrid`: Умная сетка.
    - *Props*: `items: Asset[]`, `columnCount: number`.
    - *Logic*: Вычисляет абсолютные позиции карточек (layout engine).
- `AssetCard`: Отображение одного элемента.
    - *Props*: `data: AssetViewDto`.
    - *Logic*: Обработка клика, Drag&Drop, Lazy Loading картинки.
- `FilterPanel`: Управление состоянием фильтра.
    - *Props*: `activeTags: string[]`, `onTagToggle: fn`.

## 3. Диаграмма классов (Mermaid)

Визуализация связей между слоями (Frontend <-> Bridge <-> Backend).

```mermaid
classDiagram
    %% Frontend Layer
    class ReactView {
        +render()
        +handleDragDrop()
    }
    
    class LibraryStore {
        +assets: Asset[]
        +filter: FilterState
        +importFiles()
        +search(query)
    }

    %% Bridge Layer
    class TauriCommands {
        <<Interface>>
        +invoke("import_assets")
        +invoke("get_library")
    }

    %% Backend Layer
    class AppState {
        +service: LibraryService
    }

    class LibraryService {
        -repo: AssetRepository
        -processor: ImageProcessor
        +import(paths)
        +scan_folder(path)
    }

    class JsonRepository {
        -filePath: String
        +save(asset)
        +loadAll()
    }

    class Asset {
        +id: UUID
        +path: String
        +tags: List~String~
        +colors: List~Hex~
    }

    %% Relationships
    ReactView --> LibraryStore : Uses Data
    LibraryStore --> TauriCommands : Calls IPC
    TauriCommands --> AppState : Access State
    AppState --> LibraryService : Contains
    LibraryService --> JsonRepository : Uses
    LibraryService --> Asset : Creates/Manages
    JsonRepository --> Asset : Stores
```