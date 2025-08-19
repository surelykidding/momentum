import React, { useState } from 'react';
import { Chain, ChainType } from '../types';
import { ArrowLeft, Save, Headphones, Code, BookOpen, Dumbbell, Coffee, Target, Clock, Bell } from 'lucide-react';

interface ChainEditorProps {
  chain?: Chain;
  isEditing: boolean;
  initialParentId?: string;
  onSave: (chain: Omit<Chain, 'id' | 'currentStreak' | 'auxiliaryStreak' | 'totalCompletions' | 'totalFailures' | 'auxiliaryFailures' | 'createdAt' | 'lastCompletedAt'>) => void;
  onCancel: () => void;
}

const TRIGGER_TEMPLATES = [
  { icon: Headphones, text: '戴上降噪耳机', color: 'text-primary-500' },
  { icon: Code, text: '打开编程软件', color: 'text-green-500' },
  { icon: BookOpen, text: '坐到书房书桌前', color: 'text-blue-500' },
  { icon: Dumbbell, text: '换上运动服', color: 'text-red-500' },
  { icon: Coffee, text: '准备一杯咖啡', color: 'text-yellow-500' },
  { icon: Target, text: '自定义触发器', color: 'text-gray-500' },
];

const AUXILIARY_SIGNAL_TEMPLATES = [
  { icon: Target, text: '打响指', color: 'text-primary-500' },
  { icon: Clock, text: '设置手机闹钟', color: 'text-green-500' },
  { icon: Bell, text: '按桌上的铃铛', color: 'text-blue-500' },
  { icon: Coffee, text: '说"开始预约"', color: 'text-yellow-500' },
  { icon: Target, text: '自定义信号', color: 'text-gray-500' },
];

const AUXILIARY_DURATION_PRESETS = [5, 10, 15, 20, 30, 45];
const DURATION_PRESETS = [25, 30, 45, 60, 90, 120];

export const ChainEditor: React.FC<ChainEditorProps> = ({
  chain,
  isEditing,
  initialParentId,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(chain?.name || '');
  const [type, setType] = useState<ChainType>(chain?.type || 'unit');
  const [parentId, setParentId] = useState(chain?.parentId || initialParentId || undefined);
  const [sortOrder, setSortOrder] = useState(chain?.sortOrder || Math.floor(Date.now() / 1000));
  const [trigger, setTrigger] = useState(chain?.trigger || '');
  const [customTrigger, setCustomTrigger] = useState('');
  const [duration, setDuration] = useState(chain?.duration || 45);
  const [isCustomDuration, setIsCustomDuration] = useState(
    chain?.duration ? !DURATION_PRESETS.includes(chain.duration) : false
  );
  const [isDurationless, setIsDurationless] = useState<boolean>(!!chain?.isDurationless);
  const [description, setDescription] = useState(chain?.description || '');
  
  // 辅助链状态
  const [auxiliarySignal, setAuxiliarySignal] = useState(chain?.auxiliarySignal || '');
  const [customAuxiliarySignal, setCustomAuxiliarySignal] = useState('');
  const [auxiliaryDuration, setAuxiliaryDuration] = useState(chain?.auxiliaryDuration || 15);
  const [isCustomAuxiliaryDuration, setIsCustomAuxiliaryDuration] = useState(
    chain?.auxiliaryDuration ? !AUXILIARY_DURATION_PRESETS.includes(chain.auxiliaryDuration) : false
  );
  const [auxiliaryCompletionTrigger, setAuxiliaryCompletionTrigger] = useState(
    chain?.auxiliaryCompletionTrigger || ''
  );

  // 时间限定状态
  const [timeLimitHours, setTimeLimitHours] = useState(chain?.timeLimitHours);
  const [timeLimitExceptions, setTimeLimitExceptions] = useState<string[]>(
    chain?.timeLimitExceptions || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('ChainEditor - 提交表单');
    console.log('当前表单数据:', {
      name: name.trim(),
      type,
      parentId,
      sortOrder,
      trigger,
      duration,
      description: description.trim(),
      auxiliarySignal,
      auxiliaryDuration,
      auxiliaryCompletionTrigger: auxiliaryCompletionTrigger.trim()
    });
    
    // For group chains, only name and description are required
    if (type === 'group') {
      if (!name.trim() || !description.trim()) return;
    } else {
      // For other chain types, all fields are required
      if (!name.trim() || !trigger.trim() || !description.trim() || 
          !auxiliarySignal.trim() || !auxiliaryCompletionTrigger.trim()) return;
    }

    // 如果时长为0（空值状态），使用默认值
    const finalDuration = isDurationless ? 0 : (duration === 0 ? 45 : duration);
    const finalAuxiliaryDuration = auxiliaryDuration === 0 ? 15 : auxiliaryDuration;

    // CRITICAL: 防止循环引用 - 不能把自己设为自己的父节点
    let finalParentId = parentId;
    if (chain && finalParentId === chain.id) {
      console.warn('检测到循环引用，将parentId重置为undefined');
      finalParentId = undefined;
    }
    const chainData = {
      name: name.trim(),
      type,
      parentId: finalParentId,
      sortOrder,
      trigger: type === 'group' && !trigger ? '任务群容器' : (trigger === '自定义触发器' ? customTrigger.trim() : trigger),
      duration: finalDuration,
      isDurationless,
      description: description.trim(),
      auxiliarySignal: type === 'group' && !auxiliarySignal ? '打响指' : (auxiliarySignal === '自定义信号' ? customAuxiliarySignal.trim() : auxiliarySignal),
      auxiliaryDuration: finalAuxiliaryDuration,
      auxiliaryCompletionTrigger: type === 'group' && !auxiliaryCompletionTrigger ? '开始第一个子任务' : auxiliaryCompletionTrigger.trim(),
      exceptions: chain?.exceptions || [],
      auxiliaryExceptions: chain?.auxiliaryExceptions || [],
      timeLimitHours: type === 'group' ? timeLimitHours : undefined,
      timeLimitExceptions: type === 'group' ? timeLimitExceptions.filter(ex => ex.trim()) : [],
    };
    
    console.log('ChainEditor - 即将保存的链条数据:', chainData);
    console.log('ChainEditor - 是否为编辑模式:', !!chain);
    if (chain) {
      console.log('ChainEditor - 原始链条数据:', chain);
    }
    
    onSave(chainData);
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center space-x-4 mb-12 animate-fade-in">
          <button
            onClick={onCancel}
            className="p-3 text-gray-400 hover:text-[#161615] transition-colors rounded-2xl hover:bg-white/50"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
              {isEditing ? '编辑链条' : '创建新链条'}
            </h1>
            <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
              {isEditing ? 'EDIT CHAIN' : 'CREATE NEW CHAIN'}
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Chain Name */}
          <div className="bento-card animate-scale-in">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <i className="fas fa-tag text-primary-500"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">链名称</h3>
                <p className="text-sm font-mono text-gray-500 tracking-wide">CHAIN NAME</p>
              </div>
            </div>
            <input
              type="text"
              id="chain-name"
              name="chainName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：学习Python、健身30分钟、无干扰写作"
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              required
            />
          </div>

          {/* Chain Type */}
          <div className="bento-card animate-scale-in">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <i className="fas fa-layer-group text-green-500"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">任务类型</h3>
                <p className="text-sm font-mono text-gray-500 tracking-wide">CHAIN TYPE</p>
              </div>
            </div>
            <select
              id="chain-type"
              name="chainType"
              value={type}
              onChange={(e) => setType(e.target.value as ChainType)}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 font-chinese"
              required
            >
              <option value="unit">基础单元</option>
              <option value="group">任务群容器</option>
              <option value="assault">突击单元（学习、实验、论文）</option>
              <option value="recon">侦查单元（信息搜集）</option>
              <option value="command">指挥单元（制定计划）</option>
              <option value="special_ops">特勤单元（处理杂事）</option>
              <option value="engineering">工程单元（运动锻炼）</option>
              <option value="quartermaster">炊事单元（备餐做饭）</option>
            </select>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* 主链设置 */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center">
                  <i className="fas fa-fire text-primary-500"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">主链设置</h3>
                  <p className="text-sm font-mono text-gray-500 tracking-wide">MAIN CHAIN</p>
                </div>
              </div>
              
              {/* 无时长任务开关 */}
              <div className="bento-card border-l-4 border-l-purple-500 animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-infinity text-purple-500"></i>
                    <div>
                      <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">无时长任务</h4>
                      <p className="text-xs font-mono text-gray-500">DURATIONLESS TASK</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDurationless}
                      onChange={(e) => setIsDurationless(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400 font-chinese">
                  开启后，本任务不会倒计时，你可以在专注模式中自行点击“完成任务”结束。
                </p>
              </div>
              
              {/* 神圣座位 */}
              <div className={`bento-card border-l-4 border-l-primary-500 animate-scale-in`}>
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-crown text-primary-500"></i>
                  <div>
                    <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">神圣座位</h4>
                    <p className="text-xs font-mono text-gray-500">SACRED SEAT TRIGGER</p>
                  </div>
                </div>
                <select
                  id="sacred-seat-trigger"
                  name="sacredSeatTrigger"
                  value={trigger}
                  onChange={(e) => handleTriggerSelect(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 mb-4 font-chinese"
                 required={type !== 'group'}
                >
                 <option value="" disabled className="text-gray-400">
                   {type === 'group' ? '选择触发动作（可选）' : '选择触发动作'}
                  </option>
                  {TRIGGER_TEMPLATES.map((template, index) => (
                    <option key={index} value={template.text} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                      {template.text}
                    </option>
                  ))}
                </select>
                {trigger === '自定义触发器' && (
                  <input
                    type="text"
                    id="custom-trigger"
                    name="customTrigger"
                    value={customTrigger}
                    onChange={(e) => setCustomTrigger(e.target.value)}
                    placeholder="输入你的自定义触发动作"
                    className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
                    required
                  />
                )}
              </div>

              {/* 任务时长 */}
              {!isDurationless && (
                <div className="bento-card border-l-4 border-l-primary-500 animate-scale-in">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="text-primary-500" size={20} />
                    <div>
                      <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">任务时长</h4>
                      <p className="text-xs font-mono text-gray-500">TASK DURATION</p>
                    </div>
                  </div>
                  <select
                    id="task-duration"
                    name="taskDuration"
                    value={isCustomDuration ? "custom" : duration}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomDuration(true);
                        setDuration(60);
                      } else {
                        setIsCustomDuration(false);
                        setDuration(Number(e.target.value));
                      }
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 mb-4 font-chinese"
                    required
                  >
                    {DURATION_PRESETS.map((preset) => (
                      <option key={preset} value={preset} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                        {preset}分钟
                      </option>
                    ))}
                    <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">自定义时长</option>
                  </select>
                  {isCustomDuration && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-700 dark:text-slate-300 font-chinese">自定义:</span>
                        <input
                          type="range"
                          id="duration-slider"
                          name="durationSlider"
                          min="1"
                          max="300"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #6366F1 0%, #6366F1 ${((duration - 1) / 299) * 100}%, #E5E7EB ${((duration - 1) / 299) * 100}%, #E5E7EB 100%)`
                          }}
                        />
                        <span className="text-primary-500 font-mono font-semibold min-w-[60px] text-right">
                          {duration}分钟
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-700 dark:text-slate-300 font-chinese">键盘输入:</span>
                        <input
                          type="number"
                          id="duration-input"
                          name="durationInput"
                          min="1"
                          max="300"
                          value={duration === 0 ? '' : duration}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              setDuration(0);
                              return;
                            }
                            const value = parseInt(e.target.value);
                            if (isNaN(value)) {
                              return;
                            }
                            if (value >= 1 && value <= 300) {
                              setDuration(value);
                            } else if (value < 1) {
                              setDuration(1);
                            } else if (value > 300) {
                              setDuration(300);
                            }
                          }}
                          className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 w-20 text-center font-mono"
                        />
                        <span className="text-gray-500 dark:text-slate-400 font-chinese text-sm">分钟</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {type === 'group' && (
                <>
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                      <div>
                        <h4 className="text-blue-700 dark:text-blue-300 font-semibold font-chinese mb-2">任务群创建提示</h4>
                        <ul className="text-blue-600 dark:text-blue-400 text-sm space-y-1 font-chinese">
                          <li>• 任务群用于将多个相关任务组织在一起</li>
                          <li>• 创建后可以在任务群详情页添加子任务</li>
                          <li>• 适用于大型项目的分解管理</li>
                          <li>• 可以追踪整个项目群的总体进度</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 时间限定设置 */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                        <i className="fas fa-clock text-orange-500"></i>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">时间限定设置</h3>
                        <p className="text-sm font-mono text-gray-500 tracking-wide">TIME LIMIT</p>
                      </div>
                    </div>

                    {/* 时间限制开关 */}
                    <div className="bento-card border-l-4 border-l-orange-500 animate-scale-in">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <i className="fas fa-stopwatch text-orange-500"></i>
                          <div>
                            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">启用时间限制</h4>
                            <p className="text-xs font-mono text-gray-500">TIME LIMIT ENABLED</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!timeLimitHours}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTimeLimitHours(24); // 默认24小时
                              } else {
                                setTimeLimitHours(undefined);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                      
                      {timeLimitHours && (
                        <div className="space-y-4">
                          {/* 时间限制设置 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
                              时间限制（小时）
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="168" // 一周
                              value={timeLimitHours}
                              onChange={(e) => setTimeLimitHours(parseInt(e.target.value) || undefined)}
                              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-300 font-chinese"
                              placeholder="24"
                            />
                          </div>

                          {/* 例外规则 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
                              例外规则（可选）
                            </label>
                            <div className="space-y-2">
                              {timeLimitExceptions.map((exception, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={exception}
                                    onChange={(e) => {
                                      const newExceptions = [...timeLimitExceptions];
                                      newExceptions[index] = e.target.value;
                                      setTimeLimitExceptions(newExceptions);
                                    }}
                                    className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-300 font-chinese"
                                    placeholder="例如：紧急会议、生病等"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newExceptions = timeLimitExceptions.filter((_, i) => i !== index);
                                      setTimeLimitExceptions(newExceptions);
                                    }}
                                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => setTimeLimitExceptions([...timeLimitExceptions, ''])}
                                className="w-full bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 rounded-2xl px-4 py-3 text-orange-600 dark:text-orange-400 transition-colors font-chinese"
                              >
                                <i className="fas fa-plus mr-2"></i>
                                添加例外规则
                              </button>
                            </div>
                          </div>

                          {/* 说明 */}
                          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-2xl p-4">
                            <div className="flex items-start space-x-2">
                              <i className="fas fa-info-circle text-orange-500 mt-1"></i>
                              <div className="text-sm text-orange-700 dark:text-orange-300 font-chinese">
                                <p className="mb-2">时间限制功能说明：</p>
                                <ul className="space-y-1 text-xs">
                                  <li>• 任务群开始后，必须在指定时间内完成所有子任务</li>
                                  <li>• 超时未完成将清空任务群进度并记录失败</li>
                                  <li>• 例外规则允许在特定情况下延长或豁免时间限制</li>
                                  <li>• 建议根据任务复杂度合理设置时间限制</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 辅助链设置 */}
           <div className={`space-y-6 ${type === 'group' ? 'opacity-60' : ''}`}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                  <i className="fas fa-calendar-alt text-blue-500"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">辅助链设置</h3>
                 <p className="text-sm font-mono text-gray-500 tracking-wide">
                   {type === 'group' ? 'AUXILIARY CHAIN (选填)' : 'AUXILIARY CHAIN'}
                 </p>
                </div>
              </div>
               
               {type === 'group' && (
                 <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl p-4 mb-6">
                   <div className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-300">
                     <i className="fas fa-lightbulb"></i>
                     <span className="text-sm font-chinese">
                       任务群本身不执行具体任务，以下设置为可选项。你可以简化设置，重点关注任务群的整体描述。
                     </span>
                   </div>
                 </div>
               )}
              
              {/* 预约信号 */}
              <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-bell text-blue-500"></i>
                  <div>
                    <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约信号</h4>
                    <p className="text-xs font-mono text-gray-500">BOOKING SIGNAL</p>
                  </div>
                </div>
                <select
                  id="auxiliary-signal"
                  name="auxiliarySignal"
                  value={auxiliarySignal}
                  onChange={(e) => handleAuxiliarySignalSelect(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 mb-4 font-chinese"
                  required={type !== 'group'}
                >
                  <option value="" disabled className="text-gray-400">
                    {type === 'group' ? '选择预约信号（可选）' : '选择预约信号'}
                  </option>
                  {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
                    <option key={index} value={template.text} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                      {template.text}
                    </option>
                  ))}
                </select>
                {auxiliarySignal === '自定义信号' && (
                  <input
                    type="text"
                    id="custom-auxiliary-signal"
                    name="customAuxiliarySignal"
                    value={customAuxiliarySignal}
                    onChange={(e) => setCustomAuxiliarySignal(e.target.value)}
                    placeholder="输入你的自定义预约信号"
                    className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
                    required
                  />
                )}
              </div>

              {/* 预约时长 */}
              <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-hourglass-half text-blue-500"></i>
                  <div>
                    <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约时长</h4>
                    <p className="text-xs font-mono text-gray-500">BOOKING DURATION</p>
                  </div>
                </div>
                <select
                  id="auxiliary-duration"
                  name="auxiliaryDuration"
                  value={isCustomAuxiliaryDuration ? "custom" : auxiliaryDuration}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomAuxiliaryDuration(true);
                      setAuxiliaryDuration(25);
                    } else {
                      setIsCustomAuxiliaryDuration(false);
                      setAuxiliaryDuration(Number(e.target.value));
                    }
                  }}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 mb-4 font-chinese"
                  required
                >
                  {AUXILIARY_DURATION_PRESETS.map((preset) => (
                    <option key={preset} value={preset} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                      {preset}分钟
                    </option>
                  ))}
                  <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">自定义时长</option>
                </select>
                {isCustomAuxiliaryDuration && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-700 dark:text-slate-300 font-chinese">自定义:</span>
                      <input
                        type="range"
                        id="auxiliary-duration-slider"
                        name="auxiliaryDurationSlider"
                        min="1"
                        max="120"
                        value={auxiliaryDuration}
                        onChange={(e) => setAuxiliaryDuration(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((auxiliaryDuration - 1) / 119) * 100}%, #E5E7EB ${((auxiliaryDuration - 1) / 119) * 100}%, #E5E7EB 100%)`
                        }}
                      />
                      <span className="text-blue-500 font-mono font-semibold min-w-[60px] text-right">
                        {auxiliaryDuration}分钟
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-700 dark:text-slate-300 font-chinese">键盘输入:</span>
                      <input
                        type="number"
                        id="auxiliary-duration-input"
                        name="auxiliaryDurationInput"
                        min="1"
                        max="120"
                        value={auxiliaryDuration === 0 ? '' : auxiliaryDuration}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            setAuxiliaryDuration(0); // 使用0表示空值状态
                            return;
                          }
                          const value = parseInt(e.target.value);
                          if (isNaN(value)) {
                            return; // 忽略非数字输入
                          }
                          if (value >= 1 && value <= 120) {
                            setAuxiliaryDuration(value);
                          } else if (value < 1) {
                            setAuxiliaryDuration(1);
                          } else if (value > 120) {
                            setAuxiliaryDuration(120);
                          }
                        }}
                        className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 w-20 text-center font-mono"
                      />
                      <span className="text-gray-500 dark:text-slate-400 font-chinese text-sm">分钟</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 预约完成条件 */}
              <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-check-circle text-blue-500"></i>
                  <div>
                    <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约完成条件</h4>
                    <p className="text-xs font-mono text-gray-500">COMPLETION CONDITION</p>
                  </div>
                </div>
                <input
                  type="text"
                  id="auxiliary-completion-trigger"
                  name="auxiliaryCompletionTrigger"
                  value={auxiliaryCompletionTrigger}
                  onChange={(e) => setAuxiliaryCompletionTrigger(e.target.value)}
                  placeholder={type === 'group' ? '任务群的预约完成条件（可选）' : '例如：打开编程软件、坐到书房书桌前'}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
                  required={type !== 'group'}
                />
                <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                  {type === 'group' 
                    ? '任务群的预约完成条件，通常是开始执行第一个子任务' 
                    : '这是你在预约时间内必须完成的动作，通常就是主链的"神圣座位"触发器'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* 任务描述 */}
          <div className="bento-card animate-scale-in">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gray-500/10 flex items-center justify-center">
                <i className="fas fa-align-left text-gray-500"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">任务描述</h3>
                <p className="text-sm font-mono text-gray-500 tracking-wide">TASK DESCRIPTION</p>
              </div>
            </div>
            <textarea
              id="task-description"
              name="taskDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'group' 
                  ? '描述这个任务群的目标和范围，例如：期末复习计划、网站开发项目、健身训练计划等'
                  : '具体要做什么？例如：完成CS61A项目的第一部分'
              }
              rows={4}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none font-chinese leading-relaxed"
              required
            />
            
            {type === 'group' && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-check-circle text-green-500 mt-1"></i>
                  <div>
                    <h4 className="text-green-700 dark:text-green-300 font-semibold font-chinese mb-2">任务群描述建议</h4>
                    <ul className="text-green-600 dark:text-green-400 text-sm space-y-1 font-chinese">
                      <li>• 明确这个任务群的总体目标</li>
                      <li>• 说明预期包含哪些类型的子任务</li>
                      <li>• 描述完成标准或里程碑</li>
                      <li>• 可以提及时间安排或优先级</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 animate-scale-in">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 font-chinese"
            >
              <span>取消</span>
            </button>
            <button
              type="submit"
              className="flex-1 gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105 shadow-lg font-chinese"
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