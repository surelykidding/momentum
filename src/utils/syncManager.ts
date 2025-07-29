import { cloudStorage } from '../services/cloudStorage';
import { storage as localStorage } from './storage';
import { Chain, ScheduledSession, ActiveSession, CompletionHistory } from '../types';

export class SyncManager {
  private userId: string;
  private syncInProgress = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  async syncToCloud(data: {
    chains: Chain[];
    scheduledSessions: ScheduledSession[];
    activeSession: ActiveSession | null;
    completionHistory: CompletionHistory[];
  }): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    try {
      await Promise.all([
        cloudStorage.saveChains(data.chains, this.userId),
        cloudStorage.saveScheduledSessions(data.scheduledSessions, this.userId),
        cloudStorage.saveActiveSession(data.activeSession, this.userId),
        cloudStorage.saveCompletionHistory(data.completionHistory, this.userId),
      ]);
      
      // Update last sync time
      localStorage.setItem('lastSyncTime', new Date().toISOString());
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncFromCloud(): Promise<{
    chains: Chain[];
    scheduledSessions: ScheduledSession[];
    activeSession: ActiveSession | null;
    completionHistory: CompletionHistory[];
  }> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }
    
    this.syncInProgress = true;
    try {
      const data = await cloudStorage.syncAllData(this.userId);
      
      // Update local storage
      localStorage.saveChains(data.chains);
      localStorage.saveScheduledSessions(data.scheduledSessions);
      localStorage.saveActiveSession(data.activeSession);
      localStorage.saveCompletionHistory(data.completionHistory);
      localStorage.setItem('lastSyncTime', new Date().toISOString());
      
      return data;
    } finally {
      this.syncInProgress = false;
    }
  }

  async mergeAndSync(localData: {
    chains: Chain[];
    scheduledSessions: ScheduledSession[];
    activeSession: ActiveSession | null;
    completionHistory: CompletionHistory[];
  }): Promise<{
    chains: Chain[];
    scheduledSessions: ScheduledSession[];
    activeSession: ActiveSession | null;
    completionHistory: CompletionHistory[];
  }> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    try {
      // Get cloud data
      const cloudData = await cloudStorage.syncAllData(this.userId);
      
      // Merge logic - prefer cloud data for most recent updates
      const mergedChains = this.mergeChains(localData.chains, cloudData.chains);
      const mergedHistory = this.mergeHistory(localData.completionHistory, cloudData.completionHistory);
      
      // For sessions, prefer cloud data if it exists and is more recent
      const mergedActiveSession = this.mergeActiveSession(localData.activeSession, cloudData.activeSession);
      const mergedScheduledSessions = cloudData.scheduledSessions.length > 0 
        ? cloudData.scheduledSessions 
        : localData.scheduledSessions;

      const mergedData = {
        chains: mergedChains,
        scheduledSessions: mergedScheduledSessions,
        activeSession: mergedActiveSession,
        completionHistory: mergedHistory,
      };

      // Save merged data to cloud
      await this.syncToCloud(mergedData);
      
      return mergedData;
    } finally {
      this.syncInProgress = false;
    }
  }

  private mergeChains(localChains: Chain[], cloudChains: Chain[]): Chain[] {
    const chainMap = new Map<string, Chain>();
    
    // Add local chains
    localChains.forEach(chain => {
      chainMap.set(chain.id, chain);
    });
    
    // Merge with cloud chains (cloud data takes precedence for conflicts)
    cloudChains.forEach(cloudChain => {
      const localChain = chainMap.get(cloudChain.id);
      if (!localChain) {
        chainMap.set(cloudChain.id, cloudChain);
      } else {
        // Use the chain with the most recent update
        const cloudUpdated = cloudChain.lastCompletedAt?.getTime() || cloudChain.createdAt.getTime();
        const localUpdated = localChain.lastCompletedAt?.getTime() || localChain.createdAt.getTime();
        
        if (cloudUpdated >= localUpdated) {
          chainMap.set(cloudChain.id, cloudChain);
        }
      }
    });
    
    return Array.from(chainMap.values());
  }

  private mergeHistory(localHistory: CompletionHistory[], cloudHistory: CompletionHistory[]): CompletionHistory[] {
    const historyMap = new Map<string, CompletionHistory>();
    
    // Create unique keys for history records
    const createKey = (record: CompletionHistory) => 
      `${record.chainId}-${record.completedAt.getTime()}-${record.duration}`;
    
    // Add local history
    localHistory.forEach(record => {
      historyMap.set(createKey(record), record);
    });
    
    // Add cloud history
    cloudHistory.forEach(record => {
      historyMap.set(createKey(record), record);
    });
    
    return Array.from(historyMap.values()).sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
    );
  }

  private mergeActiveSession(
    localSession: ActiveSession | null, 
    cloudSession: ActiveSession | null
  ): ActiveSession | null {
    if (!localSession && !cloudSession) return null;
    if (!localSession) return cloudSession;
    if (!cloudSession) return localSession;
    
    // Prefer the more recent session
    return localSession.startedAt.getTime() >= cloudSession.startedAt.getTime() 
      ? localSession 
      : cloudSession;
  }

  getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem('lastSyncTime');
    return lastSync ? new Date(lastSync) : null;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}