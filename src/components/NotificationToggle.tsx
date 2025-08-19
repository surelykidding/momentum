import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { notificationManager } from '../utils/notifications';

export const NotificationToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = notificationManager.isSupported();
    setIsSupported(supported);
    
    if (supported) {
      setIsEnabled(notificationManager.isNotificationsEnabled());
    }
  }, []);

  const handleToggle = async () => {
    if (!isSupported) return;

    if (isEnabled) {
      // 禁用通知
      notificationManager.disableNotifications();
      setIsEnabled(false);
    } else {
      // 启用通知
      const granted = await notificationManager.enableNotifications();
      setIsEnabled(granted);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
        {isEnabled ? (
          <Bell size={16} className="text-blue-500" />
        ) : (
          <BellOff size={16} className="text-gray-400" />
        )}
        <span className="text-sm font-chinese">桌面通知</span>
      </div>
      
      {/* iOS风格开关 */}
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          isEnabled 
            ? 'bg-primary-500' 
            : 'bg-gray-200 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={isEnabled}
        aria-label="切换桌面通知"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};