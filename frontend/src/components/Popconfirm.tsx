'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface PopconfirmProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function Popconfirm({
  title,
  description,
  onConfirm,
  onCancel,
  children,
  confirmText = '确定',
  cancelText = '取消',
  type = 'danger',
}: PopconfirmProps) {
  const [visible, setVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);

  const handleConfirm = () => {
    onConfirm();
    setVisible(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setVisible(false);
  };

  const typeStyles = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      cancelButton: 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600',
    },
    warning: {
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      cancelButton: 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600',
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-primary-600 hover:bg-primary-700 text-white',
      cancelButton: 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <div onClick={() => setVisible(!visible)}>{children}</div>
      
      {visible && (
        <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className={styles.icon} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
              {description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCancel}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${styles.cancelButton}`}
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${styles.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
