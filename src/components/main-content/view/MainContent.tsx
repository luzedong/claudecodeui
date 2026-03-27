import React, { useCallback, useEffect, useState } from 'react';
import FileTree from '../../file-tree/view/FileTree';
import StandaloneShell from '../../standalone-shell/view/StandaloneShell';
import GitPanel from '../../git-panel/view/GitPanel';
import PluginTabContent from '../../plugins/view/PluginTabContent';
import type { MainContentProps, ShellInstance, ShellMode } from '../types/types';
import { useTaskMaster } from '../../../contexts/TaskMasterContext';
import { useTasksSettings } from '../../../contexts/TasksSettingsContext';
import { useEditorSidebar } from '../../code-editor/hooks/useEditorSidebar';
import EditorSidebar from '../../code-editor/view/EditorSidebar';
import type { Project, ProjectSession } from '../../../types/app';
import { TaskMasterPanel } from '../../task-master';
import MainContentHeader from './subcomponents/MainContentHeader';
import MainContentStateView from './subcomponents/MainContentStateView';
import ShellProviderSelection from '../../shell/view/subcomponents/ShellProviderSelection';
import { cn } from '../../../lib/utils';

// Chat-related features are disabled. Main area is now driven by shell/files/git only.

type TaskMasterContextValue = {
  currentProject?: Project | null;
  setCurrentProject?: ((project: Project) => void) | null;
};

type TasksSettingsContextValue = {
  tasksEnabled: boolean;
  isTaskMasterInstalled: boolean | null;
  isTaskMasterReady: boolean | null;
};

function createShellInstance(
  mode: ShellMode,
  project: Project,
  session: ProjectSession | null,
  fromHistory: boolean,
): ShellInstance {
  const baseTitle =
    session?.title ||
    session?.summary ||
    session?.name ||
    (fromHistory ? '会话' : 'Shell');

  const providerPrefix =
    mode === 'claude' ? 'Claude' : mode === 'codex' ? 'Codex' : 'System';

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mode,
    project,
    session,
    fromHistory,
    title: session ? `${providerPrefix} · ${baseTitle}` : `${providerPrefix} Shell`,
  };
}

function getShellModeFromSession(session: ProjectSession | null | undefined): ShellMode {
  const provider = session?.__provider;
  if (provider === 'codex') {
    return 'codex';
  }
  // Map any other provider (claude / cursor / gemini / unknown) to Claude shell
  return 'claude';
}

function MainContent({
  selectedProject,
  selectedSession,
  activeTab,
  setActiveTab,
  isMobile,
  onMenuClick,
  isLoading,
  shellProviderSelectionOpen,
  onShellProviderSelectionDone,
  onShellProviderSelectionOpen,
}: MainContentProps) {
  const { currentProject, setCurrentProject } = useTaskMaster() as TaskMasterContextValue;
  const { tasksEnabled, isTaskMasterInstalled } = useTasksSettings() as TasksSettingsContextValue;

  const shouldShowTasksTab = Boolean(tasksEnabled && isTaskMasterInstalled);

  const {
    editingFile,
    editorWidth,
    editorExpanded,
    hasManualWidth,
    resizeHandleRef,
    handleFileOpen,
    handleCloseEditor,
    handleToggleEditorExpand,
    handleResizeStart,
  } = useEditorSidebar({
    selectedProject,
    isMobile,
  });

  const [shellInstances, setShellInstances] = useState<ShellInstance[]>([]);
  const [activeShellId, setActiveShellId] = useState<string | null>(null);

  const handleCreateShell = useCallback(
    (mode: ShellMode) => {
      if (!selectedProject) {
        return;
      }

      setShellInstances((prev) => {
        const newInstance = createShellInstance(mode, selectedProject, null, false);
        setActiveShellId(newInstance.id);
        return [...prev, newInstance];
      });

      if (typeof window !== 'undefined') {
        try {
          const provider = mode === 'system' ? 'claude' : mode;
          window.localStorage.setItem('selected-provider', provider);
        } catch {
          // ignore
        }
      }

      onShellProviderSelectionDone?.();
    },
    [onShellProviderSelectionDone, selectedProject],
  );

  // Keep TaskMaster's current project in sync with selection.
  useEffect(() => {
    const selectedProjectName = selectedProject?.name;
    const currentProjectName = currentProject?.name;

    if (selectedProject && selectedProjectName !== currentProjectName) {
      setCurrentProject?.(selectedProject);
    }
  }, [selectedProject, currentProject?.name, setCurrentProject]);

  // Ensure active tab falls back to shell when tasks tab is unavailable.
  useEffect(() => {
    if (!shouldShowTasksTab && activeTab === 'tasks') {
      setActiveTab('shell');
    }
  }, [shouldShowTasksTab, activeTab, setActiveTab]);

  // When project changes, reset shell instances to a single default shell for that project.
  useEffect(() => {
    if (!selectedProject) {
      setShellInstances([]);
      setActiveShellId(null);
      return;
    }

    setShellInstances((prev) => {
      const projectInstances = prev.filter(
        (instance) => instance.project.name === selectedProject.name,
      );

      if (projectInstances.length === 0) {
        const initialInstance = createShellInstance('system', selectedProject, null, false);
        setActiveShellId(initialInstance.id);
        return [initialInstance];
      }

      // Ensure activeShellId is still valid for this project.
      setActiveShellId((current) => {
        if (current && projectInstances.some((instance) => instance.id === current)) {
          return current;
        }
        return projectInstances[0]?.id ?? null;
      });

      return projectInstances;
    });
  }, [selectedProject?.name]);

  // When a session is selected from history, create or focus a shell instance for that session.
  useEffect(() => {
    if (!selectedProject || !selectedSession) {
      return;
    }

    setShellInstances((prev) => {
      const existing = prev.find(
        (instance) => instance.session && instance.session.id === selectedSession.id,
      );

      if (existing) {
        setActiveShellId(existing.id);
        return prev;
      }

      const mode = getShellModeFromSession(selectedSession);
      const newInstance = createShellInstance(mode, selectedProject, selectedSession, true);
      setActiveShellId(newInstance.id);
      return [...prev, newInstance];
    });
  }, [selectedProject?.name, selectedSession?.id]);

  const handleCloseShell = useCallback((id: string) => {
    setShellInstances((prev) => {
      if (prev.length === 0) return prev;

      const index = prev.findIndex((instance) => instance.id === id);
      if (index === -1) return prev;

      const nextInstances = [...prev.slice(0, index), ...prev.slice(index + 1)];

      setActiveShellId((current) => {
        if (current !== id) {
          return current;
        }
        if (nextInstances.length === 0) {
          return null;
        }
        const fallback = nextInstances[Math.min(index, nextInstances.length - 1)];
        return fallback.id;
      });

      return nextInstances;
    });
  }, []);

  if (isLoading) {
    return <MainContentStateView mode="loading" isMobile={isMobile} onMenuClick={onMenuClick} />;
  }

  if (!selectedProject) {
    return <MainContentStateView mode="empty" isMobile={isMobile} onMenuClick={onMenuClick} />;
  }

  return (
    <div className="flex h-full flex-col">
      <MainContentHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        shouldShowTasksTab={shouldShowTasksTab}
        isMobile={isMobile}
        onMenuClick={onMenuClick}
        shellInstances={shellInstances}
        activeShellId={activeShellId}
        onChangeActiveShell={setActiveShellId}
        onCloseShell={handleCloseShell}
        onCreateShell={handleCreateShell}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 min-w-[200px] flex-1 flex-col overflow-hidden',
            editorExpanded && 'hidden',
          )}
        >
          {/* Chat tab has been removed. Default view is shell. */}

          {activeTab === 'files' && (
            <div className="h-full overflow-hidden">
              <FileTree selectedProject={selectedProject} onFileOpen={handleFileOpen} />
            </div>
          )}

          {activeTab === 'shell' && (
            <div className="flex h-full w-full flex-col overflow-hidden">
              <div className="flex-1">
                {shellProviderSelectionOpen && (
                  <ShellProviderSelection onSelect={handleCreateShell} />
                )}

                {!shellProviderSelectionOpen && (
                  <div className="relative h-full w-full overflow-hidden">
                    {shellInstances.map((instance) => {
                      const isActiveShell = instance.id === activeShellId;
                      return (
                        <div
                          key={instance.id}
                          className={cn(
                            'absolute inset-0 h-full w-full overflow-hidden',
                            isActiveShell ? 'visible' : 'invisible pointer-events-none',
                          )}
                        >
                          <StandaloneShell
                            project={instance.project}
                            session={instance.session}
                            showHeader={false}
                            isActive={isActiveShell && activeTab === 'shell'}
                            isPlainShell={instance.mode === 'system' && !instance.session}
                            mode={instance.mode}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="h-full overflow-hidden">
              <GitPanel selectedProject={selectedProject} isMobile={isMobile} onFileOpen={handleFileOpen} />
            </div>
          )}

          {shouldShowTasksTab && <TaskMasterPanel isVisible={activeTab === 'tasks'} />}

          <div className={cn('h-full overflow-hidden', activeTab === 'preview' ? 'block' : 'hidden')} />

          {activeTab.startsWith('plugin:') && (
            <div className="h-full overflow-hidden">
              <PluginTabContent
                pluginName={activeTab.replace('plugin:', '')}
                selectedProject={selectedProject}
                selectedSession={selectedSession}
              />
            </div>
          )}
        </div>

        <EditorSidebar
          editingFile={editingFile}
          isMobile={isMobile}
          editorExpanded={editorExpanded}
          editorWidth={editorWidth}
          hasManualWidth={hasManualWidth}
          resizeHandleRef={resizeHandleRef}
          onResizeStart={handleResizeStart}
          onCloseEditor={handleCloseEditor}
          onToggleEditorExpand={handleToggleEditorExpand}
          projectPath={selectedProject.path}
          fillSpace={activeTab === 'files'}
        />
      </div>
    </div>
  );
}

export default React.memo(MainContent);
