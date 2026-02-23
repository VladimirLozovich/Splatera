# Диаграммы последовательности (Sequence Diagrams)

Визуализация взаимодействия между Frontend (React), Bridge (Tauri) и Backend (Rust) во времени.

## 1. Сценарий: Импорт новых файлов (Drag & Drop)

Самый сложный процесс в приложении. Включает в себя обработку файлов, генерацию графики и сохранение в БД.

**Участники:**

- **User**: Пользователь.
- **UI (React)**: Компонент сетки и Dropzone.
- **Bridge**: IPC канал Tauri.
- **LibraryService**: Основная логика Rust.
- **ImageProcessor**: Модуль обработки графики.
- **Repository**: Слой данных (JSON DB).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend (View)
    participant Bridge as Tauri Command
    participant Service as LibraryService
    participant Img as ImageProcessor
    participant Repo as JsonRepository

    User->>UI: Перетаскивает файлы (Drag & Drop)
    UI->>UI: Показывает индикатор загрузки (Spinner)
    
    %% Вызов Rust из JS
    UI->>Bridge: invoke("import_files", { paths })
    Bridge->>Service: import_files(paths)

    loop Для каждого файла
        Service->>Service: Проверка существования файла
        
        par Параллельная обработка
            Service->>Img: generate_thumbnail(path)
            Img-->>Service: thumbnail_path (cached)
        and
            Service->>Img: extract_palette(path)
            Img-->>Service: [HexColors]
        end

        Service->>Service: Создание структуры Asset
        Service->>Repo: save_asset(Asset)
    end

    Service-->>Bridge: Возврат Vec<AssetViewDto>
    Bridge-->>UI: Promise.resolve(assets)
    
    UI->>UI: Обновление стейта (Zustand addItems)
    UI-->>User: Новые карточки появляются в сетке
```

## 2. Сценарий: Быстрый просмотр (Quick Look)

Сценарий чтения данных. Происходит, когда пользователь нажимает Space на выбранной карточке. Требует подгрузки полного пути или текстового содержимого, которого нет в облегченной версии для сетки.

**Участники:**

- **User**: Пользователь.
- **UI (React)**: Модальное окно.
- **Service**: Бэкенд логика.
- **FileSystem**: Доступ к диску ОС.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend (Modal)
    participant Bridge as Tauri Command
    participant Service as LibraryService
    participant FS as FileSystem (OS)

    User->>UI: Выделяет файл и жмет SPACE
    UI->>Bridge: invoke("get_asset_details", { id })
    
    Bridge->>Service: get_asset_details(id)
    Service->>Service: Найти Asset в индексе
    
    alt Если это Текст/Код
        Service->>FS: read_text_preview(path, limit=5kb)
        FS-->>Service: String content
    else Если это Изображение
        Service->>FS: get_absolute_path(path)
        FS-->>Service: Full Path
    end

    Service-->>Bridge: AssetDetailDto
    Bridge-->>UI: JSON Data
    
    UI->>UI: Открыть Overlay Modal
    UI->>UI: Отрисовать контент (High-res img или Code Block)
    UI-->>User: Показывает окно просмотра
```

## 3. Сценарий: Фильтрация по цвету (Локальная)

Показывает взаимодействие внутри Frontend, так как библиотека загружена в память (State).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as FilterPanel
    participant Store as LibraryStore (Zustand)
    participant Grid as MasonryGrid

    User->>View: Клик по желтому цвету (#FFD700)
    View->>Store: setFilter({ color: "#FFD700" })
    
    Store->>Store: Пересчет списка visibleAssets
    note right of Store: Фильтрация массива в памяти JS
    
    Store-->>Grid: Обновленные props (filtered items)
    Grid->>Grid: Layout Recalculation (позиции карточек)
    Grid-->>User: Анимация скрытия лишних карточек
```