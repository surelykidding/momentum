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
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);

  // 初始化时如果有已存在的规则，设置默认选择
  React.useEffect(() => {
    if (chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0) {
      setSelectedExistingRule(chain.auxiliaryExceptions[0]);
    }
  }, [chain.auxiliaryExceptions]);

  const handleRuleTypeChange = (useExisting: boolean) => {
    setUseExistingRule(useExisting);
    if (useExisting) {
      setReason('');
      setSelectedExistingRule(chain.auxiliaryExceptions?.[0] || '');
    } else {
      setSelectedExistingRule('');
    }
  };

  const handleJudgmentAllowClick = () => {
    const ruleToAdd = useExistingRule ? selectedExistingRule : reason.trim();
    if (ruleToAdd) {
      // 只有在使用新规则且不存在时才添加
      if (!useExistingRule && !chain.auxiliaryExceptions?.includes(ruleToAdd)) {
        onJudgmentAllow(ruleToAdd);
      } else if (useExistingRule) {
        // 使用已有规则，不需要添加新规则，直接允许
        onJudgmentAllow(selectedExistingRule);
      } else {
        // 规则已存在，仍然调用允许函数但不会重复添加
        onJudgmentAllow(ruleToAdd);
      }
    }
  };

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
        
        <div className="mb-6 space-y-4">
          {/* 规则类型选择 */}
          {chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ruleType"
                    checked={useExistingRule}
                    onChange={() => handleRuleTypeChange(true)}
                    className="text-green-500 focus:ring-green-500"
                  />
                  <span className="text-green-300 font-medium">使用已有例外规则</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ruleType"
                    checked={!useExistingRule}
                    onChange={() => handleRuleTypeChange(false)}
                    className="text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-yellow-300 font-medium">添加新例外规则</span>
                </label>
              </div>
            </div>
          )}

          {/* 已有规则选择 */}
          {useExistingRule && chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0 && (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                选择适用的例外规则：
              </label>
              <select
                value={selectedExistingRule}
                onChange={(e) => setSelectedExistingRule(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                {chain.auxiliaryExceptions.map((exception, index) => (
                  <option key={index} value={exception}>
                    {exception}
                  </option>
                ))}
              </select>
              <div className="mt-2 p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                <div className="flex items-center space-x-2 text-green-300">
                  <span className="text-sm">✅ 此行为已被允许，可以直接结束预约</span>
                </div>
              </div>
            </div>
          )}

          {/* 新规则输入 */}
          {!useExistingRule && (
            <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
                请描述具体行为：
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：忘记了预约、被紧急事务打断、身体不适、临时有其他安排等"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
            rows={3}
          />
              {reason.trim() && chain.auxiliaryExceptions?.includes(reason.trim()) && (
                <div className="mt-2 p-3 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ 此规则已存在，建议选择"使用已有例外规则"
                  </p>
                </div>
              )}
            </div>
          )}
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
            onClick={handleJudgmentAllowClick}
            disabled={useExistingRule ? !selectedExistingRule : !reason.trim()}
            className={`w-full px-6 py-4 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed text-white ${
              useExistingRule 
                ? 'bg-green-600 hover:bg-green-500' 
                : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            <div className="text-left">
              <div className="font-bold">判定允许（下必为例）</div>
              <div className={`text-sm ${useExistingRule ? 'text-green-200' : 'text-yellow-200'}`}>
                {useExistingRule 
                  ? '根据已有规则，此行为被允许' 
                  : '此情况将永久添加到辅助链例外规则中'
                }
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
        
        {chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0 && (
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