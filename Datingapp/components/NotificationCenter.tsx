import React, { useState, useEffect } from 'react';
import { Notification, NotificationType } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onClearAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.MATCH:
        return { icon: 'fa-heart', color: 'text-red-500', bg: 'bg-red-50' };
      case NotificationType.MESSAGE:
        return { icon: 'fa-message', color: 'text-blue-500', bg: 'bg-blue-50' };
      case NotificationType.SUPER_LIKE:
        return { icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-50' };
      case NotificationType.PROFILE_VIEW:
        return { icon: 'fa-eye', color: 'text-purple-500', bg: 'bg-purple-50' };
      case NotificationType.REPORT:
        return { icon: 'fa-flag', color: 'text-amber-500', bg: 'bg-amber-50' };
      default:
        return { icon: 'fa-bell', color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md h-[600px] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-bell text-yellow-500"></i>
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveFilter('all')}
            className={`pb-3 font-bold text-sm transition-colors ${
              activeFilter === 'all'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`pb-3 font-bold text-sm transition-colors ${
              activeFilter === 'unread'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-3"></i>
              <p className="text-gray-400 font-bold">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const { icon, color, bg } = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      onNotificationClick(notification);
                      if (!notification.read) {
                        onMarkAsRead(notification.id);
                      }
                    }}
                    className={`p-4 cursor-pointer transition hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`${bg} rounded-full p-3 flex-shrink-0`}>
                        <i className={`fa-solid ${icon} ${color} text-lg`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {timeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onClearAll}
              className="w-full py-2 text-gray-600 font-bold hover:text-gray-900 text-sm transition"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
