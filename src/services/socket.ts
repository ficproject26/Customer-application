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

  connect(userId: string = 'cust_default', role: string = 'customer') {
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
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 4000,
      });

      sock.on('connect', () => {
        console.log(`[Socket Client]: Connected successfully to ${targetUrl}. Socket ID: ${sock.id}`);
        this.socket = sock;
        this.isConnecting = false;
        sock.emit('register', { userId, role });

        // Bind existing custom listeners
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(callback => {
            sock.on(event, callback);
          });
        });

        // Setup real-time order status listener
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

      // 6. Notify any subscribed local callbacks
      this.triggerLocalEvent('order_status_updated', data);
      this.triggerLocalEvent('customer_order_status', data);
    };

    // Listen only to the single authoritative status update event
    sock.on('order_status_updated', handleStatusUpdate);
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
