import React, { useState, useEffect } from 'react';
import { Chain, ScheduledSession } from '../types';
import { Play, Clock, Flame, Calendar } from 'lucide-react';
import { formatTime, getTimeRemaining, formatDuration } from '../utils/time';

interface ChainCardProps {
  chain: Chain;
  scheduledSession?: ScheduledSession;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
}

export const ChainCard: React.FC<ChainCardProps> = ({
  chain,
  scheduledSession,
  onStartChain,
  onScheduleChain,
  onViewDetail,
  onCancelScheduledSession,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!scheduledSession) return;

    const updateTimer = () => {
      const remaining = getTimeRemaining(scheduledSession.expiresAt);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        // Session expired - this would be handled by parent component
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledSession]);

  const isScheduled = scheduledSession && timeRemaining > 0;

  return (
    <div 
      className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg cursor-pointer"
      onClick={() => onViewDetail(chain.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-1">{chain.name}</h3>
          <p className="text-gray-400 text-sm mb-2">{chain.trigger}</p>
          <p className="text-gray-300 text-sm">{chain.description}</p>
        </div>
        <div className="flex items-center space-x-2 text-orange-400">
          <Flame size={20} />
          <div className="text-center">
            <div className="text-2xl font-bold">#{chain.currentStreak}</div>
            <div className="text-xs text-gray-400">主链</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-blue-400">
          <Calendar size={16} />
          <div className="text-center">
            <div className="text-lg font-bold">#{chain.auxiliaryStreak}</div>
            <div className="text-xs text-gray-400">预约链</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-gray-400">
          <Clock size={16} />
          <span>{formatTime(chain.duration)}</span>
        </div>
        <div className="text-gray-400 text-sm">
          {chain.totalCompletions} completions
        </div>
      </div>

      {isScheduled && (
        <div className="bg-blue-900/50 rounded-lg p-3 mb-4 border border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-300">
              <Calendar size={16} />
              <span className="text-sm">预约信号: {scheduledSession.auxiliarySignal}</span>
            </div>
            <div className="text-blue-200 font-mono font-bold">
              {formatDuration(timeRemaining)}
            </div>
          </div>
          <div className="text-blue-300 text-xs mt-1">
            请在时间结束前完成: {chain.auxiliaryCompletionTrigger}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelScheduledSession?.(chain.id);
            }}
            className="mt-2 w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-2 rounded text-sm transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <span>⚠️</span>
            <span>中断/规则判定</span>
          </button>
        </div>
      )}

      <div className="flex space-x-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onStartChain(chain.id)}
          className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <Play size={16} />
          <span>开始任务</span>
        </button>
        
        {!isScheduled && (
          <button
            onClick={() => onScheduleChain(chain.id)}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Calendar size={16} />
            <span>预约</span>
          </button>
        )}
      </div>
    </div>
  );
};