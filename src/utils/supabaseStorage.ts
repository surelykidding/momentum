import { supabase, getCurrentUser } from '../lib/supabase';
import { Chain, ScheduledSession, ActiveSession, CompletionHistory } from '../types';

export class SupabaseStorage {
  // Chains
  async getChains(): Promise<Chain[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching chains:', error);
      return [];
    }

    return data.map(chain => ({
      id: chain.id,
      name: chain.name,
      trigger: chain.trigger,
      duration: chain.duration,
      description: chain.description,
      currentStreak: chain.current_streak,
      auxiliaryStreak: chain.auxiliary_streak,
      totalCompletions: chain.total_completions,
      totalFailures: chain.total_failures,
      auxiliaryFailures: chain.auxiliary_failures,
      exceptions: Array.isArray(chain.exceptions) ? chain.exceptions as string[] : [],
      auxiliaryExceptions: Array.isArray(chain.auxiliary_exceptions) ? chain.auxiliary_exceptions as string[] : [],
      auxiliarySignal: chain.auxiliary_signal,
      auxiliaryDuration: chain.auxiliary_duration,
      auxiliaryCompletionTrigger: chain.auxiliary_completion_trigger,
      createdAt: new Date(chain.created_at || Date.now()),
      lastCompletedAt: chain.last_completed_at ? new Date(chain.last_completed_at) : undefined,
    }));
  }

  async saveChains(chains: Chain[]): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // First, get existing chains to determine which are new and which need updates
    const { data: existingChains } = await supabase
      .from('chains')
      .select('id')
      .eq('user_id', user.id);

    const existingIds = new Set(existingChains?.map(c => c.id) || []);
    const newChains = chains.filter(chain => !existingIds.has(chain.id));
    const updatedChains = chains.filter(chain => existingIds.has(chain.id));

    // Insert new chains
    if (newChains.length > 0) {
      const { error: insertError } = await supabase
        .from('chains')
        .insert(newChains.map(chain => ({
          id: chain.id,
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
          user_id: user.id,
        })));

      if (insertError) {
        console.error('Error inserting chains:', insertError);
      }
    }

    // Update existing chains
    for (const chain of updatedChains) {
      const { error: updateError } = await supabase
        .from('chains')
        .update({
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
          last_completed_at: chain.lastCompletedAt?.toISOString(),
        })
        .eq('id', chain.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating chain:', updateError);
      }
    }

    // Delete chains that are no longer in the array
    const currentIds = new Set(chains.map(c => c.id));
    const toDelete = existingChains?.filter(c => !currentIds.has(c.id)) || [];
    
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('chains')
        .delete()
        .in('id', toDelete.map(c => c.id))
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting chains:', deleteError);
      }
    }
  }

  // Scheduled Sessions
  async getScheduledSessions(): Promise<ScheduledSession[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled sessions:', error);
      return [];
    }

    return data.map(session => ({
      chainId: session.chain_id,
      scheduledAt: new Date(session.scheduled_at),
      expiresAt: new Date(session.expires_at),
      auxiliarySignal: session.auxiliary_signal,
    }));
  }

  async saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // Delete all existing sessions for this user
    await supabase
      .from('scheduled_sessions')
      .delete()
      .eq('user_id', user.id);

    // Insert new sessions
    if (sessions.length > 0) {
      const { error } = await supabase
        .from('scheduled_sessions')
        .insert(sessions.map(session => ({
          chain_id: session.chainId,
          scheduled_at: session.scheduledAt.toISOString(),
          expires_at: session.expiresAt.toISOString(),
          auxiliary_signal: session.auxiliarySignal,
          user_id: user.id,
        })));

      if (error) {
        console.error('Error saving scheduled sessions:', error);
      }
    }
  }

  // Active Session
  async getActiveSession(): Promise<ActiveSession | null> {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      chainId: data.chain_id,
      startedAt: new Date(data.started_at),
      duration: data.duration,
      isPaused: data.is_paused,
      pausedAt: data.paused_at ? new Date(data.paused_at) : undefined,
      totalPausedTime: data.total_paused_time,
    };
  }

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // Delete existing active session
    await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id);

    // Insert new session if provided
    if (session) {
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          chain_id: session.chainId,
          started_at: session.startedAt.toISOString(),
          duration: session.duration,
          is_paused: session.isPaused,
          paused_at: session.pausedAt?.toISOString(),
          total_paused_time: session.totalPausedTime,
          user_id: user.id,
        });

      if (error) {
        console.error('Error saving active session:', error);
      }
    }
  }

  // Completion History
  async getCompletionHistory(): Promise<CompletionHistory[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('completion_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching completion history:', error);
      return [];
    }

    return data.map(history => ({
      chainId: history.chain_id,
      completedAt: new Date(history.completed_at),
      duration: history.duration,
      wasSuccessful: history.was_successful,
      reasonForFailure: history.reason_for_failure || undefined,
    }));
  }

  async saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // Get existing history to determine what's new
    const { data: existingHistory } = await supabase
      .from('completion_history')
      .select('chain_id, completed_at')
      .eq('user_id', user.id);

    const existingKeys = new Set(
      existingHistory?.map(h => `${h.chain_id}-${h.completed_at}`) || []
    );

    const newHistory = history.filter(h => 
      !existingKeys.has(`${h.chainId}-${h.completedAt.toISOString()}`)
    );

    // Insert new history records
    if (newHistory.length > 0) {
      const { error } = await supabase
        .from('completion_history')
        .insert(newHistory.map(h => ({
          chain_id: h.chainId,
          completed_at: h.completedAt.toISOString(),
          duration: h.duration,
          was_successful: h.wasSuccessful,
          reason_for_failure: h.reasonForFailure,
          user_id: user.id,
        })));

      if (error) {
        console.error('Error saving completion history:', error);
      }
    }
  }
}

export const supabaseStorage = new SupabaseStorage();