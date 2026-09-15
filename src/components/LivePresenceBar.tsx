import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

export const LivePresenceBar: React.FC = () => {
  const { setCenter } = useReactFlow();
  const collabUser = useBoardStore((s) => s.collabUser);
  const collabPeers = useBoardStore((s) => s.collabPeers);
  const collabCursors = useBoardStore((s) => s.collabCursors);
  const userRole = useBoardStore((s) => s.userRole);
  const setCollabUserName = useBoardStore((s) => s.setCollabUserName);
  const setCollabUserColor = useBoardStore((s) => s.setCollabUserColor);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingName, setEditingName] = useState(collabUser?.name || '');

  const otherPeers = collabPeers.filter((p) => p.id !== collabUser?.id);
  const totalCount = otherPeers.length + 1;

  const handlePeerClick = (peerId: string) => {
    const cursor = collabCursors[peerId];
    if (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number') {
      setCenter(cursor.x, cursor.y, { zoom: 1.0, duration: 600 });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingName.trim()) {
      setCollabUserName(editingName.trim());
    }
    setIsProfileModalOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl liquid-pill text-xs select-none">
        {/* Active Online Indicator */}
        <div className="flex items-center gap-1.5 pr-1 border-r border-black/10 dark:border-white/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[11px] font-medium opacity-80 hidden md:inline">
            {totalCount === 1 ? 'Вы онлайн' : `${totalCount} онлайн`}
          </span>
        </div>

        {/* Stacked Peer Avatars */}
        <div className="flex items-center -space-x-1.5 overflow-visible pl-0.5">
          {/* Current User Avatar */}
          <button
            onClick={() => {
              setEditingName(collabUser?.name || '');
              setIsProfileModalOpen(true);
            }}
            className="relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white/50 dark:ring-black/50 transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: collabUser?.color || '#3B82F6' }}
            title={`Вы: ${collabUser?.name || 'Пользователь'} (${userRole === 'owner' ? 'Владелец' : userRole === 'viewer' ? 'Просмотр' : 'Редактор'}). Нажмите для смены имени`}
          >
            {getInitials(collabUser?.name || 'Вы')}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black/40" />
          </button>

          {/* Other Peers */}
          {otherPeers.slice(0, 4).map((peer) => {
            const hasCursor = Boolean(collabCursors[peer.id]);
            return (
              <button
                key={peer.id}
                onClick={() => handlePeerClick(peer.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white/50 dark:ring-black/50 transition-transform hover:scale-110 active:scale-95 ${
                  hasCursor ? 'cursor-pointer hover:ring-indigo-400' : 'cursor-default'
                }`}
                style={{ backgroundColor: peer.color || '#8B5CF6' }}
                title={`${peer.name} (${peer.role === 'viewer' ? 'Просмотр' : 'Редактор'})${
                  hasCursor ? ' — кликните для перехода к курсору' : ''
                }`}
              >
                {getInitials(peer.name)}
              </button>
            );
          })}

          {otherPeers.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center text-[9px] font-mono font-medium opacity-80 ring-2 ring-white/50 dark:ring-black/50">
              +{otherPeers.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl minimal-modal p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Ваш профиль в команде</h3>
                <p className="text-[11px] opacity-60">Коллеги видят ваше имя и цвет на доске</p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1">Отображаемое имя</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Ваше имя или должность..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium opacity-80 mb-1.5">Цвет курсора и метки</label>
                <div className="flex items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCollabUserColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        collabUser?.color === c
                          ? 'scale-125 ring-2 ring-white shadow-md'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs opacity-60 font-mono">
                <span>Ваша роль:</span>
                <span className="uppercase font-bold tracking-wider">
                  {userRole === 'owner' ? 'Владелец' : userRole === 'viewer' ? 'Только просмотр' : 'Редактор'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl liquid-pill text-xs opacity-75 hover:opacity-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md active:scale-95 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
