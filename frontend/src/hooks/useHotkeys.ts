'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const { toggleTheme } = useTheme();
  const router = useRouter();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      for (const hotkey of hotkeys) {
        const ctrlMatch = hotkey.ctrl ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = hotkey.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          hotkey.action();
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalHotkeys() {
  const router = useRouter();
  const { toggleTheme } = useTheme();

  const hotkeys: HotkeyConfig[] = [
    {
      key: '1',
      ctrl: true,
      action: () => router.push('/resumes'),
      description: '跳转到简历管理',
    },
    {
      key: '2',
      ctrl: true,
      action: () => router.push('/jobs'),
      description: '跳转到岗位管理',
    },
    {
      key: '3',
      ctrl: true,
      action: () => router.push('/candidates'),
      description: '跳转到候选人',
    },
    {
      key: 'd',
      ctrl: true,
      action: () => toggleTheme(),
      description: '切换主题',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => {
        const sidebar = localStorage.getItem('sidebarCollapsed');
        localStorage.setItem('sidebarCollapsed', sidebar === 'true' ? 'false' : 'true');
        window.dispatchEvent(new Event('sidebar-toggle'));
      },
      description: '切换侧边栏',
    },
  ];

  useHotkeys(hotkeys);
}
