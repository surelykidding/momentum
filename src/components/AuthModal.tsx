import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError('请输入邮箱地址');
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }
    
    if (!password) {
      setError('请输入密码');
      return false;
    }
    
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { error } = await auth.signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('邮箱或密码错误');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('登录成功！');
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1000);
        }
      } else {
        const { error } = await auth.signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('该邮箱已被注册，请直接登录');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('注册成功！请检查邮箱验证链接（如果需要）');
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 2000);
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-gray-200 dark:border-slate-600 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl">
            <User className="text-white" size={24} />
          </div>
          <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            {isLogin ? '登录账户' : '创建账户'}
          </h2>
          <p className="text-sm font-mono text-gray-500 dark:text-slate-400 tracking-wider uppercase">
            {isLogin ? 'SIGN IN' : 'SIGN UP'}
          </p>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center space-x-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-600 dark:text-red-400 text-sm font-chinese">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center space-x-3">
            <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
            <p className="text-green-600 dark:text-green-400 text-sm font-chinese">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium mb-3 font-chinese">
              邮箱地址
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="输入你的邮箱地址"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl pl-12 pr-4 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium mb-3 font-chinese">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码（至少6个字符）"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl pl-12 pr-12 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {!isLogin && (
            <div>
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium mb-3 font-chinese">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl pl-12 pr-4 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-primary hover:shadow-xl text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{isLogin ? '登录中...' : '注册中...'}</span>
              </>
            ) : (
              <span>{isLogin ? '登录' : '注册'}</span>
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-slate-400 text-sm font-chinese">
            {isLogin ? '还没有账户？' : '已有账户？'}
            <button
              onClick={switchMode}
              disabled={loading}
              className="ml-2 text-primary-500 hover:text-primary-600 font-medium transition-colors disabled:opacity-50 font-chinese"
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
            <div className="text-blue-700 dark:text-blue-300 text-sm font-chinese">
              <p className="font-medium mb-1">多端同步说明：</p>
              <ul className="space-y-1 text-xs">
                <li>• 登录后所有数据将自动同步到云端</li>
                <li>• 支持手机、平板、电脑等多设备访问</li>
                <li>• 链条记录、完成历史等数据实时同步</li>
                <li>• 数据安全加密存储</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};