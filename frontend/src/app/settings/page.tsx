'use client';

import { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import Header from '@/components/Header';
import { Moon, Sun, Keyboard, Bell, Shield, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUserStore();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header title="设置" />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} />
              个人信息
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  defaultValue={user?.name || ''}
                  className="input max-w-md"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || ''}
                  className="input max-w-md"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  电话
                </label>
                <input
                  type="tel"
                  defaultValue={user?.phone || ''}
                  className="input max-w-md"
                  placeholder="请输入电话号码"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              外观设置
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">主题模式</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  选择您喜欢的界面主题
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  } flex items-center justify-center`}
                >
                  {theme === 'dark' ? (
                    <Moon size={14} className="text-primary-600" />
                  ) : (
                    <Sun size={14} className="text-yellow-500" />
                  )}
                </span>
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                当前主题：{theme === 'dark' ? '暗色模式' : '亮色模式'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                提示：也可以使用 Ctrl + D 快捷键切换主题
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell size={20} />
              通知设置
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">系统通知</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    接收系统推送通知
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">邮件更新</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    接收重要邮件通知
                  </p>
                </div>
                <button
                  onClick={() => setEmailUpdates(!emailUpdates)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    emailUpdates ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      emailUpdates ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Keyboard size={20} />
              快捷键
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">简历管理</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + 1
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">岗位管理</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + 2
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">候选人</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + 3
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">切换主题</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + D
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">切换侧边栏</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + B
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-300">显示快捷键</span>
                <kbd className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-mono">
                  Ctrl + ?
                </kbd>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield size={20} />
              安全设置
            </h2>
            <div className="space-y-4">
              <button className="btn btn-secondary">
                修改密码
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                定期修改密码可以保护您的账户安全
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary flex items-center gap-2">
              <Save size={18} />
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
