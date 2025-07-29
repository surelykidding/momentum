import React, { useState } from 'react';
import { User, LogOut, Cloud, Smartphone, Monitor, Sync, Settings } from 'lucide-react';
import { auth } from '../lib/supabase';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
  onSyncData: () => void;
  isSyncing: boolean;
  lastSyncTime?: Date;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onSignOut,
  onSyncData,
  isSyncing,
  lastSyncTime,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      onSignOut();
      setShowSignOutConfirm(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-700/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl dark:shadow-slate-900/50 focus-ring"
        >
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 font-chinese">
              {user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
              已登录
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-600 dark:text-slate-400 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-slate-600/60 backdrop-blur-xl z-20 animate-scale-in">
              <div className="p-4">
                {/* User Info */}
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 dark:border-slate-600">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-slate-100 font-chinese">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                      用户ID: {user.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="py-4 border-b border-gray-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Cloud size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300 font-chinese">
                        云端同步
                      </span>
                    </div>
                    <button
                      onClick={onSyncData}
                      disabled={isSyncing}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs transition-colors disabled:opacity-50"
                    >
                      <Sync size={12} className={isSyncing ? 'animate-spin' : ''} />
                      <span className="font-chinese">{isSyncing ? '同步中' : '立即同步'}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-chinese">数据已同步到云端</span>
                    </div>
                    {lastSyncTime && (
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-clock text-gray-400"></i>
                        <span className="font-chinese">
                          上次同步: {lastSyncTime.toLocaleString('zh-CN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Multi-device Info */}
                <div className="py-4 border-b border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2 mb-3">
                    <Settings size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 font-chinese">
                      多端访问
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Smartphone size={14} className="text-green-500" />
                      <span className="text-xs text-gray-600 dark:text-slate-400 font-chinese">手机端</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Monitor size={14} className="text-green-500" />
                      <span className="text-xs text-gray-600 dark:text-slate-400 font-chinese">电脑端</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 font-chinese">
                    在任何设备上登录相同账户即可同步所有数据
                  </p>
                </div>

                {/* Sign Out */}
                <div className="pt-4">
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-chinese"
                  >
                    <LogOut size={16} />
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-gray-200 dark:border-slate-600 shadow-2xl animate-scale-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <LogOut className="text-red-500" size={24} />
              </div>
              <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                确认退出登录
              </h3>
              <p className="text-gray-600 dark:text-slate-400 font-chinese">
                退出后需要重新登录才能同步数据
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 px-6 py-3 rounded-2xl font-medium transition-colors duration-200 font-chinese"
              >
                取消
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors duration-200 flex items-center justify-center space-x-2 font-chinese"
              >
                <LogOut size={16} />
                <span>确认退出</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};