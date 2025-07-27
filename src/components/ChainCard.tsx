import React, { useState, useEffect } from 'react';
import { Chain, ScheduledSession } from '../types';
import { Play, Clock, Flame, Calendar, Trash2, MoreVertical } from 'lucide-react';
import { formatTime, getTimeRemaining, formatDuration } from '../utils/time';

interface ChainCardProps {
  chain: Chain;
  scheduledSession?: ScheduledSession;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onDelete: (chainId: string) => void;
}

export const ChainCard: React.FC<ChainCardProps> = ({
  chain,
  scheduledSession,
  onStartChain,
  onScheduleChain,
  onViewDetail,
  onCancelScheduledSession,
  onDelete,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(chain.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative">
      <div 
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg cursor-pointer"
        onClick={() => onViewDetail(chain.id)}
      >
        {/* Menu button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-10">
              <button
                onClick={handleDeleteClick}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-600 flex items-center space-x-2"
              >
                <Trash2 size={14} />
                <span>删除链条</span>
              </button>
            </div>
          )}
        </div>

      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-700">
            <div className="text-center mb-6">
              <Trash2 className="text-red-400 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">确认删除</h3>
              <p className="text-gray-300 mb-4">
                你确定要删除链条 "<span className="text-orange-400 font-medium">{chain.name}</span>" 吗？
              </p>
            </div>
            
            <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/50 mb-6">
              <div className="text-center mb-4">
                <p className="text-red-300 text-sm">
                  ⚠️ 此操作将永久删除：
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-red-300 text-sm">
                <div className="bg-red-800/30 rounded-lg p-3">
                  <div className="font-medium mb-2">📊 统计数据</div>
                  <div>• 主链记录: #{chain.currentStreak}</div>
                  <div>• 预约链记录: #{chain.auxiliaryStreak}</div>
                  <div>• 完成次数: {chain.totalCompletions}</div>
                  <div>• 失败次数: {chain.totalFailures}</div>
                </div>
                <div className="bg-red-800/30 rounded-lg p-3">
                  <div className="font-medium mb-2">⚙️ 设置规则</div>
                  <div>• 触发动作设置</div>
                  <div>• 预约信号设置</div>
                  <div>• 任务时长配置</div>
                  <div>• 所有例外规则</div>
                </div>
                <div className="bg-red-800/30 rounded-lg p-3">
                  <div className="font-medium mb-2">📝 历史记录</div>
                  <div>• 所有完成记录</div>
                  <div>• 失败原因记录</div>
                  <div>• 进行中的预约</div>
                  <div>• 时间统计数据</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleCancelDelete}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Trash2 size={16} />
                <span>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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