import React from 'react';
import { ChainTreeNode, ScheduledSession } from '../types';
import { ArrowLeft, Play, Plus, Users, Target, Import, Pencil } from 'lucide-react';
import { getGroupProgress, getNextUnitInGroup, getChainTypeConfig } from '../utils/chainTree';
import { formatTime } from '../utils/time';
import { getGroupTimeStatus } from '../utils/timeLimit';
import { ImportUnitsModal } from './ImportUnitsModal';

interface GroupViewProps {
  group: ChainTreeNode;
  scheduledSessions: ScheduledSession[];
  availableUnits: ChainTreeNode[]; // 可导入的单元
  onBack: () => void;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onEditChain: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
  onAddUnit: () => void;
  onImportUnits: (unitIds: string[], groupId: string, mode?: 'move' | 'copy') => void;
}

export const GroupView: React.FC<GroupViewProps> = ({
  group,
  scheduledSessions,
  availableUnits,
  onBack,
  onStartChain,
  onScheduleChain,
  onEditChain,
  onDeleteChain,
  onAddUnit,
  onImportUnits,
}) => {
  const progress = getGroupProgress(group);
  const nextUnit = getNextUnitInGroup(group);
  const typeConfig = getChainTypeConfig(group.type);
  const timeStatus = getGroupTimeStatus(group);
  const [showImportModal, setShowImportModal] = React.useState(false);

  const getScheduledSession = (chainId: string) => {
    return scheduledSessions.find(session => session.chainId === chainId);
  };

  const renderUnit = (unit: ChainTreeNode, index: number) => {
    const unitTypeConfig = getChainTypeConfig(unit.type);
    const scheduledSession = getScheduledSession(unit.id);
    const isCompleted = unit.currentStreak > 0;
    const isNext = nextUnit?.id === unit.id;

    return (
      <div
        key={unit.id}
        className={`bento-card transition-all duration-300 ${
          isNext ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
        } ${isCompleted ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* 序号 */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              isCompleted 
                ? 'bg-green-500 text-white' 
                : isNext 
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
            }`}>
              {isCompleted ? <i className="fas fa-check text-xs"></i> : index + 1}
            </div>

            {/* 单元信息 */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-6 h-6 rounded-lg ${unitTypeConfig.bgColor} flex items-center justify-center`}>
                  <i className={`${unitTypeConfig.icon} ${unitTypeConfig.color} text-xs`}></i>
                </div>
                <h4 className="font-bold font-chinese text-gray-900 dark:text-slate-100">
                  {unit.name}
                </h4>
                {isNext && (
                  <span className="px-2 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs rounded-full font-chinese">
                    下一个
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
                {unit.description}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <i className="fas fa-clock"></i>
                  <span>{formatTime(unit.duration)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <i className="fas fa-fire"></i>
                  <span>#{unit.currentStreak}</span>
                </span>
                <span className="font-chinese">{unitTypeConfig.name}</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-2">
              {scheduledSession && (
                <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full font-chinese">
                  已预约
                </span>
              )}
              
              <button
                onClick={() => onEditChain(unit.id)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                title="编辑单元"
              >
                <i className="fas fa-edit text-sm"></i>
              </button>

              {!isCompleted && (
                <>
                  <button
                    onClick={() => onScheduleChain(unit.id)}
                    className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm transition-colors font-chinese"
                    disabled={!!scheduledSession}
                  >
                    预约
                  </button>
                  <button
                    onClick={() => onStartChain(unit.id)}
                    className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors font-chinese"
                  >
                    开始
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 animate-fade-in">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-3 text-gray-400 hover:text-[#161615] dark:hover:text-slate-200 transition-colors rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-3xl ${typeConfig.bgColor} flex items-center justify-center`}>
                <i className={`${typeConfig.icon} ${typeConfig.color} text-2xl`}></i>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
                  {group.name}
                </h1>
                <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
                  {typeConfig.name} • {progress.completed}/{progress.total} 已完成
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddUnit}
              className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
            >
              <Plus size={16} />
              <span>添加单元</span>
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
            >
              <Import size={16} />
              <span>导入单元</span>
            </button>

            <button
              onClick={() => onEditChain(group.id)}
              className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
              title="编辑任务群"
            >
              <Pencil size={16} />
              <span>编辑任务群</span>
            </button>

            {nextUnit && (
              <button
                onClick={() => onStartChain(nextUnit.id)}
                className="gradient-primary hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
              >
                <Play size={16} />
                <span>开始下一个</span>
              </button>
            )}
          </div>
        </header>

        {/* Progress Overview */}
        <div className="bento-card mb-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">任务群概览</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <Users size={16} />
                <span>{group.children.length} 个单元</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target size={16} />
                <span>{progress.completed}/{progress.total} 已完成</span>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            >
              {progress.completed > 0 && (
                <span className="text-white text-xs font-bold">
                  {Math.round((progress.completed / progress.total) * 100)}%
                </span>
              )}
            </div>
          </div>
          
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese">
            {group.description}
          </p>

          {/* 时间限定状态 */}
          {group.timeLimitHours && (
            <div className={`mt-6 p-4 rounded-2xl border-l-4 ${
              timeStatus.isExpired 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <i className={`fas fa-clock text-lg ${
                    timeStatus.isExpired ? 'text-red-500' : 'text-orange-500'
                  }`}></i>
                  <div>
                    <h4 className={`font-bold font-chinese ${
                      timeStatus.isExpired ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {timeStatus.isExpired ? '任务群已超时' : '时间限制'}
                    </h4>
                    <p className={`text-sm ${
                      timeStatus.isExpired ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {timeStatus.formattedTime}
                    </p>
                  </div>
                </div>
                
                {!timeStatus.isExpired && (
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          timeStatus.progress > 0.8 ? 'bg-red-500' : 
                          timeStatus.progress > 0.6 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${timeStatus.progress * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {Math.round(timeStatus.progress * 100)}%
                    </span>
                  </div>
                )}
              </div>
              
              {timeStatus.isExpired && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 font-chinese">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  任务群已超时，进度将被清空。请重新开始任务群。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Units List */}
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">任务单元</h2>
            {nextUnit && (
              <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
                下一个待执行：<span className="text-primary-500 font-semibold">{nextUnit.name}</span>
              </p>
            )}
          </div>
          
          {group.children.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-slate-400">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-gray-400" />
              </div>
              <p className="font-chinese text-lg mb-4">此任务群还没有子单元</p>
              <button
                onClick={onAddUnit}
                className="gradient-primary hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 mx-auto hover:scale-105 shadow-lg font-chinese"
              >
                <Plus size={16} />
                <span>添加第一个单元</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {group.children.map((unit, index) => renderUnit(unit, index))}
            </div>
          )}
        </div>
      </div>
      
      {/* Import Units Modal */}
      {showImportModal && (
        <ImportUnitsModal
          availableUnits={availableUnits}
          groupId={group.id}
          onImport={onImportUnits}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};