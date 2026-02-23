# 1. Архитектурный стиль

Приложение Splatera использует архитектуру Local Client-Server.

- **Frontend (Client):** Single Page Application (React), реализующий паттерн **MVVM** (Model-View-ViewModel) через React Hooks и State Management (Zustand).
- **Backend (Server):** Rust-процесс, управляемый Tauri, реализующий **Layered Architecture** (Слоистая архитектура).
- **Связь:** Асинхронный обмен сообщениями через **Tauri IPC Bridge** (Commands & Events).

# 2. Слои системы

Система делится на 4 основных логических уровня:

### Уровень 1: Presentation Layer (Frontend)

- **Responsibility:** Отрисовка интерфейса, обработка пользовательского ввода, состояние отображения.
- **Components:**
    - *React Components:* Виджеты UI (Masonry Grid, Search Bar, Modal).
    - *Stores (Zustand):* Клиентское состояние (список загруженных ассетов, текущий фильтр).
    - *API Client*: Обертки над вызовами invoke() Tauri.

### Уровень 2: Bridge Layer (Tauri IPC)

- **Responsibility:** Маршрутизация запросов от UI к бизнес-логике Rust. Сериализация/десериализация данных (JSON).
- **Components:**
    - *Tauri Commands:* Аннотированные функции `#[tauri::command].`

### Уровень 3: Application / Service Layer (Backend Logic)

- **Responsibility:** Реализация сценариев использования (Use Cases). Координация работы домена и инфраструктуры.
- **Components:**
    - *Library Service:* Логика добавления, обновления и удаления ассетов.
    - *Analysis Service:* Извлечение цветов, генерация превью (CPU-bound задачи).
    - *Search Service:* Фильтрация данных в памяти или через запрос к БД.

### Уровень 4: Infrastructure & Data Layer

- **Responsibility:** Физическое хранение данных и взаимодействие с ОС.
- **Components:**
    - *File Storage:* Чтение/запись файлов на диск (thumbnails, config).
    - *Database Repository:* Обертка над локальной БД (SQLite или JSON-файл).
    - *OS API:* Системные диалоги, буфер обмена.

# 3. Модули и их ответственность

Выделяем 6 ключевых модулей системы:

| Модуль | Слой | Ответственность |
|--------|------|------------------|
| UI Core | Frontend | Главное окно, сетка Masonry, модальные окна, темы оформления. |
| State Manager | Frontend | Хранение списка ассетов в памяти браузера, управление фильтрами, кеширование запросов. |
| Command Handlers | Backend | Точки входа (API). Принимают JSON от UI, вызывают сервисы, возвращают Result. |
| Scanner & Processor | Backend | "Тяжелый" модуль. Сканирует папки, создает миниатюры изображений (Image Processing), вычисляет хеши цветов. |
| Metadata Repository | Backend | CRUD операции с базой данных (метаданные файлов, теги, пути). Обеспечивает целостность данных. |
| Config Engine | Backend | Чтение/запись настроек пользователя (settings.json) и состояния приложения при выходе. |

# 4. Правило зависимостей

Строгая иерархия сверху вниз:

1. **UI** знает только о **Command Handlers** (через имена команд).
2. **Command Handlers** зависят от **Services**.
3. **Services** зависят от **Repository** и **Domain Models**.
4. **Domain Models** не зависят ни от кого (чистые структуры данных).
5. **Infrastructure** реализует интерфейсы, требуемые Сервисами.