> Диаграмма показывает поток данных от действия пользователя до сохранения на диск.

```mermaid
graph TD
    subgraph "Frontend (Webview)"
        User[Пользователь] -- "Drag & Drop / Click" --> ReactComp[React Components]
        ReactComp -- Action --> Store[Zustand Store]
        Store -- "invoke('import_files')" --> TauriBridge[Tauri IPC Bridge]
    end

    subgraph "Backend (Rust Core)"
        TauriBridge -- Call --> CmdHandler[Command Handler]
        
        subgraph "Application Services"
            CmdHandler -- "1. Create Asset" --> LibService[Library Service]
            LibService -- "2. Generate Thumb" --> ImgProcessor[Image Processor]
            LibService -- "3. Extract Color" --> ColorExtractor[Color Analysis]
        end

        subgraph "Infrastructure"
            LibService -- "4. Save Meta" --> Repo[JSON Repository]
            ImgProcessor -- "Write File" --> FileSys[File System]
            Repo -- "Write JSON" --> FileSys
        end
    end

    %% Обратная связь
    LibService -. "Event: 'scan_progress'" .-> TauriBridge
    TauriBridge -. "Update UI" .-> ReactComp
```

### Пояснение связей:

1. **Frontend -> Backend:**
    - Пользователь перетаскивает файлы.
    - React вызывает команду `import_files`.

2. **Backend Processing:**
    - `Library Service` получает пути к файлам.
    - Делегирует `Image Processor` создание уменьшенной копии.
    - Делегирует `Color Analysis` получение палитры.

3. **Persistence:**
    - Результаты собираются в структуру `Asset`.
    - `Repository` сохраняет обновленный список в `db.json`.

4. **Feedback:**
    - Так как операция долгая, Backend шлет события (Events) прогресса обратно на Frontend, чтобы обновить UI (Progress Bar).