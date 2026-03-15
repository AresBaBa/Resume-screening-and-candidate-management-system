'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Plus } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const pathname = usePathname();

  const getPageInfo = () => {
    if (pathname === '/resumes' || pathname.startsWith('/resumes/')) {
      return { title: '简历管理', subtitle: '管理和筛选候选人简历' };
    }
    if (pathname === '/jobs' || pathname.startsWith('/jobs/')) {
      return { title: '岗位管理', subtitle: '创建和管理招聘岗位' };
    }
    if (pathname === '/candidates' || pathname.startsWith('/candidates/')) {
      return { title: '候选人', subtitle: '查看和管理匹配候选人' };
    }
    if (pathname === '/settings') {
      return { title: '设置', subtitle: '系统配置和用户偏好' };
    }
    return { title: '简历筛选系统', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title || pageInfo.title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          {!subtitle && pageInfo.subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pageInfo.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索..."
              className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors relative">
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          {actions}
        </div>
      </div>
    </header>
  );
}
