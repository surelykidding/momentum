import React, { useState } from 'react';
import { Chain } from '../types';
import { ArrowLeft, Save, Headphones, Code, BookOpen, Dumbbell, Coffee, Target, Clock, Bell } from 'lucide-react';

interface ChainEditorProps {
  chain?: Chain;
  isEditing: boolean;
  onSave: (chain: Omit<Chain, 'id' | 'currentStreak' | 'auxiliaryStreak' | 'totalCompletions' | 'totalFailures' | 'auxiliaryFailures' | 'createdAt' | 'lastCompletedAt'>) => void;
  onCancel: () => void;
}

const TRIGGER_TEMPLATES = [
  { icon: Headphones, text: '戴上降噪耳机', color: 'text-blue-400' },
  { icon: Code, text: '打开编程软件', color: 'text-green-400' },
  { icon: BookOpen, text: '坐到书房书桌前', color: 'text-purple-400' },
  { icon: Dumbbell, text: '换上运动服', color: 'text-red-400' },
  { icon: Coffee, text: '准备一杯咖啡', color: 'text-yellow-400' },
  { icon: Target, text: '自定义触发器', color: 'text-gray-400' },
];

const AUXILIARY_SIGNAL_TEMPLATES = [
  { icon: Target, text: '打响指', color: 'text-blue-400' },
  { icon: Clock, text: '设置手机闹钟', color: 'text-green-400' },
  { icon: Bell, text: '按桌上的铃铛', color: 'text-purple-400' },
  { icon: Coffee, text: '说"开始预约"', color: 'text-yellow-400' },
  { icon: Target, text: '自定义信号', color: 'text-gray-400' },
];

const AUXILIARY_DURATION_PRESETS = [5, 10, 15, 20, 30, 45];

const DURATION_PRESETS = [25, 30, 45, 60, 90, 120];

export const ChainEditor: React.FC<ChainEditorProps> = ({
  chain,
  isEditing,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(chain?.name || '');
  const [trigger, setTrigger] = useState(chain?.trigger || '');
  const [customTrigger, setCustomTrigger] = useState('');
  const [duration, setDuration] = useState(chain?.duration || 45);
  const [description, setDescription] = useState(chain?.description || '');
  
  // 辅助链状态
  const [auxiliarySignal, setAuxiliarySignal] = useState(chain?.auxiliarySignal || '');
  const [customAuxiliarySignal, setCustomAuxiliarySignal] = useState('');
  const [auxiliaryDuration, setAuxiliaryDuration] = useState(chain?.auxiliaryDuration || 15);
  const [auxiliaryCompletionTrigger, setAuxiliaryCompletionTrigger] = useState(
    chain?.auxiliaryCompletionTrigger || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !trigger.trim() || !description.trim() || 
        !auxiliarySignal.trim() || !auxiliaryCompletionTrigger.trim()) return;

    onSave({
      name: name.trim(),
      trigger: trigger === '自定义触发器' ? customTrigger.trim() : trigger,
      duration,
      description: description.trim(),
      auxiliarySignal: auxiliarySignal === '自定义信号' ? customAuxiliarySignal.trim() : auxiliarySignal,
      auxiliaryDuration,
      auxiliaryCompletionTrigger: auxiliaryCompletionTrigger.trim(),
      exceptions: chain?.exceptions || [],
      auxiliaryExceptions: chain?.auxiliaryExceptions || [],
    });
  };

  const handleTriggerSelect = (triggerText: string) => {
    setTrigger(triggerText);
    if (triggerText !== '自定义触发器') {
      setCustomTrigger('');
      // 自动设置辅助链完成条件为主链触发器
      setAuxiliaryCompletionTrigger(triggerText);
    }
  };

  const handleAuxiliarySignalSelect = (signalText: string) => {
    setAuxiliarySignal(signalText);
    if (signalText !== '自定义信号') {
      setCustomAuxiliarySignal('');
    }
  };
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center space-x-4 mb-8">
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white">
            {isEditing ? '编辑链条' : '创建新链条'}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              链名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：学习Python、健身30分钟、无干扰写作"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 主链设置 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-orange-300 border-b border-orange-500 pb-2">主链设置</h3>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-orange-500">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  神圣座位（触发动作）
                </label>
                <select
                  value={trigger}
                  onChange={(e) => handleTriggerSelect(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 mb-4"
                  required
                >
                  <option value="" disabled className="text-gray-400">
                    选择触发动作
                  </option>
                  {TRIGGER_TEMPLATES.map((template, index) => (
                    <option key={index} value={template.text} className="text-white bg-gray-700">
                      {template.text}
                    </option>
                  ))}
                </select>
                {trigger === '自定义触发器' && (
                  <input
                    type="text"
                    value={customTrigger}
                    onChange={(e) => setCustomTrigger(e.target.value)}
                    placeholder="输入你的自定义触发动作"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-orange-500">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  任务时长
                </label>
                <select
                  value={DURATION_PRESETS.includes(duration) ? duration : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setDuration(60); // Default custom value
                    } else {
                      setDuration(Number(e.target.value));
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 mb-4"
                  required
                >
                  {DURATION_PRESETS.map((preset) => (
                    <option key={preset} value={preset} className="text-white bg-gray-700">
                      {preset}分钟
                    </option>
                  ))}
                  <option value="custom" className="text-white bg-gray-700">自定义时长</option>
                </select>
                {!DURATION_PRESETS.includes(duration) && (
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    placeholder="输入自定义时长（分钟）"
                    min="1"
                    max="300"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                )}
              </div>
            </div>

            {/* 辅助链设置 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-blue-300 border-b border-blue-500 pb-2">辅助链（预约链）设置</h3>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-blue-500">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  预约信号
                </label>
                <select
                  value={auxiliarySignal}
                  onChange={(e) => handleAuxiliarySignalSelect(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
                  required
                >
                  <option value="" disabled className="text-gray-400">
                    选择预约信号
                  </option>
                  {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
                    <option key={index} value={template.text} className="text-white bg-gray-700">
                      {template.text}
                    </option>
                  ))}
                </select>
                {auxiliarySignal === '自定义信号' && (
                  <input
                    type="text"
                    value={customAuxiliarySignal}
                    onChange={(e) => setCustomAuxiliarySignal(e.target.value)}
                    placeholder="输入你的自定义预约信号"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-blue-500">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  预约时长
                </label>
                <select
                  value={AUXILIARY_DURATION_PRESETS.includes(auxiliaryDuration) ? auxiliaryDuration : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setAuxiliaryDuration(25); // Default custom value
                    } else {
                      setAuxiliaryDuration(Number(e.target.value));
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
                  required
                >
                  {AUXILIARY_DURATION_PRESETS.map((preset) => (
                    <option key={preset} value={preset} className="text-white bg-gray-700">
                      {preset}分钟
                    </option>
                  ))}
                  <option value="custom" className="text-white bg-gray-700">自定义时长</option>
                </select>
                {!AUXILIARY_DURATION_PRESETS.includes(auxiliaryDuration) && (
                  <input
                    type="number"
                    value={auxiliaryDuration}
                    onChange={(e) => setAuxiliaryDuration(Number(e.target.value))}
                    placeholder="输入自定义时长（分钟）"
                    min="1"
                    max="120"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 border-l-4 border-l-blue-500">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  预约完成条件（通常与主链触发器相同）
                </label>
                <input
                  type="text"
                  value={auxiliaryCompletionTrigger}
                  onChange={(e) => setAuxiliaryCompletionTrigger(e.target.value)}
                  placeholder="例如：打开编程软件、坐到书房书桌前"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <p className="text-gray-400 text-xs mt-2">
                  这是你在预约时间内必须完成的动作，通常就是主链的"神圣座位"触发器
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              任务描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="具体要做什么？例如：完成CS61A项目的第一部分"
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
              required
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Save size={20} />
              <span>{isEditing ? '保存更改' : '创建链条'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};