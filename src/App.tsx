import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { AddNodeModal } from './components/AddNodeModal';
import { SearchModal } from './components/SearchModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';
import { AuthGate } from './components/AuthGate';
import { PersonalCabinetModal } from './components/PersonalCabinetModal';
import { NewProjectModal } from './components/NewProjectModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportJsonModal } from './components/ImportJsonModal';
import { useBoardStore } from './store/useBoardStore';

export const App: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const isAuthenticated = useBoardStore((s) => s.isAuthenticated);
  const isCabinetOpen = useBoardStore((s) => s.isCabinetOpen);
  const setIsCabinetOpen = useBoardStore((s) => s.setIsCabinetOpen);
  const isNewProjectModalOpen = useBoardStore((s) => s.isNewProjectModalOpen);
  const setIsNewProjectModalOpen = useBoardStore((s) => s.setIsNewProjectModalOpen);
  const isSettingsOpen = useBoardStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useBoardStore((s) => s.setIsSettingsOpen);
  const isImportJsonModalOpen = useBoardStore((s) => s.isImportJsonModalOpen);
  const setIsImportJsonModalOpen = useBoardStore((s) => s.setIsImportJsonModalOpen);

  const theme = useBoardStore((s) => s.theme);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);

  // Sync theme class to document body / html
  useEffect(() => {
    document.documentElement.classList.remove(
      'theme-dark',
      'theme-light',
      'theme-graphite',
      'theme-monochrome',
      'theme-stone',
      'theme-slate',
      'theme-sand',
      'theme-mist',
      'dark'
    );
    document.documentElement.classList.add(`theme-${theme}`);
    const isLight = ['light', 'sand', 'mist'].includes(theme);
    if (!isLight) {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Global keyboard shortcuts for Projects, Cabinet, and Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return;
      }

      // Cmd+O or Cmd+Shift+P -> Open Projects / Cabinet
      if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || (e.shiftKey && e.key.toLowerCase() === 'p'))) {
        e.preventDefault();
        setIsCabinetOpen(!isCabinetOpen);
      }

      // Cmd+, -> Open Settings Card
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(!isSettingsOpen);
      }

      // Cmd+I -> Open Import JSON / AI Modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsImportJsonModalOpen(!isImportJsonModalOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCabinetOpen, setIsCabinetOpen, isSettingsOpen, setIsSettingsOpen, isImportJsonModalOpen, setIsImportJsonModalOpen]);

  const handleSelectSearchedNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  // If not authenticated via access key, show executive login gate
  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <ReactFlowProvider>
      <div 
        className={`theme-${theme} relative w-screen h-screen overflow-hidden transition-colors duration-200`} 
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        {/* Top Executive Frameless Liquid Glass Bar */}
        <Navbar
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenSearchModal={() => setIsSearchModalOpen(true)}
          onOpenHelpModal={() => setIsHelpModalOpen(true)}
          onOpenCabinet={() => setIsCabinetOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenImportJson={() => setIsImportJsonModalOpen(true)}
        />

        {/* Infinite Interactive Node Canvas */}
        <Canvas onOpenSearchModal={() => setIsSearchModalOpen(true)} />

        {/* Add Card Modal */}
        <AddNodeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />

        {/* Search Command Palette */}
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectNode={handleSelectSearchedNode}
        />

        {/* Shortcuts & Help Guide Modal */}
        <HelpShortcutsModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />

        {/* Personal Cabinet / Workspace Manager */}
        <PersonalCabinetModal
          isOpen={isCabinetOpen}
          onClose={() => setIsCabinetOpen(false)}
          onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
          onOpenSettings={() => {
            setIsCabinetOpen(false);
            setIsSettingsOpen(true);
          }}
          onOpenImportJson={() => {
            setIsCabinetOpen(false);
            setIsImportJsonModalOpen(true);
          }}
        />

        {/* Create New Project Modal */}
        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
          onOpenImportJson={() => {
            setIsNewProjectModalOpen(false);
            setIsImportJsonModalOpen(true);
          }}
        />

        {/* Dedicated Access Key & Account Settings Card */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Import from JSON Code / AI Modal */}
        <ImportJsonModal
          isOpen={isImportJsonModalOpen}
          onClose={() => setIsImportJsonModalOpen(false)}
        />
      </div>
    </ReactFlowProvider>
  );
};

export default App;
