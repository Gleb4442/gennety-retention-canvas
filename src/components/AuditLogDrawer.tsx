import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';
import type { AuditLogEntry, AuditActionType } from '../types';

const formatRelativeTime = (isoString: string) => {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    return new Date(isoString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const AuditLogDrawer: React.FC = () => {
  const { setCenter } = useReactFlow();
  const isOpen = useBoardStore((s) => s.isAuditDrawerOpen);
  const setIsOpen = useBoardStore((s) => s.setIsAuditDrawerOpen);
  const auditLogs = useBoardStore((s) => s.auditLogs);
  const fetchAuditLogs = useBoardStore((s) => s.fetchAuditLogs);
  const nodes = useBoardStore((s) => s.nodes);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);

  const [filterType, setFilterType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAuditLogs();
    setIsRefreshing(false);
  };

  const handleLogClick = (log: AuditLogEntry) => {
    if (!log.targetId) return;
    const targetNode = nodes.find((n) => n.id === log.targetId);
    if (targetNode) {
      setSelectedNodeId(targetNode.id);
      setCenter(targetNode.position.x + 150, targetNode.position.y + 100, {
        zoom: 1.1,
        duration: 800,
      });
    }
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'node_create':
        return { label: 'Узел создан', bg: 'bg-emerald-500/20 text-emerald-300' };
      case 'node_update':
        return { label: 'Узел изменён', bg: 'bg-amber-500/20 text-amber-300' };
      case 'node_delete':
        return { label: 'Узел удалён', bg: 'bg-rose-500/20 text-rose-300' };
      case 'nodes_move':
        return { label: 'Перемещение', bg: 'bg-blue-500/20 text-blue-300' };
      case 'edge_create':
        return { label: 'Связь создана', bg: 'bg-indigo-500/20 text-indigo-300' };
      case 'edge_delete':
        return { label: 'Связь удалена', bg: 'bg-rose-500/20 text-rose-300' };
      case 'version_create':
        return { label: 'Снимок версии', bg: 'bg-indigo-500/20 text-indigo-300' };
      case 'version_restore':
        return { label: 'Откат версии', bg: 'bg-purple-500/20 text-purple-300' };
      case 'drawing_add':
      case 'drawings_clear':
        return { label: 'Рисование', bg: 'bg-cyan-500/20 text-cyan-300' };
      case 'layout_change':
        return { label: 'Авто-лейаут', bg: 'bg-purple-500/20 text-purple-300' };
      case 'theme_change':
        return { label: 'Смена темы', bg: 'bg-sky-500/20 text-sky-300' };
      case 'project_rename':
        return { label: 'Переименование', bg: 'bg-violet-500/20 text-violet-300' };
      default:
        return { label: 'Действие', bg: 'bg-gray-500/20 text-gray-300' };
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (filterType === 'nodes') return log.actionType.startsWith('node');
    if (filterType === 'edges') return log.actionType.startsWith('edge');
    if (filterType === 'versions') return log.actionType.startsWith('version');
    if (filterType === 'drawings') return log.actionType.startsWith('drawing');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full minimal-modal flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl liquid-pill text-indigo-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Журнал изменений</h2>
              <p className="text-[11px] opacity-60">История всех правок и действий команды</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
              title="Обновить журнал"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={isRefreshing ? 'animate-spin' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Все' },
            { id: 'nodes', label: 'Карточки' },
            { id: 'edges', label: 'Связи' },
            { id: 'versions', label: 'Версии' },
            { id: 'drawings', label: 'Рисунки' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'opacity-60 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <p className="text-xs font-medium">История изменений пока пуста</p>
              <p className="text-[10px] mt-1">Любые добавления, правки или перемещения блоков фиксируются здесь</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              const hasTarget = Boolean(log.targetId && nodes.some((n) => n.id === log.targetId));

              return (
                <div
                  key={log.id}
                  onClick={() => handleLogClick(log)}
                  className={`p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] transition-all text-xs ${
                    hasTarget ? 'cursor-pointer hover:bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: log.userColor || '#3B82F6' }}
                      >
                        {log.userName ? log.userName.slice(0, 1).toUpperCase() : 'U'}
                      </span>
                      <span className="font-semibold text-[11px]">{log.userName}</span>
                    </div>

                    <span className="text-[10px] opacity-50 font-mono">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>

                  <p className="opacity-90 leading-snug mb-2 font-medium">{log.summary}</p>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`px-2 py-0.5 rounded-lg font-mono ${badge.bg}`}>
                      {badge.label}
                    </span>

                    {hasTarget && (
                      <span className="text-indigo-400 hover:underline flex items-center gap-1 font-mono">
                        К карточке →
                      </span>
                    )}
                  </div>

                  {log.diff && typeof log.diff === 'object' && Object.keys(log.diff).length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] text-[10px] opacity-70 font-mono space-y-0.5">
                      {Object.entries(log.diff).map(([key, val]) => (
                        <div key={key} className="truncate">
                          <span className="text-indigo-300">{key}:</span> {typeof val === 'string' ? `"${val}"` : JSON.stringify(val)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-black/[0.03] dark:bg-white/[0.03] text-[11px] opacity-60 flex items-center justify-between font-mono">
          <span>Всего событий: {filteredLogs.length}</span>
          <span>Горячая клавиша: ⌘L</span>
        </div>
      </div>
    </div>
  );
};
