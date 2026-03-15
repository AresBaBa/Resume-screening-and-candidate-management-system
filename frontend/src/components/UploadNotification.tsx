'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X, Bell } from 'lucide-react';

export interface UploadNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface UploadNotificationContextType {
  showNotification: (type: UploadNotification['type'], title: string, message: string) => void;
}

const UploadNotificationContext = createContext<UploadNotificationContextType | undefined>(undefined);

export function UploadNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);

  const showNotification = useCallback((type: UploadNotification['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: UploadNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-500" />;
      case 'error':
        return <XCircle size={24} className="text-red-500" />;
      default:
        return <Info size={24} className="text-blue-500" />;
    }
  };

  const getStyles = (type: UploadNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-500';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-500';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500';
    }
  };

  return (
    <UploadNotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-3"> */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 shadow-2xl min-w-[350px] max-w-[450px] animate-in fade-in zoom-in duration-300 ${getStyles(notification.type)}`}
          >
            {getIcon(notification.type)}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </UploadNotificationContext.Provider>
  );
}

export function useUploadNotification() {
  const context = useContext(UploadNotificationContext);
  if (!context) {
    throw new Error('useUploadNotification must be used within UploadNotificationProvider');
  }
  return context;
}
