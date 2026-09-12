import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { 
  parseCanvasJson, 
  AI_SYSTEM_PROMPT_TEMPLATE,
  type ParseResult 
} from '../lib/jsonProjectImporter';
import { CATEGORIES } from '../constants/categories';

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_MINIMAL_JSON = `{
  "title": "Онбординг воронка (Из скетча)",
  "description": "Схема пользовательского пути из рукописного наброска",
  "layoutMode": "freeform",
  "theme": "dark",
  "nodes": [
    {
      "id": "step_1",
      "position": { "x": 80, "y": 240 },
      "data": {
        "title": "РЕГИСТРАЦИЯ И АНКЕТА",
        "badge": "Шаг 1 • Вход",
        "category": "foundation",
        "description": "Быстрый вход через Apple ID или Telegram. Проверка базовых критериев.",
        "keyMetric": "CR 75%",
        "outcome": "Верифицированная заявка"
      }
    },
    {
      "id": "step_2",
      "position": { "x": 500, "y": 240 },
      "data": {
        "title": "ДОСТАВКА ЦЕННОСТИ (AHA-MOMENT)",
        "badge": "Шаг 2 • Эмоция",
        "category": "psychology",
        "description": "Демонстрация эксклюзивного окружения и социальное доказательство статуса.",
        "keyMetric": "Aha за 90 сек",
        "outcome": "Эмоциональный восторг"
      }
    },
    {
      "id": "step_3",
      "position": { "x": 920, "y": 240 },
      "data": {
        "title": "ПРИВЫЧКА И УДЕРЖАНИЕ",
        "badge": "Шаг 3 • Ритуал",
        "category": "retention",
        "description": "Регулярный возврат через мероприятия и еженедельные клубные апдейты.",
        "keyMetric": "D30 > 50%",
        "outcome": "LTV 12+ месяцев"
      }
    }
  ],
  "edges": [
    {
      "id": "e_1_2",
      "source": "step_1",
      "target": "step_2",
      "label": "Анкета одобрена",
      "animated": true,
      "styleType": "bezier"
    },
    {
      "id": "e_2_3",
      "source": "step_2",
      "target": "step_3",
      "label": "Активация статуса",
      "animated": true,
      "styleType": "bezier"
    }
  ]
}`;

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose }) => {
  const [jsonText, setJsonText] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'prompt' | 'spec'>('editor');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [replaceCurrentCanvas, setReplaceCurrentCanvas] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const importProjectFromJson = useBoardStore((s) => s.importProjectFromJson);
  const setNodes = useBoardStore((s) => s.setNodes);
  const setEdges = useBoardStore((s) => s.setEdges);
  const setLayoutMode = useBoardStore((s) => s.setLayoutMode);
  const setTheme = useBoardStore((s) => s.setTheme);
  const saveSnapshot = useBoardStore((s) => s.saveSnapshot);
  const setIsAiBridgeModalOpen = useBoardStore((s) => s.setIsAiBridgeModalOpen);

  // Validate on text change
  useEffect(() => {
    if (!jsonText.trim()) {
      setParseResult(null);
      return;
    }
    const res = parseCanvasJson(jsonText, titleOverride.trim() || undefined);
    setParseResult(res);
  }, [jsonText, titleOverride]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_SYSTEM_PROMPT_TEMPLATE);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = AI_SYSTEM_PROMPT_TEMPLATE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonText(content);
      if (!titleOverride) {
        setTitleOverride(file.name.replace(/\.json$/i, ''));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleInsertSample = () => {
    setJsonText(SAMPLE_MINIMAL_JSON);
    setTitleOverride('Онбординг воронка (Пример)');
  };

  const handleExecuteImport = () => {
    if (!parseResult || !parseResult.success || !parseResult.project) {
      alert(parseResult?.error || 'Пожалуйста, введите корректный JSON-код схемы.');
      return;
    }

    if (replaceCurrentCanvas) {
      if (confirm('Заменить текущий открытый холст содержимым этого JSON? Несохраненные изменения будут перезаписаны.')) {
        saveSnapshot();
        setNodes(parseResult.project.nodes);
        setEdges(parseResult.project.edges);
        setLayoutMode(parseResult.project.layoutMode);
        setTheme(parseResult.project.theme);
        onClose();
        setJsonText('');
      }
    } else {
      // Import as a distinct new project in Personal Cabinet
      const res = importProjectFromJson(JSON.stringify(parseResult.project), parseResult.project.title);
      if (!res.success) {
        alert(res.error || 'Ошибка при сохранении проекта');
      } else {
        onClose();
        setJsonText('');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl liquid-glass shadow-2xl z-10 border border-black/15 dark:border-white/10 animate-in zoom-in-95 duration-150 overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".json,application/json,text/plain" 
          className="hidden" 
        />

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-zinc-900 dark:text-white">
                  Импорт схемы по JSON / AI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10">
                  A4 → Canvas
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Вставьте JSON от ChatGPT/Claude или загрузите файл проекта
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
            title="Закрыть"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-black/10 dark:border-white/10 bg-zinc-50/50 dark:bg-black/15">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeTab === 'editor'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5'
              }`}
            >
              Вставить JSON-код
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'prompt'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5'
              }`}
            >
              <span>🤖 Промпт для нейросети</span>
            </button>
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeTab === 'spec'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5'
              }`}
            >
              📖 Спецификация схемы
            </button>
          </div>

          {/* Quick File & Sample Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-zinc-100 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] font-mono text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors border border-black/10 dark:border-white/10 shadow-xs"
              title="Загрузить .json файл с диска"
            >
              <svg className="w-3 h-3 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Файл .json</span>
            </button>

            <button
              type="button"
              onClick={handleInsertSample}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-zinc-100 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] font-mono text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/10 dark:border-white/10 shadow-xs"
              title="Вставить тестовый пример схемы"
            >
              Пример
            </button>
          </div>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[58vh]">
          {activeTab === 'editor' && (
            <div className="space-y-3">
              {/* Optional Custom Title */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                    Название проекта (необязательно, можно взять из JSON)
                  </label>
                  <input
                    type="text"
                    value={titleOverride}
                    onChange={(e) => setTitleOverride(e.target.value)}
                    placeholder="Например: Новая воронка онбординга"
                    className="w-full px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 border border-black/10 dark:border-white/15 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white/30"
                  />
                </div>
              </div>

              {/* JSON Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`Вставьте сюда JSON-код (или ответ ChatGPT в блоке \`\`\`json ... \`\`\`):\n\n{\n  "title": "Моя стратегия",\n  "nodes": [...],\n  "edges": [...]\n}`}
                  rows={13}
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-black/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white/30 resize-y leading-relaxed border border-black/15 dark:border-white/10 shadow-inner"
                  spellCheck={false}
                />

                {jsonText && (
                  <button
                    onClick={() => setJsonText('')}
                    className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {/* Live Validation & Status Banner */}
              {parseResult && (
                <div className="animate-in fade-in duration-150">
                  {parseResult.success && parseResult.stats ? (
                    <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-white/[0.04] border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-zinc-900 dark:text-white">Синтаксис корректен: «{parseResult.stats.title}»</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>Карточек: {parseResult.stats.nodeCount}</span>
                          <span>•</span>
                          <span>Связей: {parseResult.stats.edgeCount}</span>
                        </div>
                      </div>

                      {/* Category Chips */}
                      {Object.keys(parseResult.stats.categories).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(parseResult.stats.categories).map(([cat, count]) => {
                            const def = CATEGORIES[cat as keyof typeof CATEGORIES];
                            return (
                              <span
                                key={cat}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1 bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 shadow-xs"
                                style={{ borderColor: `${def?.accentHue || '#94A3B8'}50` }}
                              >
                                <span 
                                  className="w-1.5 h-1.5 rounded-full" 
                                  style={{ backgroundColor: def?.accentHue || '#94A3B8' }} 
                                />
                                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{def?.label || cat}:</span>
                                <span className="font-bold text-zinc-950 dark:text-white">{count}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Warnings if any */}
                      {parseResult.warnings && parseResult.warnings.length > 0 && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-mono pt-1">
                          {parseResult.warnings.map((w, i) => (
                            <div key={i}>⚠️ {w}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <span className="text-rose-500 font-bold">✕</span>
                      <div className="space-y-1">
                        <div className="font-semibold">Ошибка разбора JSON:</div>
                        <div className="font-mono text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                          {parseResult.error}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Mode Radio */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/70 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-300">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 font-medium">Режим импорта:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={!replaceCurrentCanvas}
                      onChange={() => setReplaceCurrentCanvas(false)}
                      className="accent-zinc-900 dark:accent-white"
                    />
                    <span className={!replaceCurrentCanvas ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>
                      Создать как новый проект
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={replaceCurrentCanvas}
                      onChange={() => setReplaceCurrentCanvas(true)}
                      className="accent-zinc-900 dark:accent-white"
                    />
                    <span className={replaceCurrentCanvas ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>
                      Заменить текущий холст
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-4">
              {/* Master AI Agent & MCP Bridge Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-display font-semibold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>🤖 Полный системный промпт со всеми адресами и MCP-сервер</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Скопируйте мастер-промпт с вашим ключом доступа, ссылками авто-входа и подключите Claude Desktop / Cursor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsAiBridgeModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex-shrink-0 transition-colors shadow-sm"
                >
                  Открыть AI Мост
                </button>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-display font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>📸 Как превратить рисунок от руки на листе А4 в интерактивную онлайн-схему:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <li>Сфотографируйте свой набросок схемы со стрелками на бумаге или вайтборде.</li>
                  <li>Нажмите кнопку ниже, чтобы скопировать готовый промпт.</li>
                  <li>Откройте ChatGPT (GPT-4o) или Claude 3.5 Sonnet, прикрепите фото и отправьте этот промпт.</li>
                  <li>Скопируйте сгенерированный нейросетью код и вставьте во вкладку «Вставить JSON-код».</li>
                </ol>
              </div>

              {/* Copy Prompt Button */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                  Системный промпт для ChatGPT / Claude
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold flex items-center gap-2 transition-transform hover:scale-105 shadow-sm"
                >
                  {copiedPrompt ? (
                    <>
                      <span className="text-zinc-200 dark:text-zinc-800 font-bold">✓</span>
                      <span>Скопировано в буфер!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Скопировать промпт для нейросети</span>
                    </>
                  )}
                </button>
              </div>

              {/* Readonly Prompt Preview */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-black/50 dark:text-zinc-300 border border-black/10 dark:border-white/10 text-[11px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed shadow-inner">
                {AI_SYSTEM_PROMPT_TEMPLATE}
              </div>
            </div>
          )}

          {activeTab === 'spec' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 space-y-2">
                <div className="font-semibold text-zinc-900 dark:text-white">Категории карточек и их цвета:</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(CATEGORIES).map((cat) => (
                    <div 
                      key={cat.id} 
                      className="p-2.5 rounded-xl bg-white dark:bg-white/10 flex items-start gap-2 border border-black/10 dark:border-white/10 shadow-xs"
                    >
                      <span 
                        className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" 
                        style={{ backgroundColor: cat.accentHue }} 
                      />
                      <div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white text-[11px]">
                          "{cat.id}"
                        </div>
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                          {cat.label} • {cat.badgeDefault}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 space-y-2">
                <div className="font-semibold text-zinc-900 dark:text-white">Рекомендации по координатам:</div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  По горизонтали (шаги слева направо): <code className="text-zinc-900 dark:text-zinc-200 font-mono font-medium">X + 420 px</code> (например: 80 → 500 → 920 → 1340).<br />
                  По вертикали (параллельные ветки): <code className="text-zinc-900 dark:text-zinc-200 font-mono font-medium">Y + 240 px</code> (например: 100 → 340 → 580).<br />
                  <span className="text-zinc-500">Если координаты не указаны, приложение расставит карточки автоматически.</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Полная документация находится в репозитории: <code className="text-zinc-800 dark:text-zinc-200 font-mono">CANVAS_JSON_AI_SPECIFICATION.md</code>
                </span>
                <button
                  onClick={() => {
                    handleInsertSample();
                    setActiveTab('editor');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 dark:bg-white/10 dark:hover:bg-white/20 text-xs text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white border border-black/10 dark:border-white/10 shadow-xs transition-colors"
                >
                  Вставить тестовый шаблон →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-black/10 dark:border-white/10 bg-zinc-100/70 dark:bg-black/30">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {activeTab === 'editor' && parseResult?.success && (
              <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>✓ Готово к импорту:</span>
                <span className="font-semibold text-zinc-950 dark:text-white">{parseResult.stats?.title}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
            >
              Отмена
            </button>

            {activeTab === 'editor' ? (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!parseResult?.success}
                className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  parseResult?.success
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 hover:scale-105 shadow-md'
                    : 'bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 opacity-60 cursor-not-allowed border border-black/5 dark:border-white/5'
                }`}
              >
                {replaceCurrentCanvas ? 'Заменить холст' : 'Импортировать проект'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold tracking-wide transition-all hover:scale-105 shadow-sm"
              >
                Перейти к вставке JSON →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
