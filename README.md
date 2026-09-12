# GENITY // Strategic Retention Architecture Blueprint

> Production-ready, cyber-luxury single-page application (SPA) featuring an interactive, infinite node canvas visualizing the core retention model: **"Transforming a Dating Business into a Top Retention Leader via Community, Hardware Signaling, and Gym-Subscription Mechanics"**.

---

## ✨ Features & Capabilities

### 1. Pre-configured Strategic Blueprint (Exact Business Logic)
- **Node `shift_core` (Foundation)**: Сдвиг бизнес-модели дейтинга. Плата за комьюнити, статус и закрытый клуб вместо поиска пары.
- **Node `emotion_status` (Psychology)**: Чистые эмоции (1-я очередь), статус, пафос и социальная значимость (2-я очередь).
- **Node `hardware_beacon` (Hardware Engine)**: Физический маркер («сигналка»), рождающий эмоцию отличности и избранности.
- **Node `gym_model` (Retention Mechanism)**: Механика спортзала — оффлайн-ивенты как ритуал и эмоциональная привязка.
- **Node `event_duality` (Event Architecture)**: Двойственность — внешняя масштабность + внутренняя приватная камерность.
- **Node `anti_churn` (Lifecycle & Anti-Churn)**: Двухуровневая система апгрейдов: Hardware V2 + ротация форматов.
- **Node `goal_retention` (Outcome)**: Топ-1 Retention и рекордный LTV в App Store/Google Play.

### 2. Miro-like Interactive Canvas UX
- **Infinite Navigation**: Плавный Pan (Space+Drag), масштаб (Scroll Wheel), кнопки зума и пресеты (50%, 100%, 150%, Fit View).
- **Миникарта (MiniMap)**: Кибернетическая темная миникарта в нижнем правом углу с цветовой индикацией категорий.
- **CRUD блоков**:
  - `+ Add Card` — модальное окно создания карточки с выбором категории, метрик и стилей.
  - `Cmd / Ctrl + D` — быстрое дублирование выбранного узла со сдвигом.
  - `Delete / Backspace` — мгновенное удаление узла или связи.
  - Редактирование в живом инспекторе.
- **Интерактивные связи (Edges)**:
  - Drag точек узла (Top, Right, Bottom, Left) для создания связей.
  - Двойной клик на метку для быстрого переименования («материализуется через», «подстегивает», и т.д.).
  - Выбор типа линии: Smooth Bezier или Step Line, переключение анимации импульса.

### 3. Режимы расстановки (Layout Modes)
1. **Freeform**: Свободное перемещение карточек с автосохранением их позиций в `localStorage`.
2. **Pyramid Layout (Dagre)**: Автоматическая иерархическая пирамида уровней ценности от фундамента до конечного результата.
3. **Flywheel**: Круговой циклический маховик системы с динамическим распределением углов.

### 4. Inspector Sidebar & Зависимости
- Подробный просмотр и редактирование выбранной карточки: категория, заголовок, бейдж, описание, Key Metric, Outcome, заметки, цвет.
- **Граф входящих и исходящих зависимостей**: клик по связанному узлу плавно центрирует и приближает камеру к нему.

### 5. Поиск, Экспорт и Синхронизация
- **Command Palette (`⌘K` / `Ctrl+K`)**: Мгновенный поиск по названию, меткам, описанию и быстрый переход.
- **Undo / Redo (`⌘Z` / `⌘⇧Z`)**: Вся история действий сохраняется в стеке.
- **Экспорт в PNG**: Высокое разрешение для презентаций.
- **Экспорт и Импорт JSON**: Сохранение и загрузка конфигураций.
- **Сброс (Reset)**: Возврат к эталонному графу в один клик.

---

## 🚀 Запуск проекта

```bash
# 1. Перейдите в папку проекта
cd "/Users/pro/Desktop/Gennety Core Idea Visualization"

# 2. Запуск локального сервера разработки
npm run dev

# 3. Сборка для production
npm run build

# 4. Предпросмотр сборки
npm run preview
```

---

## 🛠 Стек технологий
- **React 19** + **TypeScript** + **Vite**
- **@xyflow/react** (React Flow v12)
- **Tailwind CSS** (Cyber-luxury Obsidian Dark Theme)
- **Zustand** (State Management & LocalStorage Persistence)
- **Dagre** (Авто-лейаут графов)
- **html-to-image** (Экспорт в PNG)
- **lucide-react** (Иконки)
