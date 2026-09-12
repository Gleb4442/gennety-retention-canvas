import React, { useState, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { maskAccessKey, generateAccessKey } from '../lib/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSwitchingKey, setIsSwitchingKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [switchError, setSwitchError] = useState('');

  const backupInputRef = useRef<HTMLInputElement>(null);

  const accessKey = useBoardStore((s) => s.accessKey);
  const login = useBoardStore((s) => s.login);
  const logout = useBoardStore((s) => s.logout);
  const exportAllProjectsJson = useBoardStore((s) => s.exportAllProjectsJson);
  const importBackupJson = useBoardStore((s) => s.importBackupJson);
  const projects = useBoardStore((s) => s.projects);

  if (!isOpen) return null;

  const handleCopyKey = async () => {
    if (!accessKey) return;
    try {
      await navigator.clipboard.writeText(accessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      const t = document.createElement('textarea');
      t.value = accessKey;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleExportBackup = () => {
    const json = exportAllProjectsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `retention-canvas-backup-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const res = importBackupJson(content);
      if (!res.success) {
        alert(res.error || 'Ошибка импорта резервной копии');
      } else {
        alert('Резервная копия успешно восстановлена!');
        onClose();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSwitchKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError('');
    if (!newKeyInput.trim()) {
      setSwitchError('Введите ключ');
      return;
    }

    const res = login(newKeyInput.trim());
    if (!res.success) {
      setSwitchError(res.error || 'Неверный ключ');
      return;
    }

    setIsSwitchingKey(false);
    setNewKeyInput('');
    onClose();
  };

  const handleGenerateNewKey = () => {
    if (confirm('Сгенерировать новый ключ? Ваш текущий ключ перестанет быть активным в этом браузере, но проекты под ним сохранятся.')) {
      const freshKey = generateAccessKey();
      login(freshKey);
      alert(`Сгенерирован новый ключ: ${freshKey}\nСохраните его!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={backupInputRef}
        onChange={handleBackupFileChange}
        accept=".json"
        className="hidden"
      />

      <div 
        className="relative w-full max-w-lg p-6 rounded-3xl liquid-glass shadow-2xl border border-white/10 animate-in zoom-in-95 duration-150 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center text-cyan-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Настройки доступа
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Управление ключом, бэкапами и аккаунтом
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Section 1: Access Key Card */}
        <div className="p-4 rounded-2xl liquid-pill border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase tracking-wider text-[10px]">
              Активный ключ доступа
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">Авторизован</span>
            </div>
          </div>

          {/* Key Box */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-sm tracking-wider text-cyan-300 select-all">
              {showFullKey ? accessKey : maskAccessKey(accessKey || '')}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowFullKey(!showFullKey)}
                className="p-1.5 rounded-lg liquid-pill text-zinc-400 hover:text-white transition-colors"
                title={showFullKey ? 'Скрыть символы' : 'Показать полный ключ'}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showFullKey ? (
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  ) : (
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                onClick={handleCopyKey}
                className="px-2.5 py-1.5 rounded-lg liquid-pill text-[11px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                title="Копировать ключ"
              >
                {copiedKey ? (
                  <span className="text-emerald-400 flex items-center gap-1">✓ Скопирован</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Копировать
                  </span>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Этот ключ привязывает все ваши Canvas-проекты (всего: {projects.length}) к вашему профилю. Сохраните его, чтобы иметь доступ с любого другого компьютера или телефона.
          </p>

          {/* Switch / Change Key Subform */}
          {isSwitchingKey ? (
            <form onSubmit={handleSwitchKeySubmit} className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeyInput}
                  onChange={(e) => {
                    setNewKeyInput(e.target.value);
                    setSwitchError('');
                  }}
                  placeholder="Введите другой ключ..."
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-xl liquid-pill text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl liquid-pill-active text-xs font-semibold text-white"
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => setIsSwitchingKey(false)}
                  className="px-2.5 py-1.5 rounded-xl liquid-pill text-xs text-zinc-400 hover:text-white"
                >
                  Отмена
                </button>
              </div>
              {switchError && (
                <div className="text-[10px] text-rose-400 font-mono">{switchError}</div>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSwitchingKey(true)}
                className="text-[11px] text-zinc-400 hover:text-cyan-300 font-mono underline underline-offset-2 transition-colors"
              >
                Войти по другому ключу
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-[11px] text-zinc-400 hover:text-cyan-300 font-mono underline underline-offset-2 transition-colors"
              >
                Создать новый ключ
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Backup Hub */}
        <div className="p-4 rounded-2xl liquid-pill border border-white/5 space-y-3">
          <div className="text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
            Резервное копирование всех проектов
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2.5 rounded-xl liquid-pill text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
            >
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Скачать бэкап</span>
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl liquid-pill text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
            >
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>Восстановить</span>
            </button>
          </div>
        </div>

        {/* Section 3: Logout Action */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              if (confirm('Вы уверены, что хотите выйти? Проекты сохранятся под вашим ключом доступа.')) {
                logout();
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-xl liquid-pill text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Выйти из кабинета</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl liquid-pill text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
