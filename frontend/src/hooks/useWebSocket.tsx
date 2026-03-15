'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/userStore';

/**
 * WebSocket 通知消息接口定义
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'error' | 'match_complete';
  title: string;
  message: string;
  jobId?: number;
  createdAt: string;
}

/**
 * WebSocket 上下文状态接口定义
 */
interface WebSocketContextType {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  clearUnread: () => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// 使用全局变量来持久化 Socket 连接和通知列表，避免 React 组件重新渲染导致状态丢失
let globalSocket: Socket | null = null;
let notificationList: Notification[] = [];
let unreadCountNum = 0;
let connectedState = false;
let renderCount = 0;

/**
 * WebSocket 提供者组件
 * 负责建立与后端的 Socket.io 连接，并管理全局通知状态
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [, forceUpdate] = useState(0);
  const initialized = useRef(false);
  const token = useUserStore((state) => state.token);

  useEffect(() => {
    // 仅在 Token 存在且未初始化时建立连接
    if (initialized.current || !token) return;
    initialized.current = true;
    renderCount++;

    console.log('tazlyx debug: WebSocket initialized, count:', renderCount);

    // 如果已有连接，则不再重复创建
    if (globalSocket?.connected) {
      connectedState = true;
      forceUpdate(n => n + 1);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
    
    // 初始化 Socket.io 客户端，使用 WebSocket 传输，并携带 JWT Token 进行认证
    globalSocket = io(wsUrl, {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    // 连接成功回调
    globalSocket.on('connect', () => {
      console.log('tazlyx debug: SocketIO connected');
      connectedState = true;
      forceUpdate(n => n + 1);
    });

    // 连接断开回调
    globalSocket.on('disconnect', () => {
      console.log('tazlyx debug: SocketIO disconnected');
      connectedState = false;
      forceUpdate(n => n + 1);
    });

    // 监听后端推送的通知事件
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
      
      // 将新通知插入到列表头部
      notificationList = [notification, ...notificationList];
      unreadCountNum++;
      forceUpdate(n => n + 1);
    });

    // 连接错误处理
    globalSocket.on('connect_error', (error) => {
      console.error('tazlyx debug: SocketIO connection error:', error);
      connectedState = false;
      forceUpdate(n => n + 1);
    });

    return () => {
      // 不在这里断开连接，保持全局连接
    };
  }, [token]);

  // 清除未读计数
  const clearUnread = () => {
    unreadCountNum = 0;
    forceUpdate(n => n + 1);
  };

  // 清空所有通知
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

/**
 * Hook: 获取全局 WebSocket 状态和操作方法
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
