import { supabase } from '../lib/supabase';
import { Chain, ScheduledSession, ActiveSession, CompletionHistory } from '../types';
import { Database } from '../types/database';

type ChainRow = Database['public']['Tables']['chains']['Row'];
type CompletionHistoryRow = Database['public']['Tables']['completion_history']['Row'];
type ScheduledSessionRow = Database['public']['Tables']['scheduled_sessions']['Row'];
type ActiveSessionRow = Database['public']['Tables']['active_sessions']['Row'];

// Transform functions between app types and database types
const transformChainFromDB = (row: ChainRow): Chain => ({
  id: row.id,
  name: row.name,
  trigger: row.trigger,
  duration: row.duration,
  description: row.description,
  currentStreak: row.current_streak,
  auxiliaryStreak: row.auxiliary_streak,
  totalCompletions: row.total_completions,
  totalFailures: row.total_failures,
  auxiliaryFailures: row.auxiliary_failures,
  exceptions: row.exceptions || [],
  auxiliaryExceptions: row.auxiliary_exceptions || [],
  auxiliarySignal: row.auxiliary_signal,
  auxiliaryDuration: row.auxiliary_duration,
  auxiliaryCompletionTrigger: row.auxiliary_completion_trigger,
  createdAt: new Date(row.created_at),
  lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at) : undefined,
});

const transformChainToDB = (chain: Chain, userId: string): Database['public']['Tables']['chains']['Insert'] => ({
  id: chain.id,
  user_id: userId,
  name: chain.name,
  trigger: chain.trigger,
  duration: chain.duration,
  description: chain.description,
  current_streak: chain.currentStreak,
  auxiliary_streak: chain.auxiliaryStreak,
  total_completions: chain.totalCompletions,
  total_failures: chain.totalFailures,
  auxiliary_failures: chain.auxiliaryFailures,
  exceptions: chain.exceptions,
  auxiliary_exceptions: chain.auxiliaryExceptions,
  auxiliary_signal: chain.auxiliarySignal,
  auxiliary_duration: chain.auxiliaryDuration,
  auxiliary_completion_trigger: chain.auxiliaryCompletionTrigger,
  created_at: chain.createdAt.toISOString(),
  last_completed_at: chain.lastCompletedAt?.toISOString(),
  updated_at: new Date().toISOString(),
});

const transformCompletionHistoryFromDB = (row: CompletionHistoryRow): CompletionHistory => ({
  chainId: row.chain_id,
  completedAt: new Date(row.completed_at),
  duration: row.duration,
  wasSuccessful: row.was_successful,
  reasonForFailure: row.reason_for_failure,
});

const transformScheduledSessionFromDB = (row: ScheduledSessionRow): ScheduledSession => ({
  chainId: row.chain_id,
  scheduledAt: new Date(row.scheduled_at),
  expiresAt: new Date(row.expires_at),
  auxiliarySignal: row.auxiliary_signal,
});

const transformActiveSessionFromDB = (row: ActiveSessionRow): ActiveSession => ({
  chainId: row.chain_id,
  startedAt: new Date(row.started_at),
  duration: row.duration,
  isPaused: row.is_paused,
  pausedAt: row.paused_at ? new Date(row.paused_at) : undefined,
  totalPausedTime: row.total_paused_time,
});

export const cloudStorage = {
  // Chains
  async getChains(userId: string): Promise<Chain[]> {
    const { data, error } = await supabase
      .from('chains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(transformChainFromDB);
  },

  async saveChain(chain: Chain, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chains')
      .upsert(transformChainToDB(chain, userId));

    if (error) throw error;
  },

  async saveChains(chains: Chain[], userId: string): Promise<void> {
    const chainData = chains.map(chain => transformChainToDB(chain, userId));
    const { error } = await supabase
      .from('chains')
      .upsert(chainData);

    if (error) throw error;
  },

  async deleteChain(chainId: string, userId: string): Promise<void> {
    // Delete related data first
    await Promise.all([
      supabase.from('completion_history').delete().eq('chain_id', chainId).eq('user_id', userId),
      supabase.from('scheduled_sessions').delete().eq('chain_id', chainId).eq('user_id', userId),
      supabase.from('active_sessions').delete().eq('chain_id', chainId).eq('user_id', userId),
    ]);

    // Delete the chain
    const { error } = await supabase
      .from('chains')
      .delete()
      .eq('id', chainId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Completion History
  async getCompletionHistory(userId: string): Promise<CompletionHistory[]> {
    const { data, error } = await supabase
      .from('completion_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data.map(transformCompletionHistoryFromDB);
  },

  async saveCompletionHistory(history: CompletionHistory[], userId: string): Promise<void> {
    const historyData = history.map(record => ({
      user_id: userId,
      chain_id: record.chainId,
      completed_at: record.completedAt.toISOString(),
      duration: record.duration,
      was_successful: record.wasSuccessful,
      reason_for_failure: record.reasonForFailure,
    }));

    const { error } = await supabase
      .from('completion_history')
      .upsert(historyData);

    if (error) throw error;
  },

  async addCompletionRecord(record: CompletionHistory, userId: string): Promise<void> {
    const { error } = await supabase
      .from('completion_history')
      .insert({
        user_id: userId,
        chain_id: record.chainId,
        completed_at: record.completedAt.toISOString(),
        duration: record.duration,
        was_successful: record.wasSuccessful,
        reason_for_failure: record.reasonForFailure,
      });

    if (error) throw error;
  },

  // Scheduled Sessions
  async getScheduledSessions(userId: string): Promise<ScheduledSession[]> {
    const { data, error } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data.map(transformScheduledSessionFromDB);
  },

  async saveScheduledSessions(sessions: ScheduledSession[], userId: string): Promise<void> {
    // Clear existing sessions first
    await supabase
      .from('scheduled_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessions.length === 0) return;

    const sessionData = sessions.map(session => ({
      user_id: userId,
      chain_id: session.chainId,
      scheduled_at: session.scheduledAt.toISOString(),
      expires_at: session.expiresAt.toISOString(),
      auxiliary_signal: session.auxiliarySignal,
    }));

    const { error } = await supabase
      .from('scheduled_sessions')
      .insert(sessionData);

    if (error) throw error;
  },

  // Active Sessions
  async getActiveSession(userId: string): Promise<ActiveSession | null> {
    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data ? transformActiveSessionFromDB(data) : null;
  },

  async saveActiveSession(session: ActiveSession | null, userId: string): Promise<void> {
    // Clear existing active session
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', userId);

    if (!session) return;

    const { error } = await supabase
      .from('active_sessions')
      .insert({
        user_id: userId,
        chain_id: session.chainId,
        started_at: session.startedAt.toISOString(),
        duration: session.duration,
        is_paused: session.isPaused,
        paused_at: session.pausedAt?.toISOString(),
        total_paused_time: session.totalPausedTime,
      });

    if (error) throw error;
  },

  // Sync all data
  async syncAllData(userId: string): Promise<{
    chains: Chain[];
    completionHistory: CompletionHistory[];
    scheduledSessions: ScheduledSession[];
    activeSession: ActiveSession | null;
  }> {
    const [chains, completionHistory, scheduledSessions, activeSession] = await Promise.all([
      this.getChains(userId),
      this.getCompletionHistory(userId),
      this.getScheduledSessions(userId),
      this.getActiveSession(userId),
    ]);

    return {
      chains,
      completionHistory,
      scheduledSessions,
      activeSession,
    };
  },
};