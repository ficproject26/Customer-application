import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';

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
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'time' | 'unread' | 'body'> & { body?: string }) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      fetchNotifications: async () => {
        try {
          const res: any = await apiFetch('/customer/customer-notifications', { skipCache: true });
          if (res && res.status === 'success' && Array.isArray(res.notifications)) {
            const mapped: NotificationItem[] = res.notifications.map((n: any) => ({
              id: String(n.id || n._id),
              title: n.title || 'Notification',
              body: n.message || n.text || n.body || '',
              message: n.message || n.text || n.body || '',
              time: n.time || 'Recently',
              icon: n.icon || (n.type === 'order' ? 'Package' : 'Bell'),
              category: n.type || 'order',
              unread: !n.read,
              orderId: n.orderId || (n.id && String(n.id).startsWith('ord-notif-') ? String(n.id).replace('ord-notif-', '') : undefined),
              targetScreen: n.type === 'order' ? 'Orders' : undefined,
              actionLabel: n.type === 'order' ? 'View Order' : undefined,
              actionType: n.type === 'order' ? 'order' : undefined,
            }));

            // Merge with local un-synced notifications if any
            const serverIds = new Set(mapped.map((m) => m.id));
            const localOnly = get().notifications.filter((loc) => !serverIds.has(loc.id) && loc.id.startsWith('notif_'));

            const merged = [...mapped, ...localOnly];
            set({
              notifications: merged,
              unreadCount: typeof res.unreadCount === 'number' ? res.unreadCount : merged.filter((i) => i.unread).length,
            });
          }
        } catch (err) {
          console.warn('[NotificationStore] Failed fetching server notifications:', err);
        }
      },

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

        // Persist read status to backend MongoDB
        apiFetch('/customer/customer-notifications/read', {
          method: 'PUT',
          body: { id, notificationId: id },
        }).catch((err) => {
          console.warn('[NotificationStore] Failed syncing markAsRead to server:', err);
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, unread: false })),
          unreadCount: 0,
        }));

        // Persist bulk mark read to backend MongoDB
        apiFetch('/customer/customer-notifications/read', {
          method: 'PUT',
        }).catch((err) => {
          console.warn('[NotificationStore] Failed syncing markAllAsRead to server:', err);
        });
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
