/**
 * 桌面通知工具类
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  /**
   * 检查通知权限
   */
  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持桌面通知');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  }

  /**
   * 显示通知
   */
  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      console.warn('没有通知权限，无法显示通知');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/vite.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // 自动关闭通知（除非需要用户交互）
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('显示通知失败:', error);
      return null;
    }
  }

  /**
   * 任务完成通知
   */
  async notifyTaskCompleted(chainName: string, streak: number) {
    return this.showNotification({
      title: '任务完成',
      body: `"${chainName}"已完成！当前记录: #${streak}`,
      icon: '/vite.svg',
      tag: 'task-completed',
      requireInteraction: false,
    });
  }

  /**
   * 预约即将到期通知（剩余5分钟）
   */
  async notifyScheduleWarning(chainName: string, timeRemaining: string) {
    return this.showNotification({
      title: '预约即将到期',
      body: `"${chainName}"预约还剩${timeRemaining}，请准备开始任务！`,
      icon: '/vite.svg',
      tag: 'schedule-warning',
      requireInteraction: true,
    });
  }

  /**
   * 预约失败通知
   */
  async notifyScheduleFailed(chainName: string) {
    return this.showNotification({
      title: '预约失败',
      body: `"${chainName}"预约时间已到期，需要进行规则判定`,
      icon: '/vite.svg',
      tag: 'schedule-failed',
      requireInteraction: true,
    });
  }

  /**
   * 检查是否支持通知
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * 获取当前权限状态
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// 导出单例实例
export const notificationManager = new NotificationManager();