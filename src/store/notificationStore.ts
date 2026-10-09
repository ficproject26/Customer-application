import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  message?: string;
  time: string;
  icon?: string;
  category?: 'order' | 'offer' | 'system' | 'membership' | 'Travel' | 'Stay' | 'Services' | 'Products' | 'Jobs' | string;
  unread: boolean;
  targetScreen?: string;
  targetParams?: any;
  actionLabel?: string; // 'View Order' | 'View Booking' | 'View Job' | 'View Offer'
  actionType?: 'order' | 'booking' | 'job' | 'offer' | 'system' | 'view_order' | 'view_booking' | 'view_job' | string;
  orderType?: 'order' | 'booking' | 'job' | string;
  orderId?: string;
  bookingId?: string;
  [key: string]: any;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'time' | 'unread' | 'body'> & { body?: string }) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      markAsRead: (id) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, unread: false } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => n.unread).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, unread: false })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      addNotification: (item) => {
        const newItem: NotificationItem = {
          ...item,
          title: item.title || 'Notification',
          body: item.body || item.message || '',
          icon: item.icon || 'Bell',
          id: `notif_${Date.now()}`,
          time: 'Just now',
          unread: true,
        };
        set((state) => ({
          notifications: [newItem, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },
    }),
    {
      name: 'connect_app_notifications_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
