import { supabase, getCurrentUser } from '../lib/supabase';
import { Chain, ScheduledSession, ActiveSession, CompletionHistory, RSIPNode, RSIPMeta } from '../types';

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

    // 生成两套数据：完整字段集（包含新列）与基础字段集（兼容旧后端）
    const buildRow = (chain: Chain, includeNewColumns: boolean) => {
      let parentId = chain.parentId || null;
      if (parentId === chain.id) {
        console.warn(`检测到循环引用: 链条 ${chain.name} (${chain.id}) 的父节点是自己，重置为null`);
        parentId = null;
      }

      const base: any = {
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
        created_at: chain.createdAt.toISOString(),
        last_completed_at: chain.lastCompletedAt?.toISOString(),
        user_id: user.id,
      };

      if (!includeNewColumns) return base;

      return {
        ...base,
        // 新增列：后端不支持时将触发回退逻辑
        is_durationless: chain.isDurationless ?? false,
        time_limit_hours: chain.timeLimitHours ?? null,
        time_limit_exceptions: chain.timeLimitExceptions ?? [],
        group_started_at: chain.groupStartedAt ? chain.groupStartedAt.toISOString() : null,
        group_expires_at: chain.groupExpiresAt ? chain.groupExpiresAt.toISOString() : null,
      } as any;
    };

    const rowsWithNew = chains.map(c => buildRow(c, true));
    const rowsBase = chains.map(c => buildRow(c, false));

    const isMissingColumnError = (e: any) => {
      if (!e) return false;
      const msg = `${e.message || ''} ${e.details || ''}`.toLowerCase();
      return /column .* does not exist|schema cache|could not find .* column/.test(msg);
    };

    // 查询现有ID，用于决定删除哪些已被移除的链
    const { data: existingRows, error: existingErr } = await supabase
      .from('chains')
      .select('id')
      .eq('user_id', user.id);
    if (existingErr) {
      console.error('查询现有链ID失败:', existingErr);
      throw new Error(`查询现有数据失败: ${existingErr.message}`);
    }
    const existingIds = new Set((existingRows || []).map(r => r.id as string));

    // 先尝试使用包含新列的 upsert；若后端缺列，则回退到基础列
    let upsertResultIds: string[] = [];
    const tryUpsert = async (rows: any[]) => {
      const { data, error } = await supabase
        .from('chains')
        .upsert(rows, { onConflict: 'id' })
        .select('id');
      return { data, error } as { data: { id: string }[] | null, error: any };
    };

    let { data: upsertData1, error: upsertErr1 } = await tryUpsert(rowsWithNew);
    if (upsertErr1 && isMissingColumnError(upsertErr1)) {
      console.warn('检测到后端缺少新列，回退到基础字段保存。错误信息:', upsertErr1);
      const { data: upsertData2, error: upsertErr2 } = await tryUpsert(rowsBase);
      if (upsertErr2) {
        console.error('回退保存仍失败:', upsertErr2);
        throw new Error(`保存数据失败: ${upsertErr2.message}`);
      }
      upsertResultIds = (upsertData2 || []).map(r => r.id);
    } else if (upsertErr1) {
      console.error('保存失败:', upsertErr1);
      throw new Error(`保存数据失败: ${upsertErr1.message}`);
    } else {
      upsertResultIds = (upsertData1 || []).map(r => r.id);
    }

    // 仅删除那些不在本次保存集合中的旧链，避免“先删后插”带来的数据丢失
    const newIds = new Set(chains.map(c => c.id));
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('chains')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', user.id);
      if (delErr) {
        console.error('删除多余链失败:', delErr);
        throw new Error(`删除多余数据失败: ${delErr.message}`);
      }
    }

    // 最终确认
    const savedIds = new Set(upsertResultIds);
    const expectedIds = new Set(chains.map(c => c.id));
    const missingSavedIds = [...expectedIds].filter(id => !savedIds.has(id));
    if (missingSavedIds.length > 0) {
      console.warn('部分链条在返回结果中缺失（可能因旧后端未返回所有行）。缺失IDs:', missingSavedIds);
    }

    console.log('所有链数据保存流程完成');
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

  // RSIP nodes
  async getRSIPNodes(): Promise<RSIPNode[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('rsip_nodes')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching RSIP nodes:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      parentId: row.parent_id || undefined,
      title: row.title,
      rule: row.rule,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      useTimer: (row as any).use_timer ?? false,
      timerMinutes: (row as any).timer_minutes ?? undefined,
    }));
  }

  async saveRSIPNodes(nodes: RSIPNode[]): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // Upsert all nodes for user
    const rows = nodes.map(n => ({
      id: n.id,
      parent_id: n.parentId || null,
      title: n.title,
      rule: n.rule,
      sort_order: n.sortOrder,
      created_at: n.createdAt.toISOString(),
      use_timer: n.useTimer ?? false,
      timer_minutes: n.timerMinutes ?? null,
      user_id: user.id,
    }));

    // Fetch existing ids to delete removed ones
    const { data: existingRows, error: existingErr } = await supabase
      .from('rsip_nodes')
      .select('id')
      .eq('user_id', user.id);
    if (existingErr) {
      console.error('查询现有RSIP节点失败:', existingErr);
      throw new Error(`查询现有RSIP节点失败: ${existingErr.message}`);
    }
    const existingIds = new Set((existingRows || []).map(r => r.id as string));
    const newIds = new Set(nodes.map(n => n.id));
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('rsip_nodes')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', user.id);
      if (delErr) {
        console.error('删除多余RSIP节点失败:', delErr);
        throw new Error(`删除多余RSIP节点失败: ${delErr.message}`);
      }
    }

    const { error } = await supabase
      .from('rsip_nodes')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Error saving RSIP nodes:', error);
      throw new Error(`保存RSIP节点失败: ${error.message}`);
    }
  }

  async getRSIPMeta(): Promise<RSIPMeta> {
    const user = await getCurrentUser();
    if (!user) return {};
    const { data, error } = await supabase
      .from('rsip_meta')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    if (error || !data || data.length === 0) return {};
    const row = data[0];
    return {
      lastAddedAt: row.last_added_at ? new Date(row.last_added_at) : undefined,
      allowMultiplePerDay: !!row.allow_multiple_per_day,
    };
  }

  async saveRSIPMeta(meta: RSIPMeta): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('rsip_meta')
      .upsert({
        user_id: user.id,
        last_added_at: meta.lastAddedAt ? meta.lastAddedAt.toISOString() : null,
        allow_multiple_per_day: !!meta.allowMultiplePerDay,
      }, { onConflict: 'user_id' });
    if (error) {
      console.error('保存RSIP元数据失败:', error);
      throw new Error(`保存RSIP元数据失败: ${error.message}`);
    }
  }
}

export const supabaseStorage = new SupabaseStorage();