import React, { useState } from 'react';
import { Chain } from '../types';
import { AlertTriangle, Calendar } from 'lucide-react';

interface AuxiliaryJudgmentProps {
  chain: Chain;
  onJudgmentFailure: (reason: string) => void;
  onJudgmentAllow: (exceptionRule: string) => void;
  onCancel: () => void;
}

export const AuxiliaryJudgment: React.FC<AuxiliaryJudgmentProps> = ({
  chain,
  onJudgmentFailure,
  onJudgmentAllow,
  onCancel,
}) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-lg border border-gray-700">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 text-blue-400 mb-4">
            <Calendar size={32} />
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">辅助链规则判定</h2>
          <p className="text-gray-300 mb-4">
            你似乎做出了与预约承诺不符的行为。请描述具体情况并选择处理方式：
          </p>
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/50">
            <p className="text-blue-300 font-medium">
              预约信号：{chain.auxiliarySignal}
            </p>
            <p className="text-blue-300 font-medium">
              完成条件：{chain.auxiliaryCompletionTrigger}
            </p>
            <p className="text-blue-300 font-medium">
              预约时长：{chain.auxiliaryDuration}分钟
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            请描述具体行为：
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：忘记了预约、被紧急事务打断、身体不适、临时有其他安排等"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            required
          />
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onJudgmentFailure(reason || '用户主动中断预约')}
            className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-lg font-medium transition-colors duration-200"
          >
            <div className="text-left">
              <div className="font-bold">判定失败</div>
              <div className="text-sm text-red-200">
                辅助链记录将从 #{chain.auxiliaryStreak} 清零为 #0
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onJudgmentAllow(reason || '特殊情况允许')}
            disabled={!reason.trim()}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg font-medium transition-colors duration-200"
          >
            <div className="text-left">
              <div className="font-bold">判定允许（下必为例）</div>
              <div className="text-sm text-yellow-200">
                此情况将永久添加到辅助链例外规则中
              </div>
            </div>
          </button>
          
          <button
            onClick={onCancel}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            取消 - 继续预约
          </button>
        </div>
        
        {chain.auxiliaryExceptions.length > 0 && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">当前辅助链例外规则：</h4>
            <div className="space-y-1">
              {chain.auxiliaryExceptions.map((exception, index) => (
                <div key={index} className="text-blue-300 text-sm">• {exception}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};