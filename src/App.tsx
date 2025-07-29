import React, { useState, useEffect } from 'react';
import { AppState, Chain, ScheduledSession, ActiveSession, CompletionHistory } from './types';
import { useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { SyncManager } from './utils/syncManager';
import { Dashboard } from './components/Dashboard';
import { ChainEditor } from './components/ChainEditor';
import { FocusMode } from './components/FocusMode';
import { ChainDetail } from './components/ChainDetail';
import { AuxiliaryJudgment } from './components/AuxiliaryJudgment';
import { storage } from './utils/storage';
import { isSessionExpired } from './utils/time';

function App() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [state, setState] = useState<AppState>({
    chains: [],
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
    completionHistory: [],
  });

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<string | null>(null);

  // Initialize sync manager when user changes
  useEffect(() => {
    if (user) {
      const manager = new SyncManager(user.id);
      setSyncManager(manager);
      setLastSyncTime(manager.getLastSyncTime());
    } else {
      setSyncManager(null);
      setLastSyncTime(null);
    }
  }, [user]);

  // Auto-sync when user logs in
  useEffect(() => {
    if (user && syncManager && !isSyncing) {
      handleSyncData();
    }
  }, [user, syncManager]);

  // Load data from localStorage on mount
  useEffect(() => {
    if (authLoading) return;
    
    const chains = storage.getChains();
    const scheduledSessions = storage.getScheduledSessions().filter(
      session => !isSessionExpired(session.expiresAt)
    );
    const activeSession = storage.getActiveSession();
    const completionHistory = storage.getCompletionHistory();

    setState(prev => ({
      ...prev,
      chains,
      scheduledSessions,
      activeSession,
      completionHistory,
      currentView: activeSession ? 'focus' : 'dashboard',
    }));

    // Clean up expired sessions
    if (scheduledSessions.length !== storage.getScheduledSessions().length) {
      storage.saveScheduledSessions(scheduledSessions);
    }
  }, [authLoading]);

  // Clean up expired scheduled sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const expiredSessions = prev.scheduledSessions.filter(
          session => isSessionExpired(session.expiresAt)
        );
        const activeScheduledSessions = prev.scheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        
        if (expiredSessions.length > 0) {
          // Show auxiliary judgment for the first expired session
          setShowAuxiliaryJudgment(expiredSessions[0].chainId);
          storage.saveScheduledSessions(activeScheduledSessions);
          return { ...prev, scheduledSessions: activeScheduledSessions };
        }
        
        return prev;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync data to cloud when authenticated
  const syncToCloud = async () => {
    if (!user || !syncManager) return;
    
    try {
      await syncManager.syncToCloud({
        chains: state.chains,
        scheduledSessions: state.scheduledSessions,
        activeSession: state.activeSession,
        completionHistory: state.completionHistory,
      });
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync to cloud failed:', error);
    }
  };

  const handleSyncData = async () => {
    if (!user || !syncManager || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const syncedData = await syncManager.mergeAndSync({
        chains: state.chains,
        scheduledSessions: state.scheduledSessions,
        activeSession: state.activeSession,
        completionHistory: state.completionHistory,
      });
      
      setState(prev => ({
        ...prev,
        ...syncedData,
        currentView: syncedData.activeSession ? 'focus' : prev.currentView,
      }));
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    // Clear local state
    setState({
      chains: [],
      scheduledSessions: [],
      activeSession: null,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
      completionHistory: [],
    });
    
    // Clear local storage
    storage.saveChains([]);
    storage.saveScheduledSessions([]);
    storage.saveActiveSession(null);
    storage.saveCompletionHistory([]);
  };

  const handleCreateChain = () => {
    setState(prev => ({
      ...prev,
      currentView: 'editor',
      editingChain: null,
    }));
  };

  const handleEditChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (chain) {
      setState(prev => ({
        ...prev,
        currentView: 'editor',
        editingChain: chain,
      }));
    }
  };

  const handleSaveChain = (chainData: Omit<Chain, 'id' | 'currentStreak' | 'totalCompletions' | 'totalFailures' | 'createdAt' | 'lastCompletedAt'>) => {
    setState(prev => {
      let updatedChains: Chain[];
      
      if (prev.editingChain) {
        // Editing existing chain
        updatedChains = prev.chains.map(chain =>
          chain.id === prev.editingChain!.id
            ? { ...chain, ...chainData }
            : chain
        );
      } else {
        // Creating new chain
        const newChain: Chain = {
          id: crypto.randomUUID(),
          ...chainData,
          currentStreak: 0,
          auxiliaryStreak: 0,
          totalCompletions: 0,
          totalFailures: 0,
          auxiliaryFailures: 0,
          createdAt: new Date(),
        };
        updatedChains = [...prev.chains, newChain];
      }
      
      storage.saveChains(updatedChains);
      
      // Sync to cloud if authenticated
      if (user && syncManager) {
        syncToCloud();
      }
      
      return {
        ...prev,
        chains: updatedChains,
        currentView: 'dashboard',
        editingChain: null,
      };
    });
  };

  const handleScheduleChain = (chainId: string) => {
    // 检查是否已有该链的预约
    const existingSchedule = state.scheduledSessions.find(s => s.chainId === chainId);
    if (existingSchedule) return;

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const scheduledSession: ScheduledSession = {
      chainId,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + chain.auxiliaryDuration * 60 * 1000), // Use chain's auxiliary duration
      auxiliarySignal: chain.auxiliarySignal,
    };

    setState(prev => {
      const updatedSessions = [...prev.scheduledSessions, scheduledSession];
      storage.saveScheduledSessions(updatedSessions);
      
      // 增加辅助链记录
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 }
          : chain
      );
      storage.saveChains(updatedChains);
      
      return { 
        ...prev, 
        scheduledSessions: updatedSessions,
        chains: updatedChains
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handleStartChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const activeSession: ActiveSession = {
      chainId,
      startedAt: new Date(),
      duration: chain.duration,
      isPaused: false,
      totalPausedTime: 0,
    };

    // Remove any scheduled session for this chain
    const updatedScheduledSessions = state.scheduledSessions.filter(
      session => session.chainId !== chainId
    );

    setState(prev => {
      storage.saveActiveSession(activeSession);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        activeSession,
        scheduledSessions: updatedScheduledSessions,
        currentView: 'focus',
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handleCompleteSession = () => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: true,
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: c.currentStreak + 1,
              totalCompletions: c.totalCompletions + 1,
              lastCompletedAt: new Date(),
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      storage.saveChains(updatedChains);
      storage.saveActiveSession(null);
      storage.saveCompletionHistory(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handleInterruptSession = (reason?: string) => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
    };

    setState(prev => {
      const updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: 0, // Reset streak
              totalFailures: c.totalFailures + 1,
            }
          : c
      );

      const updatedHistory = [...prev.completionHistory, completionRecord];
      
      storage.saveChains(updatedChains);
      storage.saveActiveSession(null);
      storage.saveCompletionHistory(updatedHistory);

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handlePauseSession = () => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: true,
        pausedAt: new Date(),
      };
      
      storage.saveActiveSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleResumeSession = () => {
    if (!state.activeSession || !state.activeSession.pausedAt) return;

    setState(prev => {
      const pauseDuration = Date.now() - prev.activeSession!.pausedAt!.getTime();
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: false,
        pausedAt: undefined,
        totalPausedTime: prev.activeSession!.totalPausedTime + pauseDuration,
      };
      
      storage.saveActiveSession(updatedSession);
      
      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleAuxiliaryJudgmentFailure = (chainId: string, reason: string) => {
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryStreak: 0, // Reset auxiliary streak
              auxiliaryFailures: chain.auxiliaryFailures + 1
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handleAuxiliaryJudgmentAllow = (chainId: string, exceptionRule: string) => {
    setState(prev => {
      // Remove the scheduled session
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryExceptions: [...(chain.auxiliaryExceptions || []), exceptionRule]
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });
    
    setShowAuxiliaryJudgment(null);
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleAddException = (exceptionRule: string) => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedChains = prev.chains.map(chain =>
        chain.id === prev.activeSession!.chainId
          ? {
              ...chain,
              exceptions: [...(chain.exceptions || []), exceptionRule]
            }
          : chain
      );
      
      storage.saveChains(updatedChains);
      
      return {
        ...prev,
        chains: updatedChains,
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };
  
  const handleViewChainDetail = (chainId: string) => {
    setState(prev => ({
      ...prev,
      currentView: 'detail',
      viewingChainId: chainId,
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
    }));
  };

  const handleDeleteChain = (chainId: string) => {
    setState(prev => {
      // Remove the chain
      const updatedChains = prev.chains.filter(chain => chain.id !== chainId);
      
      // Remove any scheduled sessions for this chain
      const updatedScheduledSessions = prev.scheduledSessions.filter(
        session => session.chainId !== chainId
      );
      
      // Remove completion history for this chain
      const updatedHistory = prev.completionHistory.filter(
        history => history.chainId !== chainId
      );
      
      // If currently active session belongs to this chain, clear it
      const updatedActiveSession = prev.activeSession?.chainId === chainId 
        ? null 
        : prev.activeSession;
      
      // Save to storage
      storage.saveChains(updatedChains);
      storage.saveScheduledSessions(updatedScheduledSessions);
      storage.saveCompletionHistory(updatedHistory);
      if (!updatedActiveSession) {
        storage.saveActiveSession(null);
      }
      
      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
        completionHistory: updatedHistory,
        activeSession: updatedActiveSession,
        currentView: updatedActiveSession ? prev.currentView : 'dashboard',
        viewingChainId: prev.viewingChainId === chainId ? null : prev.viewingChainId,
      };
    });
    
    // Sync to cloud if authenticated
    if (user && syncManager) {
      syncToCloud();
    }
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <i className="fas fa-rocket text-white text-xl"></i>
          </div>
          <p className="text-gray-600 dark:text-slate-400 font-chinese">正在加载...</p>
        </div>
      </div>
    );
  }

  // Render current view
  switch (state.currentView) {
    case 'editor':
      return (
        <>
          <ChainEditor
            chain={state.editingChain || undefined}
            isEditing={!!state.editingChain}
            onSave={handleSaveChain}
            onCancel={handleBackToDashboard}
          />
          {/* Auth Modal */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
          {showAuxiliaryJudgment && (
            <AuxiliaryJudgment
              chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
              onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
              onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
              onCancel={() => setShowAuxiliaryJudgment(null)}
            />
          )}
        </>
      );

    case 'focus':
      const activeChain = state.chains.find(c => c.id === state.activeSession?.chainId);
      if (!state.activeSession || !activeChain) {
        handleBackToDashboard();
        return null;
      }
      return (
        <>
          <FocusMode
            session={state.activeSession}
            chain={activeChain}
            onComplete={handleCompleteSession}
            onInterrupt={handleInterruptSession}
            onAddException={handleAddException}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
          />
          {/* Auth Modal */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
          {showAuxiliaryJudgment && (
            <AuxiliaryJudgment
              chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
              onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
              onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
              onCancel={() => setShowAuxiliaryJudgment(null)}
            />
          )}
        </>
      );

    case 'detail':
      const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
      if (!viewingChain) {
        handleBackToDashboard();
        return null;
      }
      return (
        <>
          <ChainDetail
            chain={viewingChain}
            history={state.completionHistory}
            onBack={handleBackToDashboard}
            onEdit={() => handleEditChain(viewingChain.id)}
            onDelete={() => handleDeleteChain(viewingChain.id)}
          />
          {/* Auth Modal */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
          {showAuxiliaryJudgment && (
            <AuxiliaryJudgment
              chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
              onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
              onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
              onCancel={() => setShowAuxiliaryJudgment(null)}
            />
          )}
        </>
      );

    default:
      return (
        <>
          <Dashboard
            chains={state.chains}
            scheduledSessions={state.scheduledSessions}
            user={user}
            onShowAuth={() => setShowAuthModal(true)}
            onSignOut={handleSignOut}
            onSyncData={handleSyncData}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            onCreateChain={handleCreateChain}
            onStartChain={handleStartChain}
            onScheduleChain={handleScheduleChain}
            onViewChainDetail={handleViewChainDetail}
            onCancelScheduledSession={handleCancelScheduledSession}
            onDeleteChain={handleDeleteChain}
          />
          {/* Auth Modal */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
          {showAuxiliaryJudgment && (
            <AuxiliaryJudgment
              chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
              onJudgmentFailure={(reason) => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment, reason)}
              onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
              onCancel={() => setShowAuxiliaryJudgment(null)}
            />
          )}
        </>
      );
  }
}

export default App;