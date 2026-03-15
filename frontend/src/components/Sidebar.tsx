'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FileText,
  Briefcase,
  Users,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  User,
  Upload,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserStore } from '@/stores/userStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '上传简历', href: '/', icon: <Upload size={20} /> },
  { label: '简历管理', href: '/resumes', icon: <FileText size={20} /> },
  { label: '岗位管理', href: '/jobs', icon: <Briefcase size={20} /> },
  { label: '候选人', href: '/candidates', icon: <Users size={20} /> },
  { label: '设置', href: '/settings', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }

    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setIsCollapsed(saved === 'true');
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle);
  }, []);

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem('sidebarCollapsed', String(newValue));
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!mounted) {
    return (
      <aside className="w-64 h-screen bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
        <div className="p-4">Loading...</div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-primary-600">简历筛选系统</h1>
          )}
          <button
            onClick={handleToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={isActive ? 'text-primary-600 dark:text-primary-400' : ''}>
                  {item.icon}
                </span>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-200 dark:border-slate-700 space-y-1">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? (theme === 'dark' ? '切换到亮色' : '切换到暗色') : undefined}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span>{theme === 'dark' ? '亮色模式' : '暗色模式'}</span>}
          </button>
        </div>

        {user && (
          <div className="p-2 border-t border-gray-200 dark:border-slate-700">
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <User size={16} className="text-primary-600 dark:text-primary-400" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? '退出登录' : undefined}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>退出登录</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
