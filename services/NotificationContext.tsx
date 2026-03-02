import React, { createContext, useContext, useState, useCallback } from 'react';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 11);

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  timestamp: number;
}

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  removeNotification: (id: string) => void;
  notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 4000) => {
      const id = generateId();
      const notification: Notification = {
        id,
        message,
        type,
        duration,
        timestamp: Date.now(),
      };

      setNotifications(prev => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, removeNotification, notifications }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): Omit<NotificationContextType, 'notifications'> => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return {
    showNotification: context.showNotification,
    removeNotification: context.removeNotification,
  };
};

const NotificationContainer: React.FC = () => {
  const context = useContext(NotificationContext);
  if (!context) return null;

  const { notifications, removeNotification } = context;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-warning';
      case 'info':
      default:
        return 'fa-info-circle';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-40 max-w-sm space-y-2 pointer-events-none">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`${getColor(notification.type)} border rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-auto`}
        >
          <i className={`fa-solid ${getIcon(notification.type)} ${getIconColor(notification.type)} mt-0.5 flex-shrink-0`}></i>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">{notification.message}</p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 hover:opacity-70 transition-opacity mt-0.5"
            title="Close notification"
          >
            <i className="fa-solid fa-times text-sm"></i>
          </button>
        </div>
      ))}
    </div>
  );
};
