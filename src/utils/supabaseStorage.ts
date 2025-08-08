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
      parentId: chain.parent_id || undefined,
      type: chain.type as Chain['type'],
      sortOrder: chain.sort_order,
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
      // 兼容：如果后端没有此字段，将为 undefined
      isDurationless: (chain as any).is_durationless ?? false,
      timeLimitHours: (chain as any).time_limit_hours ?? undefined,
      timeLimitExceptions: Array.isArray((chain as any).time_limit_exceptions) ? (chain as any).time_limit_exceptions : [],
      groupStartedAt: (chain as any).group_started_at ? new Date((chain as any).group_started_at) : undefined,
      groupExpiresAt: (chain as any).group_expires_at ? new Date((chain as any).group_expires_at) : undefined,
      createdAt: new Date(chain.created_at || Date.now()),
      lastCompletedAt: chain.last_completed_at ? new Date(chain.last_completed_at) : undefined,
    }));
  }

  async saveChains(chains: Chain[]): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      const error = new Error('用户未认证，无法保存数据');
      console.error('No authenticated user found when trying to save chains');
      throw error;
    }

    console.log('正在为用户保存链数据:', user.id, '链数量:', chains.length);
    console.log('要保存的链条详情:', chains.map(c => ({ 
      id: c.id, 
      name: c.name, 
      type: c.type,
      parentId: c.parentId,
      sortOrder: c.sortOrder 
    })));

    // 准备upsert数据
    const upsertData = chains.map(chain => {
      // CRITICAL: 防止循环引用
      let parentId = chain.parentId || null;
      if (parentId === chain.id) {
        console.warn(`检测到循环引用: 链条 ${chain.name} (${chain.id}) 的父节点是自己，重置为null`);
        parentId = null;
      }

      const data: any = {
        id: chain.id,
        name: chain.name,
        parent_id: parentId,
        type: chain.type || 'unit',
        sort_order: chain.sortOrder || Math.floor(Date.now() / 1000),
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
        // 兼容：后端新增列才会保存
        is_durationless: chain.isDurationless ?? false,
        time_limit_hours: chain.timeLimitHours ?? null,
        time_limit_exceptions: chain.timeLimitExceptions ?? [],
        group_started_at: chain.groupStartedAt ? chain.groupStartedAt.toISOString() : null,
        group_expires_at: chain.groupExpiresAt ? chain.groupExpiresAt.toISOString() : null,
        created_at: chain.createdAt.toISOString(),
        last_completed_at: chain.lastCompletedAt?.toISOString(),
        user_id: user.id,
      };
      console.log(`准备保存链条 ${chain.id} (${chain.name}):`, data);
      return data;
    });

    // 先删除当前用户的所有链条，然后重新插入
    console.log('删除用户现有的所有链条...');
    const { error: deleteError } = await supabase
      .from('chains')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('删除现有链数据失败:', deleteError);
      throw new Error(`删除现有数据失败: ${deleteError.message}`);
    }
    
    console.log('删除成功，开始插入新数据...');
    
    // 插入新数据
    const { data: insertResult, error: insertError } = await supabase
      .from('chains')
      .insert(upsertData)
      .select('id, name');

    if (insertError) {
      console.error('插入链数据失败:', insertError);
      throw new Error(`插入数据失败: ${insertError.message}`);
    }
    
    console.log('插入操作成功，返回数据:', insertResult);
    
    // 验证所有链条都已保存
    const savedIds = new Set((insertResult || []).map(r => r.id));  
    const expectedIds = new Set(chains.map(c => c.id));
    const missingSavedIds = [...expectedIds].filter(id => !savedIds.has(id));
    
    if (missingSavedIds.length > 0) {
      console.error('部分链条保存失败，缺失的IDs:', missingSavedIds);
      throw new Error(`部分链条保存失败: ${missingSavedIds.join(', ')}`);
    }

    console.log('所有链数据保存成功');
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
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const sessionData = data[0];

    return {
      chainId: sessionData.chain_id,
      startedAt: new Date(sessionData.started_at),
      duration: sessionData.duration,
      isPaused: sessionData.is_paused,
      pausedAt: sessionData.paused_at ? new Date(sessionData.paused_at) : undefined,
      totalPausedTime: sessionData.total_paused_time,
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