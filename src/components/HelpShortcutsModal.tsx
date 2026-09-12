import React from 'react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space + Drag', desc: 'Свободное перемещение по холсту (Pan)' },
    { key: 'Scroll Wheel', desc: 'Плавное масштабирование (Zoom)' },
    { key: '⌘ / Ctrl + I', desc: 'Импорт схемы по коду JSON / AI-промпту' },
    { key: '⌘ / Ctrl + O', desc: 'Открыть Личный кабинет проектов' },
    { key: '⌘ / Ctrl + ,', desc: 'Карта настроек ключа и аккаунта' },
    { key: '⌘ / Ctrl + D', desc: 'Дублировать выделенную карточку' },
    { key: 'Delete / Backspace', desc: 'Удалить выделенную карточку или связь' },
    { key: '⌘ / Ctrl + Z', desc: 'Отменить действие (Undo)' },
    { key: '⌘ / Ctrl + ⇧ + Z', desc: 'Повторить действие (Redo)' },
    { key: '⌘ / Ctrl + K', desc: 'Открыть поиск по узлам' },
    { key: 'Click на связь', desc: 'Инспектор и настройка линии связи' },
    { key: '2x Click на метку', desc: 'Быстрое редактирование текста связи' },
    { key: 'Drag точек узла', desc: 'Протянуть связь к другой карточке' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xl animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg liquid-glass rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-current/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center opacity-90">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-inherit">
                Горячие Клавиши & Темы
              </h2>
              <p className="text-[11px] opacity-60 font-mono">
                Miro-управление холстом Gennety Canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-1.5">
            {shortcuts.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl liquid-pill"
              >
                <span className="opacity-80">{s.desc}</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded-lg liquid-pill font-medium">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl liquid-pill flex items-start gap-2.5 opacity-90">
            <span className="w-2 h-2 rounded-full bg-current mt-1 flex-shrink-0 opacity-70" />
            <p className="text-[11px] leading-relaxed opacity-85">
              Поддерживаются 4 темы: <strong>Dark Obsidian</strong> (глубокий обсидиан), <strong>Liquid Pearl</strong> (светлый жемчуг), <strong>Graphite Gray</strong> (матовый графит) и <strong>Monochrome B&W</strong> (строгий чёрно-белый). Переключатель находится в правом островке управления.
            </p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-current/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl liquid-pill font-medium text-xs hover:liquid-pill-active transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
