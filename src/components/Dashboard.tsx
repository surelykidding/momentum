import React from 'react';
import { Chain, ScheduledSession } from '../types';
import { ChainCard } from './ChainCard';
import { ThemeToggle } from './ThemeToggle';
import { UserProfile } from './UserProfile';
import { Plus, LogIn, Cloud } from 'lucide-react';

interface DashboardProps {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  user: any;
  onShowAuth: () => void;
  onSignOut: () => void;
  onSyncData: () => void;
  isSyncing: boolean;
  lastSyncTime?: Date | null;
  onCreateChain: () => void;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewChainDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  chains,
  scheduledSessions,
  user,
  onShowAuth,
  onSignOut,
  onSyncData,
  isSyncing,
  lastSyncTime,
  onCreateChain,
  onStartChain,
  onScheduleChain,
  onViewChainDetail,
  onCancelScheduledSession,
  onDeleteChain,
}) => {
  const getScheduledSession = (chainId: string) => {
    return scheduledSessions.find(session => session.chainId === chainId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with auth and theme controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                <Cloud size={16} className={isSyncing ? 'animate-pulse text-blue-500' : 'text-green-500'} />
                <span className="font-chinese">
                  {isSyncing ? '同步中...' : '已同步'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <UserProfile
                user={user}
                onSignOut={onSignOut}
                onSyncData={onSyncData}
                isSyncing={isSyncing}
                lastSyncTime={lastSyncTime || undefined}
              />
            ) : (
              <button
                onClick={onShowAuth}
                className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-700/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl dark:shadow-slate-900/50 focus-ring"
              >
                <LogIn size={18} className="text-gray-700 dark:text-slate-300" />
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 font-chinese">
                  登录/注册
                </span>
              </button>
            )}
          <ThemeToggle variant="dropdown" showLabel />
          </div>
        </div>
        
        <header className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-xl">
              <i className="fas fa-rocket text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                Momentum
              </h1>
              <p className="text-sm font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">
                CTDP Protocol
              </p>
            </div>
          </div>
          <p className="text-gray-700 dark:text-slate-300 max-w-3xl mx-auto text-lg leading-relaxed font-chinese">
            基于链式时延协议理论，通过<span className="font-semibold text-primary-500">神圣座位原理</span>、
            <span className="font-semibold text-primary-500">下必为例原理</span>和
            <span className="font-semibold text-primary-500">线性时延原理</span>，
            帮助你建立强大的习惯链条
          </p>
          
          {/* Multi-device sync info */}
          {user && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Cloud className="text-blue-500" size={24} />
                  <h3 className="text-lg font-bold font-chinese text-blue-700 dark:text-blue-300">
                    多端同步已启用
                  </h3>
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-chinese text-center">
                  你的所有链条数据已自动同步到云端，可在任何设备上访问
                </p>
                {lastSyncTime && (
                  <p className="text-blue-500 dark:text-blue-400 text-xs font-mono text-center mt-2">
                    上次同步: {lastSyncTime.toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Login prompt for guests */}
          {!user && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <LogIn className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-bold font-chinese text-yellow-700 dark:text-yellow-300">
                    登录以启用多端同步
                  </h3>
                </div>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-chinese text-center mb-4">
                  登录后可在手机、平板、电脑等多设备间同步所有数据
                </p>
                <button
                  onClick={onShowAuth}
                  className="mx-auto block bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-xl font-medium transition-colors duration-200 font-chinese"
                >
                  立即登录
                </button>
              </div>
            </div>
          )}
        </header>

        {chains.length === 0 ? (
          <div className="text-center py-20 animate-slide-up">
            <div className="bento-card max-w-lg mx-auto">
              <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <i className="fas fa-link text-white text-2xl"></i>
              </div>
              <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
                创建你的第一条链
              </h2>
              <p className="text-gray-700 dark:text-slate-300 mb-8 leading-relaxed">
                链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。
              </p>
              <button
                onClick={onCreateChain}
                className="gradient-primary hover:shadow-2xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 mx-auto hover:scale-105 shadow-xl"
              >
                <i className="fas fa-plus text-lg"></i>
                <span className="font-chinese font-semibold">创建第一条链</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                  你的任务链
                </h2>
                <p className="text-gray-600 dark:text-slate-400 font-mono text-sm tracking-wide">
                  YOUR TASK CHAINS
                </p>
              </div>
              <button
                onClick={onCreateChain}
                className="gradient-dark hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
              >
                <i className="fas fa-plus"></i>
                <span className="font-chinese font-medium">新建链</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {chains.map(chain => (
                <ChainCard
                  key={chain.id}
                  chain={chain}
                  scheduledSession={getScheduledSession(chain.id)}
                  onStartChain={onStartChain}
                  onScheduleChain={onScheduleChain}
                  onViewDetail={onViewChainDetail}
                  onCancelScheduledSession={onCancelScheduledSession}
                  onDelete={onDeleteChain}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};