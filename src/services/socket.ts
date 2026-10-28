import { io, Socket } from 'socket.io-client';
import { Platform, Vibration, NativeModules } from 'react-native';
import { SOCKET_URL_ANDROID, SOCKET_URL_IOS } from './env';
import { useOrderStore } from '../store/orderStore';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import { dispatchCustomerNotification } from './notificationService';

const CONFIGURED_SOCKET_URL = Platform.select({
  android: SOCKET_URL_ANDROID || 'https://api.ficapp.in',
  ios: SOCKET_URL_IOS || 'https://api.ficapp.in',
  default: 'https://api.ficapp.in',
}) || 'https://api.ficapp.in';

const CANDIDATE_SOCKET_URLS = [
  CONFIGURED_SOCKET_URL,
  SOCKET_URL_ANDROID,
  SOCKET_URL_IOS,
  'https://api.ficapp.in',
  'http://10.0.2.2:8001',
  'http://localhost:8001',
  'http://10.0.2.2:5000',
  'http://localhost:5000',
].filter(Boolean);

class SocketServiceClient {
  private socket: any = null;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private isConnecting = false;
  private processedUpdates = new Map<string, number>();

  connect(userId?: string, role?: string, token?: string) {
    let effectiveUserId = userId;
    let effectiveRole = role || 'customer';
    let effectiveToken = token;

    if (!effectiveUserId || effectiveUserId === 'cust_default') {
      try {
        const authStore = require('../store/authStore').useAuthStore.getState();
        const curUser = authStore.currentUser;
        if (curUser && curUser.id && !curUser.isGuest) {
          effectiveUserId = curUser.id;
          effectiveRole = curUser.role || 'customer';
        }
      } catch {}
    }
    if (!effectiveUserId) {
      effectiveUserId = 'guest_customer';
    }
    if (!effectiveToken) {
      try {
        const { getAuthToken } = require('./api');
        effectiveToken = getAuthToken() || '';
      } catch {}
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    // Try candidates until connected
    const connectToUrl = (index: number) => {
      if (index >= CANDIDATE_SOCKET_URLS.length) {
        console.warn('[Socket Client]: All candidate socket URLs exhausted.');
        this.isConnecting = false;
        return;
      }

      const targetUrl = CANDIDATE_SOCKET_URLS[index];
      console.log(`[Socket Client]: Connecting to ${targetUrl}...`);

      const sock = io(targetUrl, {
        transports: ['websocket', 'polling'],
        auth: { token: effectiveToken, userId: effectiveUserId, role: effectiveRole },
        query: { token: effectiveToken, userId: effectiveUserId, role: effectiveRole },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 4000,
      });

      sock.on('connect', () => {
        console.log(`[Socket Client]: Connected successfully to ${targetUrl}. Socket ID: ${sock.id}`);
        this.socket = sock;
        this.isConnecting = false;
        sock.emit('register', { userId: effectiveUserId, role: effectiveRole, token: effectiveToken });

        // Bind existing custom listeners
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(callback => {
            sock.on(event, callback);
          });
        });

        // Setup real-time order status listener and cross-platform sync
        this.setupOrderStatusListener(sock);
      });

      sock.on('connect_error', (err: any) => {
        sock.disconnect();
        // Try next candidate
        connectToUrl(index + 1);
      });
    };

    connectToUrl(0);
  }

  private setupOrderStatusListener(sock: any) {
    // Prevent stacking listeners on reconnect
    sock.off('order_status_updated');
    sock.off('customer_order_status');
    sock.off('notification');
    sock.off('new_order_placed');
    sock.off('order_created');
    sock.off('addresses_updated');
    sock.off('customer_profile_updated');
    sock.off('cart_updated');
    sock.off('favorites_updated');

    const handleStatusUpdate = (data: any) => {
      console.log('[Socket Client]: Real-time Order Status Update received:', data);
      if (!data) return;

      const orderId = data.orderId || data.order_number || data.id;
      const newStatus = data.status || 'Accepted';

      // Deduplication: prevent processing duplicate notifications within 6 seconds
      const dedupeKey = `${orderId}_${newStatus}`;
      const lastProcessed = this.processedUpdates.get(dedupeKey) || 0;
      if (Date.now() - lastProcessed < 6000) {
        console.log(`[Socket Client]: Ignoring duplicate notification for ${dedupeKey}`);
        return;
      }
      this.processedUpdates.set(dedupeKey, Date.now());

      // Periodically clean up old deduplication cache entries
      if (this.processedUpdates.size > 50) {
        const cutoff = Date.now() - 30000;
        this.processedUpdates.forEach((timestamp, key) => {
          if (timestamp < cutoff) {
            this.processedUpdates.delete(key);
          }
        });
      }

      // Invalidate GET /orders cache immediately so fresh authoritative records are retrieved
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/orders');
      } catch {}

      const existingOrder = useOrderStore.getState().allOrders.find(
        (o) => o.id === orderId || o.order_number === orderId
      );
      const category = (data.category || data.order?.category || existingOrder?.category || 'Products') as string;
      const catLower = category.toLowerCase();
      const isTravel = catLower.includes('travel') || catLower.includes('bus');
      const isStay = catLower.includes('stay') || catLower.includes('hotel');
      const isService = catLower.includes('service');
      const isJob = catLower.includes('job');
      const isBooking = isTravel || isStay || isService || data.order_type === 'booking';

      let joyfulTitle = data.title;
      let joyfulMsg = data.message || data.body;
      let actionLabel = 'View Order';
      let actionType: 'order' | 'booking' | 'job' = 'order';
      let notifIcon = 'Package';

      if (isTravel) {
        actionLabel = 'View Booking';
        actionType = 'booking';
        notifIcon = 'Bus';
        if (!joyfulTitle) {
          if (newStatus === 'Allocated' || data.allocated_seat || data.seat) {
            joyfulTitle = 'Seat Allocated! 🚍';
          } else {
            joyfulTitle = `Bus Booking ${newStatus}! 🚍`;
          }
        }
        if (!joyfulMsg) {
          if (newStatus === 'Allocated' || data.allocated_seat || data.seat) {
            joyfulMsg = `Your bus seat has been allocated by the operator for booking #${orderId}. Tap to view your ticket.`;
          } else {
            joyfulMsg = `Your travel booking #${orderId} status is now ${newStatus}.`;
          }
        }
      } else if (isStay) {
        actionLabel = 'View Booking';
        actionType = 'booking';
        notifIcon = 'Hotel';
        if (!joyfulTitle) joyfulTitle = `Stay Booking ${newStatus}! 🏨`;
        if (!joyfulMsg) joyfulMsg = `Your stay reservation #${orderId} status is now ${newStatus}.`;
      } else if (isService) {
        actionLabel = 'View Booking';
        actionType = 'booking';
        notifIcon = 'Wrench';
        if (!joyfulTitle) joyfulTitle = `Service Booking ${newStatus}! 🛠️`;
        if (!joyfulMsg) joyfulMsg = `Your service booking #${orderId} status is now ${newStatus}.`;
      } else if (isJob) {
        actionLabel = 'View Job';
        actionType = 'job';
        notifIcon = 'Briefcase';
        if (!joyfulTitle) joyfulTitle = `Job Application ${newStatus}! 💼`;
        if (!joyfulMsg) joyfulMsg = `Your job application #${orderId} is now ${newStatus}.`;
      } else {
        actionLabel = 'View Order';
        actionType = 'order';
        notifIcon = 'Package';
        if (!joyfulTitle) joyfulTitle = `Order ${newStatus}! 🛍️`;
        if (!joyfulMsg) joyfulMsg = `Your order #${orderId} status is now ${newStatus}.`;
      }

      // 1. Update OrderStore state
      if (orderId) {
        useOrderStore.getState().updateOrderStatusLocally(orderId, newStatus, {
          order: data.order,
          title: joyfulTitle,
          message: joyfulMsg,
          description: data.description,
          tracking_update: {
            title: joyfulTitle,
            status: newStatus,
            message: data.description || joyfulMsg,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        });
        // Silent refresh orders from server
        useOrderStore.getState().loadAllOrders(true).catch(() => {});
      }

      // 2. Dispatch to Notification Center & Android System Notification with sound, vibration & deep-linking
      dispatchCustomerNotification({
        title: joyfulTitle,
        body: joyfulMsg,
        icon: notifIcon,
        category: 'order',
        actionLabel,
        actionType,
        orderType: actionType,
        orderId,
        bookingId: isBooking ? orderId : undefined,
        targetScreen: 'Orders',
        targetParams: {
          activeTab: isBooking ? 'my bookings' : isJob ? 'job applied' : 'my orders',
          category,
          orderId,
        },
      });

      // 3. Notify any subscribed local callbacks
      this.triggerLocalEvent('order_status_updated', data);
      this.triggerLocalEvent('customer_order_status', data);
    };

    // 4. Handle New Order / Booking Placed on another platform (e.g. Website)
    const handleNewOrder = (data: any) => {
      if (!data) return;
      try {
        const authStore = require('../store/authStore').useAuthStore.getState();
        const curUser = authStore.currentUser;
        const curId = String(curUser?.id || curUser?.customerId || '').toLowerCase().trim();
        const curEmail = String(curUser?.email || '').toLowerCase().trim();
        const curPhone = String(curUser?.phone || '').replace(/\D/g, '').slice(-10);

        const oCustId = String(data.customer_id || data.customerId || data.memberId || data.user_id || '').toLowerCase().trim();
        const oEmail = String(data.customer_email || data.candidateEmail || data.email || '').toLowerCase().trim();
        const oPhone = String(data.customer_phone || data.candidatePhone || data.phone || '').replace(/\D/g, '').slice(-10);

        const isForMe = Boolean(
          (curId && oCustId && (curId === oCustId || curId.includes(oCustId) || oCustId.includes(curId))) ||
          (curEmail && oEmail && curEmail === oEmail) ||
          (curPhone && oPhone && curPhone.length >= 7 && (curPhone.endsWith(oPhone) || oPhone.endsWith(curPhone)))
        );

        if (isForMe) {
          const { clearApiCache } = require('./api');
          clearApiCache('/orders');
          useOrderStore.getState().loadAllOrders(true).catch(() => {});

          dispatchCustomerNotification({
            title: `Order Placed! 🛍️`,
            body: `Your order #${data.order_number || data.id} was confirmed.`,
            icon: 'Package',
            category: 'order',
            actionLabel: 'View Order',
            actionType: 'order',
            orderType: 'order',
            orderId: data.id || data.order_number,
            targetScreen: 'Orders',
            targetParams: {
              activeTab: 'my orders',
              orderId: data.id || data.order_number,
            },
          });
        }
      } catch (e) {
        console.warn('[Socket Client] Error in handleNewOrder:', e);
      }
      this.triggerLocalEvent('new_order_placed', data);
      this.triggerLocalEvent('order_created', data);
    };

    // 5. Handle Addresses Updated on another platform
    const handleAddressesUpdated = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/auth/addresses');
        const authStore = require('../store/authStore').useAuthStore;
        authStore.getState().fetchProfile().catch(() => {});
      } catch {}
      this.triggerLocalEvent('addresses_updated', data);
    };

    // 6. Handle Profile Updated on another platform
    const handleProfileUpdated = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/auth/customer-profile');
        const authStore = require('../store/authStore').useAuthStore;
        authStore.getState().fetchProfile().catch(() => {});
      } catch {}
      this.triggerLocalEvent('customer_profile_updated', data);
    };

    // 7. Handle Cart Updated on another platform
    const handleCartUpdated = (data: any) => {
      try {
        if (data && Array.isArray(data.cart)) {
          const cartStore = require('../store/cartStore').useCartStore;
          cartStore.getState().syncFromServer(data.cart);
        }
      } catch {}
      this.triggerLocalEvent('cart_updated', data);
    };

    // 8. Handle Favorites / Wishlist Updated on another platform
    const handleFavoritesUpdated = (data: any) => {
      try {
        if (data && Array.isArray(data.favorites)) {
          const wishlistStore = require('../store/wishlistStore').useWishlistStore;
          wishlistStore.getState().syncFromServer(data.favorites);
        }
      } catch {}
      this.triggerLocalEvent('favorites_updated', data);
    };

    // 9. Handle Notifications Read on another platform
    const handleNotificationsRead = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/customer/customer-notifications');
        const notifStore = require('../store/notificationStore').useNotificationStore;
        if (data?.all) {
          notifStore.getState().markAllAsRead();
        } else if (data?.id) {
          notifStore.getState().markAsRead(data.id);
        } else {
          notifStore.getState().fetchNotifications().catch(() => {});
        }
      } catch (e) {
        console.warn('[Socket Client] Error in handleNotificationsRead:', e);
      }
      this.triggerLocalEvent('notifications_read', data);
    };

    // 10. Handle Notification Deleted on another platform
    const handleNotificationDeleted = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/customer/customer-notifications');
        const notifStore = require('../store/notificationStore').useNotificationStore;
        if (data?.id) {
          notifStore.setState((state: any) => ({
            notifications: state.notifications.filter((n: any) => n.id !== data.id),
            unreadCount: state.notifications.filter((n: any) => n.id !== data.id && n.unread).length,
          }));
        } else {
          notifStore.getState().fetchNotifications().catch(() => {});
        }
      } catch {}
      this.triggerLocalEvent('notification_deleted', data);
    };

    // 11. Handle Banners Updated by Admin
    const handleBannersUpdated = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/public/banners');
        clearApiCache('/banners');
        const bannerStore = require('../store/bannerStore').useBannerStore;
        bannerStore.getState().loadBanners(true).catch(() => {});
      } catch {}
      this.triggerLocalEvent('banners:updated', data);
    };

    // 12. Handle Offers Updated by Admin
    const handleOffersUpdated = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/admin/public/exclusive-offers');
        clearApiCache('/exclusive-offers');
      } catch {}
      this.triggerLocalEvent('offers:updated', data);
    };

    // 13. Handle Categories Updated by Admin
    const handleCategoriesUpdated = (data: any) => {
      try {
        const { clearApiCache } = require('./api');
        clearApiCache('/categories');
        clearApiCache('/admin/public/categories');
        const catService = require('./categoryService').categoryService;
        if (catService && typeof catService.clearCache === 'function') {
          catService.clearCache();
        }
      } catch {}
      this.triggerLocalEvent('categories:updated', data);
    };

    sock.on('order_status_updated', handleStatusUpdate);
    sock.on('customer_order_status', handleStatusUpdate);
    sock.on('new_order_placed', handleNewOrder);
    sock.on('order_created', handleNewOrder);
    sock.on('addresses_updated', handleAddressesUpdated);
    sock.on('customer_profile_updated', handleProfileUpdated);
    sock.on('cart_updated', handleCartUpdated);
    sock.on('favorites_updated', handleFavoritesUpdated);
    sock.on('notifications_read', handleNotificationsRead);
    sock.on('notification_deleted', handleNotificationDeleted);
    sock.on('banners:updated', handleBannersUpdated);
    sock.on('offers:updated', handleOffersUpdated);
    sock.on('categories:updated', handleCategoriesUpdated);
  }


  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      console.log('[Socket Client]: Disconnected from server.');
    }
  }

  joinOrder(orderId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_order', { orderId });
      console.log(`[Socket Client]: Joined order channel order:${orderId}`);
    }
  }

  leaveOrder(orderId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_order', { orderId });
      console.log(`[Socket Client]: Left order channel order:${orderId}`);
    }
  }

  sendLocation(
    partnerId: string,
    orderId: string,
    lat: number,
    lng: number,
    speed: number = 25,
    battery: number = 90,
    address: string = ''
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('driver_location', {
        partnerId,
        orderId,
        latitude: lat,
        longitude: lng,
        speed,
        battery,
        address,
        timestamp: new Date().toISOString(),
      });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket && this.socket.connected) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (data: any) => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
      if (this.listeners.get(event)!.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  triggerLocalEvent(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const socketService = new SocketServiceClient();
export default socketService;
