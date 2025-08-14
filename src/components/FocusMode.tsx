import React, { useState, useEffect, useRef } from 'react';
import { ActiveSession, Chain } from '../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDuration, formatElapsedTime, formatTimeDescription, formatLastCompletionReference } from '../utils/time';
import { notificationManager } from '../utils/notifications';
import { forwardTimerManager } from '../utils/forwardTimer';
import { storage } from '../utils/storage';

interface FocusModeProps {
  session: ActiveSession;
  chain: Chain;
  onComplete: () => void;
  onInterrupt: (reason?: string) => void;
  onAddException: (exceptionRule: string) => void;
  onPause: () => void;
  onResume: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  session,
  chain,
  onComplete,
  onInterrupt,
  onAddException,
  onPause,
  onResume,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [showInterruptWarning, setShowInterruptWarning] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);
  // 添加新规则后的动作：complete 完成 / pause 暂停 / only 仅添加
  const [addAction, setAddAction] = useState<'complete' | 'pause' | 'only'>('only');
  const [pauseMinutes, setPauseMinutes] = useState<number>(15);
  // 暂停后自动恢复
  const AUTO_RESUME_STORAGE_KEY = 'momentum_auto_resume';
  const [autoResumeAt, setAutoResumeAt] = useState<number | null>(null);
  const [resumeCountdown, setResumeCountdown] = useState<number>(0);
  const resumeTimeoutRef = useRef<number | null>(null);
  
  // 正向计时相关状态
  const [forwardElapsedSeconds, setForwardElapsedSeconds] = useState(0);
  const [lastCompletionTime, setLastCompletionTime] = useState<number | null>(null);

  const isDurationless = !!chain.isDurationless || session.duration === 0;

  // 初始化上次完成时间参考
  useEffect(() => {
    if (isDurationless) {
      const lastTime = storage.getLastCompletionTime(chain.id);
      setLastCompletionTime(lastTime);
    }
  }, [chain.id, isDurationless]);

  // 正向计时逻辑（无时长任务启用）
  useEffect(() => {
    if (!isDurationless) return;

    const sessionId = `${session.chainId}_${session.startedAt.getTime()}`;
    
    // 启动正向计时器
    if (!forwardTimerManager.hasTimer(sessionId)) {
      forwardTimerManager.startTimer(sessionId);
    }

    const updateForwardTimer = () => {
      if (session.isPaused && !forwardTimerManager.isPaused(sessionId)) {
        forwardTimerManager.pauseTimer(sessionId);
      } else if (!session.isPaused && forwardTimerManager.isPaused(sessionId)) {
        forwardTimerManager.resumeTimer(sessionId);
      }

      const elapsed = forwardTimerManager.getCurrentElapsed(sessionId);
      setForwardElapsedSeconds(elapsed);
    };

    updateForwardTimer();
    const interval = setInterval(updateForwardTimer, 1000);

    return () => {
      clearInterval(interval);
      // 不在这里清理计时器，因为任务可能还在进行
    };
  }, [session, isDurationless]);

  // 计时逻辑（有时长时启用）
  useEffect(() => {
    if (isDurationless) return; // 无时长任务不计时

    const getNotificationThreshold = (durationMinutes: number) => {
      if (durationMinutes <= 3) return null;
      const thresholdMinutes = Math.floor(durationMinutes / 3);
      return Math.min(thresholdMinutes, 1) * 60;
    };

    const notificationThreshold = getNotificationThreshold(session.duration);

    const calculateTimeRemaining = () => {
      const now = Date.now();
      const sessionDurationMs = session.duration * 60 * 1000;
      const elapsedTime = session.isPaused 
        ? (session.pausedAt?.getTime() || now) - session.startedAt.getTime()
        : now - session.startedAt.getTime();
      const adjustedElapsedTime = elapsedTime - session.totalPausedTime;
      const remaining = Math.max(0, sessionDurationMs - adjustedElapsedTime);
      return Math.ceil(remaining / 1000);
    };

    const updateTimer = () => {
      if (session.isPaused) return;
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (notificationThreshold && remaining <= notificationThreshold && remaining > 0 && !hasShownWarning) {
        setHasShownWarning(true);
        const minutes = Math.max(1, Math.ceil(remaining / 60));
        notificationManager.notifyTaskWarning(chain.name, `${minutes}分钟`);
      }

      if (remaining <= 0) {
        onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onComplete, hasShownWarning, chain.name, isDurationless]);

  // 重置警告状态当会话改变时
  useEffect(() => { setHasShownWarning(false); }, [session.startedAt, session.chainId]);

  const elapsedSeconds = isDurationless
    ? forwardElapsedSeconds
    : session.duration * 60 - timeRemaining;

  const progress = isDurationless
    ? 100
    : ((session.duration * 60 - timeRemaining) / (session.duration * 60)) * 100;

  const handleInterruptClick = () => setShowInterruptWarning(true);

  const handleJudgmentFailure = () => {
    onInterrupt(interruptReason || '用户主动中断');
    setShowInterruptWarning(false);
  };

  const handleJudgmentAllow = () => {
    const ruleToAdd = useExistingRule ? selectedExistingRule : interruptReason.trim();
    if (!ruleToAdd) return;

    // 使用已有规则：直接完成任务（不重复添加）
    if (useExistingRule) {
      onComplete();
      setShowInterruptWarning(false);
      return;
    }

    // 添加新规则
    if (!chain.exceptions.includes(ruleToAdd)) {
      onAddException(ruleToAdd);
    }

    if (addAction === 'complete') {
      // 添加并提前完成
      clearAutoResumeSchedule();
      onComplete();
    } else if (addAction === 'pause') {
      // 添加并暂停，可选择自动恢复
      onPause();
      if (pauseMinutes && pauseMinutes > 0) {
        scheduleAutoResume(pauseMinutes);
      }
    }

    setShowInterruptWarning(false);
  };

  const handleRuleTypeChange = (useExisting: boolean) => {
    setUseExistingRule(useExisting);
    if (useExisting) {
      setInterruptReason('');
      setSelectedExistingRule(chain.exceptions[0] || '');
    } else {
      setSelectedExistingRule('');
    }
  };

  const resetInterruptModal = () => {
    setShowInterruptWarning(false);
    setInterruptReason('');
    setSelectedExistingRule('');
    setUseExistingRule(false);
    setAddAction('only');
    setPauseMinutes(15);
  };

  // —— 自动恢复相关 ——
  const clearAutoResumeSchedule = () => {
    try {
      const dataStr = localStorage.getItem(AUTO_RESUME_STORAGE_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chainId === session.chainId) {
          localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
        }
      }
    } catch {}
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setAutoResumeAt(null);
    setResumeCountdown(0);
  };

  const setupAutoResumeTimer = (resumeTime: number) => {
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
    }
    const delay = Math.max(0, resumeTime - Date.now());
    if (delay === 0) {
      clearAutoResumeSchedule();
      onResume();
      return;
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      onResume();
      clearAutoResumeSchedule();
    }, delay);
  };

  const scheduleAutoResume = (minutes: number) => {
    const resumeTime = Date.now() + minutes * 60 * 1000;
    setAutoResumeAt(resumeTime);
    try {
      localStorage.setItem(
        AUTO_RESUME_STORAGE_KEY,
        JSON.stringify({
          chainId: session.chainId,
          startedAt: session.startedAt.toISOString(),
          resumeAt: new Date(resumeTime).toISOString(),
        })
      );
    } catch {}
    setupAutoResumeTimer(resumeTime);
  };

  // 加载已有的自动恢复计划（仅当当前会话处于暂停状态时）
  useEffect(() => {
    if (!session.isPaused) return;
    try {
      const dataStr = localStorage.getItem(AUTO_RESUME_STORAGE_KEY);
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.chainId === session.chainId && data.startedAt === session.startedAt.toISOString()) {
        const ts = new Date(data.resumeAt).getTime();
        if (ts > Date.now()) {
          setAutoResumeAt(ts);
          setupAutoResumeTimer(ts);
        } else {
          // 已经过期，直接恢复
          clearAutoResumeSchedule();
          onResume();
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isPaused, session.chainId, session.startedAt]);

  // 倒计时显示
  useEffect(() => {
    if (!session.isPaused || !autoResumeAt) return;
    setResumeCountdown(Math.max(0, Math.ceil((autoResumeAt - Date.now()) / 1000)));
    const interval = window.setInterval(() => {
      const secs = Math.max(0, Math.ceil((autoResumeAt - Date.now()) / 1000));
      setResumeCountdown(secs);
      if (secs <= 0) {
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [autoResumeAt, session.isPaused]);

  // 如果用户手动继续或任务完成/中断后，清理自动恢复计划
  useEffect(() => {
    if (!session.isPaused) {
      clearAutoResumeSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isPaused]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#161615] dark:via-black dark:to-[#161615] flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/5 dark:from-primary-500/5 dark:via-transparent dark:to-primary-500/5"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center animate-fade-in">
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-primary-500/20 backdrop-blur-sm flex items-center justify-center border border-primary-500/30 dark:bg-primary-500/20 dark:border-primary-500/30">
              <i className="fas fa-fire text-primary-500 text-2xl"></i>
            </div>
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-light font-chinese text-gray-900 dark:text-white mb-2">{chain.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-mono tracking-wider">{chain.trigger}</p>
            </div>
          </div>
        </div>
        
        {/* Timer display */}
        <div className="mb-16">
          <div className="text-8xl md:text-9xl font-mono font-light text-gray-900 dark:text-white mb-8 tracking-wider">
            {isDurationless ? formatElapsedTime(elapsedSeconds) : formatDuration(timeRemaining)}
          </div>
          
          {/* Progress bar */}
          <div className="w-96 max-w-full h-3 bg-gray-200 dark:bg-white/10 backdrop-blur-sm rounded-full mx-auto mb-6 border border-gray-300 dark:border-white/20">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-primary-500"></i>
              <span className="font-mono">
                {isDurationless
                  ? `已用时 ${formatTimeDescription(Math.ceil(elapsedSeconds / 60))}`
                  : `${Math.floor((session.duration * 60 - timeRemaining) / 60)}分钟 / ${session.duration}分钟`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-fire text-primary-500"></i>
              <span className="font-mono">#{chain.currentStreak}</span>
            </div>
          </div>
          
          {/* 上次用时参考 */}
          {isDurationless && lastCompletionTime !== null && (
            <div className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-chinese">
              {formatLastCompletionReference(lastCompletionTime)}
            </div>
          )}
        </div>

        {!session.isPaused && (
          <div className="flex items-center justify-center space-x-4">
            {isDurationless ? (
              <button onClick={onComplete} className="px-8 py-4 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 shadow-lg">
                手动完成任务
              </button>
            ) : (
              <>
                <button onClick={onPause} className="px-6 py-3 rounded-2xl bg-yellow-500/90 hover:bg-yellow-500 text-white font-chinese transition-all duration-300">暂停</button>
                <button onClick={onComplete} className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300">提前完成</button>
              </>
            )}
          </div>
        )}

        {session.isPaused && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-gray-700 dark:text-gray-300 font-chinese">
              已暂停{autoResumeAt ? `，将于 ${Math.max(1, Math.ceil(resumeCountdown / 60))} 分钟内自动继续` : ''}
            </div>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => {
                  clearAutoResumeSchedule();
                  onResume();
                }}
                className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300"
              >
                继续
              </button>
              {autoResumeAt && (
                <button
                  onClick={clearAutoResumeSchedule}
                  className="px-6 py-3 rounded-2xl bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-chinese transition-all duration-300"
                >
                  取消自动继续
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interrupt button */}
      <button onClick={handleInterruptClick} className="fixed bottom-8 right-8 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-3xl font-medium transition-all duration-300 flex items-center space-x-3 border border-red-400 hover:border-red-500 hover:scale-105 shadow-2xl font-chinese">
        <AlertTriangle size={20} />
        <span>中断/规则判定</span>
      </button>

      {/* Interrupt warning modal */}
      {showInterruptWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161615]/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700/50 shadow-2xl animate-scale-in">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="text-red-400" size={32} />
                </div>
                <div className="text-left">
                  <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-white mb-1">规则判定</h2>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-wider">RULE JUDGMENT</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-chinese">
                你似乎做出了与"最好的状态"不符的行为。请描述具体情况并选择处理方式：
              </p>
            </div>
            
            <div className="mb-8 space-y-6">
              {/* 规则类型选择 */}
              {chain.exceptions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="ruleType"
                        checked={useExistingRule}
                        onChange={() => handleRuleTypeChange(true)}
                        className="w-5 h-5 text-green-500 focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-green-600 dark:text-green-300 font-medium font-chinese">使用已有例外规则</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="ruleType"
                        checked={!useExistingRule}
                        onChange={() => handleRuleTypeChange(false)}
                        className="w-5 h-5 text-yellow-500 focus:ring-yellow-500 focus:ring-2"
                      />
                      <span className="text-yellow-600 dark:text-yellow-300 font-medium font-chinese">添加新例外规则</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 已有规则选择 */}
              {useExistingRule && chain.exceptions.length > 0 && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-6">
                  <label className="block text-green-700 dark:text-green-300 text-sm font-medium mb-3 font-chinese">
                    选择适用的例外规则：
                  </label>
                  <select
                    value={selectedExistingRule}
                    onChange={(e) => setSelectedExistingRule(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800/50 border border-green-300 dark:border-green-500/30 rounded-2xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 font-chinese"
                  >
                    {chain.exceptions.map((exception, index) => (
                      <option key={index} value={exception} className="bg-white dark:bg-gray-800">
                        {exception}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 p-4 bg-green-100 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/30">
                    <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
                      <CheckCircle size={20} />
                      <span className="text-sm font-chinese">此行为已被允许，可以直接完成任务</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 新规则输入 */}
              {!useExistingRule && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-6">
                  <label className="block text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-3 font-chinese">
                    描述具体行为：
                  </label>
                  <textarea
                    value={interruptReason}
                    onChange={(e) => setInterruptReason(e.target.value)}
                    placeholder="请描述具体行为，例如：查看手机消息、起身上厕所、与他人交谈等"
                    className="w-full bg-white dark:bg-gray-800/50 border border-yellow-300 dark:border-yellow-500/30 rounded-2xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-300 resize-none font-chinese"
                    rows={3}
                    required
                  />
                  {interruptReason.trim() && chain.exceptions.includes(interruptReason.trim()) && (
                    <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-500/10 rounded-2xl border border-yellow-200 dark:border-yellow-500/30">
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">
                        ⚠️ 此规则已存在，建议选择"使用已有例外规则"
                      </p>
                    </div>
                  )}

                  {/* 添加规则后的动作 */}
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-chinese">添加规则后执行：</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="addAction"
                          checked={addAction === 'complete'}
                          onChange={() => setAddAction('complete')}
                          className="w-5 h-5 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-green-700 dark:text-green-300 text-sm font-chinese">添加并提前完成</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="addAction"
                          checked={addAction === 'pause'}
                          onChange={() => setAddAction('pause')}
                          className="w-5 h-5 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">添加并暂停</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="addAction"
                          checked={addAction === 'only'}
                          onChange={() => setAddAction('only')}
                          className="w-5 h-5 text-gray-500 focus:ring-gray-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-chinese">仅添加规则</span>
                      </label>
                    </div>

                    {addAction === 'pause' && (
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="text-sm text-yellow-700 dark:text-yellow-300 font-chinese">暂停</span>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={pauseMinutes}
                          onChange={(e) => setPauseMinutes(parseInt(e.target.value || '15') || 15)}
                          className="w-20 bg-white dark:bg-gray-800/50 border border-yellow-300 dark:border-yellow-500/30 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-center font-mono"
                        />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300 font-chinese">分钟后自动继续（可手动继续）</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <button
                onClick={handleJudgmentFailure}
                className="w-full bg-red-500/90 hover:bg-red-500 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
              >
                <div className="text-left">
                  <div className="font-bold text-lg">判定失败</div>
                  <div className="text-sm text-red-200">主链记录将从 #{chain.currentStreak} 清零为 #0</div>
                </div>
              </button>
              
              <button
                onClick={handleJudgmentAllow}
                disabled={useExistingRule ? !selectedExistingRule : !interruptReason.trim()}
                className={`w-full px-6 py-4 rounded-2xl font-medium transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-white hover:scale-105 font-chinese ${
                  useExistingRule 
                    ? 'bg-green-500/90 hover:bg-green-500' 
                    : 'bg-yellow-500/90 hover:bg-yellow-500'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold text-lg">
                    {useExistingRule 
                      ? '使用例外规则完成任务' 
                      : addAction === 'complete' 
                        ? '添加并提前完成' 
                        : addAction === 'pause'
                          ? '添加并暂停' 
                          : '仅添加规则'}
                  </div>
                  <div className={`text-sm ${useExistingRule ? 'text-green-200' : 'text-yellow-200'}`}>
                    {useExistingRule 
                      ? '根据已有规则，此行为被允许' 
                      : '此行为将永久添加到例外规则中'
                    }
                  </div>
                </div>
              </button>
              
              <button
                onClick={resetInterruptModal}
                className="w-full bg-gray-200 dark:bg-gray-600/90 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
              >
                取消 - 继续任务
              </button>
            </div>
            
            {chain.exceptions.length > 0 && (
              <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50">
                <h4 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center space-x-2 font-chinese">
                  <i className="fas fa-list text-primary-500"></i>
                  <span>当前例外规则：</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-chinese">以下为你历史上添加过的例外规则记录，可在本弹窗中新增并选择“添加后的操作”。</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {chain.exceptions.map((exception, index) => (
                    <div key={index} className="text-yellow-600 dark:text-yellow-300 text-sm flex items-center space-x-2">
                      <i className="fas fa-check-circle text-xs"></i>
                      <span>{exception}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};