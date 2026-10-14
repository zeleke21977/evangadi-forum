import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocketEvent, useSocketResync } from './SocketContext.jsx';
import { notificationService } from '../services/notification/notification.service.js';

const NotificationContext = createContext(undefined);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.list(20),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Silently ignore — the bell just won't update this cycle, no need to
      // interrupt the rest of the app over a notifications hiccup.
    }
  }, []);

  // Load the initial list when logged in; clear it on logout.
  // (The live socket itself is owned by SocketProvider.)
  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clearing local state when the session ends.
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!localStorage.getItem('token')) return; // same key api.client.js reads
    refresh();
  }, [isAuthenticated, refresh]);

  // Live push from the server.
  useSocketEvent('notification:new', payload => {
    setUnreadCount(count => count + 1);
    setNotifications(prev => [
      { id: payload.id ?? `pending-${Date.now()}`, isRead: false, ...payload },
      ...prev,
    ].slice(0, 20));
  });

  // Catch up on anything missed while the connection was down.
  useSocketResync(refresh);

  const markAsRead = async notificationId => {
    // Optimistic update: real ids are numbers; a "pending-..." id came from a
    // live push whose real DB row we haven't fetched yet (only happens for
    // new_question broadcasts, which don't carry a per-recipient id).
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(count => Math.max(count - 1, 0));

    if (typeof notificationId === 'number') {
      try {
        await notificationService.markRead(notificationId);
      } catch {
        refresh(); // reconcile with the server if the update failed
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      refresh();
    }
  };

  const value = { notifications, unreadCount, markAsRead, markAllAsRead, refresh };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
