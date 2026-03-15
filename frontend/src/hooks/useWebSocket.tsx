'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/userStore';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'error' | 'match_complete';
  title: string;
  message: string;
  jobId?: number;
  createdAt: string;
}

interface WebSocketContextType {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  clearUnread: () => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

let globalSocket: Socket | null = null;
let notificationList: Notification[] = [];
let unreadCountNum = 0;
let connectedState = false;
let renderCount = 0;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [, forceUpdate] = useState(0);
  const initialized = useRef(false);
  const token = useUserStore((state) => state.token);

  useEffect(() => {
    if (initialized.current || !token) return;
    initialized.current = true;
    renderCount++;

    console.log('tazlyx debug: WebSocket initialized, count:', renderCount);

    if (globalSocket?.connected) {
      connectedState = true;
      forceUpdate(n => n + 1);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
    
    globalSocket = io(wsUrl, {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    globalSocket.on('connect', () => {
      console.log('tazlyx debug: SocketIO connected');
      connectedState = true;
      forceUpdate(n => n + 1);
    });

    globalSocket.on('disconnect', () => {
      console.log('tazlyx debug: SocketIO disconnected');
      connectedState = false;
      forceUpdate(n => n + 1);
    });

    globalSocket.on('notification', (data: any) => {
      console.log('tazlyx debug: Received notification:', data);
      const notification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        type: data.type || 'info',
        title: data.title || '通知',
        message: data.message || '',
        jobId: data.job_id,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      
      notificationList = [notification, ...notificationList];
      unreadCountNum++;
      forceUpdate(n => n + 1);
    });

    globalSocket.on('connect_error', (error) => {
      console.error('tazlyx debug: SocketIO connection error:', error);
      connectedState = false;
      forceUpdate(n => n + 1);
    });

    return () => {
      // 不在这里断开连接，保持全局连接
    };
  }, [token]);

  const clearUnread = () => {
    unreadCountNum = 0;
    forceUpdate(n => n + 1);
  };

  const clearNotifications = () => {
    notificationList = [];
    unreadCountNum = 0;
    forceUpdate(n => n + 1);
  };

  return (
    <WebSocketContext.Provider value={{
      notifications: notificationList,
      unreadCount: unreadCountNum,
      connected: connectedState,
      clearUnread,
      clearNotifications,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
