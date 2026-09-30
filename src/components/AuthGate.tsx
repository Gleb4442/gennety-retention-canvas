import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ButterflyLogo } from './ButterflyLogo';
import { generateAccessKey } from '../lib/auth';

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'generate'>('login');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const login = useBoardStore((s) => s.login);
  const theme = useBoardStore((s) => s.theme);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = login(inputKey);
    if (!res.success) {
      setError(res.error || 'Неверный формат ключа доступа');
    }
  };

  const handleGenerateClick = () => {
    const key = generateAccessKey();
    setGeneratedKey(key);
    setIsCopied(false);
    setError('');
  };

  const handleCopyGenerated = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = generatedKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleLoginWithGenerated = () => {
    if (!generatedKey) return;
    const res = login(generatedKey);
    if (!res.success) {
      setError(res.error || 'Ошибка при входе');
    }
  };

  const handleDemoLogin = () => {
    const demoKey = 'GNTY-DEMO-2026-CORE';
    login(demoKey);
  };

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden select-none px-4" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-rose-950/20 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[160px] pointer-events-none" />

      {/* Main Glass Panel */}
      <div className="relative w-full max-w-md p-8 rounded-3xl liquid-glass shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-2xl liquid-pill flex items-center justify-center p-2.5 mb-4 shadow-xl">
            <ButterflyLogo theme={theme} className="w-full h-full" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-white mb-1">
            Gennety Canvas
          </h1>
          <p className="text-xs font-mono text-zinc-400 max-w-xs">
            Стратегический хаб удержания пользователей и архитектуры продуктов Gennety
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl liquid-pill mb-6 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === 'login' ? 'liquid-pill-active font-semibold shadow-md' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Войти по ключу
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('generate');
              setError('');
              if (!generatedKey) handleGenerateClick();
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === 'generate' ? 'liquid-pill-active font-semibold shadow-md' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Создать ключ
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 text-rose-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Mode 1: Login */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Ключ доступа (Access Key)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
                >
                  {showKey ? 'Скрыть' : 'Показать'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setError('');
                  }}
                  placeholder="GNTY-XXXX-XXXX-XXXX"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl font-mono text-sm tracking-wider liquid-pill text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-500">
                Введите ключ, полученный при регистрации или создании кабинета.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl liquid-pill-active font-semibold text-xs text-white tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Войти в личный кабинет</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('generate');
                  if (!generatedKey) handleGenerateClick();
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Нет ключа? <span className="underline underline-offset-2">Создать новый персональный ключ</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Generate Key */}
        {mode === 'generate' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl liquid-pill">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ваш уникальный ключ</span>
                <span className="text-[10px] text-zinc-400 font-normal">Единожды создаваемый</span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 flex items-center justify-between gap-2 mb-3">
                <span className="font-mono font-bold text-sm tracking-wider text-zinc-100 select-all break-all">
                  {generatedKey || 'Генерация...'}
                </span>

                <button
                  type="button"
                  onClick={handleCopyGenerated}
                  className="px-2.5 py-1.5 rounded-lg liquid-pill text-[11px] font-mono flex items-center gap-1 hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Скопировать ключ"
                >
                  {isCopied ? (
                    <span className="text-zinc-200 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Скопировано
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-300">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Копировать
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-zinc-400 flex-shrink-0">⚠️</span>
                <span>
                  <strong>Сохраните этот ключ!</strong> Он используется для авторизации в вашем личном кабинете на всех устройствах и доступа ко всем вашим сохранённым Canvas-проектам.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateClick}
                className="px-4 py-3 rounded-xl liquid-pill text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                title="Сгенерировать другой ключ"
              >
                Обновить
              </button>

              <button
                type="button"
                onClick={handleLoginWithGenerated}
                className="flex-1 py-3 rounded-xl liquid-pill-active font-semibold text-xs text-white tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Войти и создать проекты</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Footer / Demo shortcut */}
        <div className="mt-7 pt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Gennety Retention Hub v2.0</span>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Быстрый демо-вход
          </button>
        </div>
      </div>
    </div>
  );
};
