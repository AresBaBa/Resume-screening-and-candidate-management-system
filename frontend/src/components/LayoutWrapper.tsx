'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { WebSocketProvider } from '@/hooks/useWebSocket';
import { useUserStore } from '@/stores/userStore';
import { useGlobalHotkeys } from '@/hooks/useHotkeys';

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const publicPaths = ['/login', '/register'];

  useGlobalHotkeys();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }

    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved === 'true');
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, pathname, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-200"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (publicPaths.includes(pathname)) {
    return <WebSocketProvider><ToastProvider>{children}</ToastProvider></WebSocketProvider>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WebSocketProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
          <Sidebar />
          <main
            className={`transition-all duration-300 ${
              sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}
          >
            {children}
          </main>
          <KeyboardShortcutsHelp />
        </div>
      </ToastProvider>
    </WebSocketProvider>
  );
}

function KeyboardShortcutsHelp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShow(true);
      }
      if (e.key === 'Escape') {
        setShow(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!show) return null;

  const shortcuts = [
    { key: 'Ctrl + 1', description: '简历管理' },
    { key: 'Ctrl + 2', description: '岗位管理' },
    { key: 'Ctrl + 3', description: '候选人' },
    { key: 'Ctrl + D', description: '切换主题' },
    { key: 'Ctrl + B', description: '切换侧边栏' },
    { key: 'Ctrl + ?', description: '显示快捷键' },
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-4 z-50 w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">键盘快捷键</h3>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{s.description}</span>
            <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs font-mono">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
