'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', style = {}, width, height }: SkeletonProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  const customStyle: React.CSSProperties = {
    ...style,
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div 
      className={`animate-pulse rounded ${className}`}
      style={customStyle}
    >
      <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonText({ className = '', width = '100%' }: { className?: string; width?: string | number }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div 
      className={`h-3.5 rounded animate-pulse ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonTitle({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`h-6 w-3/5 rounded animate-pulse ${className}`}>
      <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonSubtitle({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`h-4.5 w-2/5 rounded animate-pulse ${className}`}>
      <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonImage({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`animate-pulse rounded-lg ${className}`} style={style}>
      <div className={`h-full rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`h-9 w-24 rounded-lg animate-pulse ${className}`}>
      <div className={`h-full rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
    </div>
  );
}

export function SkeletonCard({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonCardItem({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`flex gap-4 p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'} ${className}`}>
      <div className="w-12 h-12 rounded-lg animate-pulse">
        <div className={`h-full rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-3/5 rounded animate-pulse">
          <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="h-3 w-2/5 rounded animate-pulse">
          <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="flex gap-2 mt-1">
          <div className="h-3 w-16 rounded animate-pulse">
            <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
          <div className="h-3 w-16 rounded animate-pulse">
            <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonResumeCard({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg animate-pulse flex-shrink-0">
          <div className={`h-full rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-5 w-3/5 rounded animate-pulse mb-2">
            <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
          <div className="h-4 w-2/5 rounded animate-pulse mb-3">
            <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full animate-pulse">
              <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
            <div className="h-5 w-16 rounded-full animate-pulse">
              <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonJobCard({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && theme === 'dark';
  
  return (
    <div className={`rounded-xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-6 w-3/5 rounded animate-pulse mb-2">
            <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 rounded animate-pulse">
              <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
            <div className="h-4 w-20 rounded animate-pulse">
              <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        </div>
        <div className="h-6 w-16 rounded-full animate-pulse">
          <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
      </div>
      
      <div className="h-4 w-full rounded animate-pulse mb-2">
        <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
      </div>
      <div className="h-4 w-4/5 rounded animate-pulse mb-3">
        <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
      </div>
      
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full animate-pulse">
          <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="h-5 w-16 rounded-full animate-pulse">
          <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="h-5 w-16 rounded-full animate-pulse">
          <div className={`h-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
      </div>
      
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
        <div className="h-4 w-20 rounded animate-pulse">
          <div className={`h-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className="flex-1" />
        <div className="h-8 w-16 rounded-lg animate-pulse">
          <div className={`h-full rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
      </div>
    </div>
  );
}
