import { PermissionsAndroid, Platform, NativeModules, Vibration, AppState, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import { API_URL_ANDROID, API_URL_IOS } from './env';

export const FCM_TOKEN_STORAGE_KEY = 'connect_fcm_device_token';
export const NOTIF_PERM_REQUESTED_KEY = 'connect_notif_perm_requested_v1';

let messagingModule: any = null;
try {
  messagingModule = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('Firebase Messaging module fallback');
}

let navigationRefHolder: any = null;

export function setNavigationRef(ref: any) {
  navigationRefHolder = ref;
}

const BACKEND_API_BASE = Platform.select({
  android: API_URL_ANDROID || 'https://api.ficapp.in/api',
  ios: API_URL_IOS || 'https://api.ficapp.in/api',
  default: 'https://api.ficapp.in/api',
}) || 'https://api.ficapp.in/api';

export interface CustomerNotificationPayload {
  title: string;
  body: string;
  category?: 'order' | 'offer' | 'system' | 'membership' | 'Travel' | 'Stay' | 'Services' | 'Products' | 'Jobs' | string;
  icon?: string;
  targetScreen?: string;
  targetParams?: any;
  actionLabel?: string;
  actionType?: 'order' | 'booking' | 'job' | 'offer' | 'membership' | 'view_order' | 'view_booking' | 'view_job' | string;
  orderType?: 'order' | 'booking' | 'job' | 'membership' | string;
  orderId?: string;
  bookingId?: string;
  dedupeKey?: string;
  channelId?: string;
}

const recentDispatchedNotifications = new Map<string, number>();

/**
 * Centralized Notification Dispatcher:
 * Dispatches synchronously to in-app notification center store & Android System Notification Bar
 */
export function dispatchCustomerNotification(payload: CustomerNotificationPayload) {
  const {
    title,
    body,
    category = 'order',
    icon = 'Bell',
    targetScreen = 'Orders',
    targetParams,
    actionLabel = 'View Details',
    actionType = 'order',
    orderType,
    orderId,
    bookingId,
    dedupeKey,
    channelId,
  } = payload;

  // Deduplication guard (prevents duplicate notification delivery within 5 seconds)
  const key = dedupeKey || `${title}_${body}_${orderId || ''}`;
  const now = Date.now();
  const lastTime = recentDispatchedNotifications.get(key) || 0;
  if (now - lastTime < 5000) {
    console.log('[NotificationService] Deduplicating notification for key:', key);
    return;
  }
  recentDispatchedNotifications.set(key, now);

  if (recentDispatchedNotifications.size > 50) {
    const cutoff = now - 30000;
    recentDispatchedNotifications.forEach((val, k) => {
      if (val < cutoff) recentDispatchedNotifications.delete(k);
    });
  }

  // 1. Dispatch In-App Notification Record (Zustand + AsyncStorage)
  try {
    useNotificationStore.getState().addNotification({
      title,
      body,
      icon,
      category,
      targetScreen,
      targetParams,
      actionLabel,
      actionType,
      orderType: orderType || (actionType as any),
      orderId,
      bookingId: bookingId || orderId,
    });
  } catch (err) {
    console.warn('[NotificationService] In-App notification error:', err);
  }

  // 2. Dispatch Android System Notification (Notification Bar / Shade)
  try {
    const { SystemNotification } = NativeModules;
    if (SystemNotification) {
      let resolvedChannel = channelId;
      if (!resolvedChannel) {
        const cat = String(category || '').toLowerCase();
        if (cat === 'offer' || cat === 'promotion' || cat === 'deal') {
          resolvedChannel = 'connect_offers_channel';
        } else if (cat === 'membership' || cat === 'account' || cat === 'wallet') {
          resolvedChannel = 'connect_account_channel';
        } else if (cat === 'system' || cat === 'announcement') {
          resolvedChannel = 'connect_default_channel';
        } else {
          resolvedChannel = 'connect_orders_realtime_channel';
        }
      }

      if (typeof SystemNotification.showSystemNotification === 'function') {
        SystemNotification.showSystemNotification(
          title,
          body,
          targetScreen,
          orderId || bookingId || '',
          resolvedChannel
        );
      } else if (typeof SystemNotification.showNotification === 'function') {
        SystemNotification.showNotification(title, body);
      }
    }
  } catch (err) {
    console.warn('[NotificationService] System notification error:', err);
  }

  // 3. Gentle tactile vibration feedback
  try {
    Vibration.vibrate([0, 150, 60, 150]);
  } catch {}
}

/**
 * Check if the app was launched by tapping an Android system notification
 */
export async function checkPendingSystemNotificationLaunch() {
  try {
    const { SystemNotification } = NativeModules;
    if (SystemNotification && typeof SystemNotification.getPendingNotificationData === 'function') {
      const pendingData = await SystemNotification.getPendingNotificationData();
      if (pendingData && pendingData.screen) {
        console.log('[NotificationService] Found pending system notification launch:', pendingData);
        handleNotificationNavigation(pendingData);
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Pending notification check warning:', err);
  }
}

/**
 * Request native Android & iOS push notification permissions with user-friendly flow
 */
export async function requestNotificationPermissions(isExplicitUserAction: boolean = false): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (alreadyGranted) {
          return true;
        }

        const hasAskedBefore = await AsyncStorage.getItem(NOTIF_PERM_REQUESTED_KEY);
        if (!isExplicitUserAction && hasAskedBefore) {
          // Do not repeatedly prompt user unless they explicitly asked in UI
          return false;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Push Notifications',
            message: 'Connect Mobile needs notification permission to send live tracking, order progress, and booking updates directly to your notification bar.',
            buttonPositive: 'Allow Notifications',
            buttonNegative: 'Not Now',
          }
        );

        await AsyncStorage.setItem(NOTIF_PERM_REQUESTED_KEY, 'true');

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          if (isExplicitUserAction) {
            Alert.alert(
              'Notifications Disabled',
              'Push notifications are currently turned off. To get live delivery alerts and booking updates, please enable notifications in App Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          return false;
        } else {
          return false;
        }
      }
    }

    if (messagingModule) {
      const authStatus = await messagingModule().requestPermission();
      const enabled =
        authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;

      console.log('FCM Permission Status:', authStatus, 'Enabled:', enabled);
      return enabled;
    }

    return true;
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Register FCM device token with local storage & backend with user mapping
 */
export async function registerFcmToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    if (!messagingModule) {
      return null;
    }

    const token: string = await messagingModule().getToken();
    if (token) {
      console.log('FCM Device Token retrieved:', token);
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      await sendTokenToBackend(token);
    }

    // Listen for token refresh events
    messagingModule().onTokenRefresh(async (newToken: string) => {
      console.log('FCM Token refreshed:', newToken);
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
      await sendTokenToBackend(newToken);
    });

    return token;
  } catch (error) {
    console.warn('Failed to retrieve FCM token:', error);
    return null;
  }
}

/**
 * Send token to backend via REST API with authenticated user mapping
 */
async function sendTokenToBackend(token: string) {
  try {
    let authHeader: Record<string, string> = { 'Content-Type': 'application/json' };
    let userId: string | undefined;

    try {
      const authStore = require('../store/authStore').useAuthStore.getState();
      const user = authStore.currentUser;
      const authToken = authStore.token;
      if (user) {
        userId = user.customerId || user.registrationId || user.id;
      }
      if (authToken) {
        authHeader['Authorization'] = `Bearer ${authToken}`;
      }
    } catch {}

    const response = await fetch(`${BACKEND_API_BASE}/notifications/register-token`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: `android_${userId || 'guest'}`,
        userId: userId || undefined,
        role: 'customer',
      }),
    });
    const resData = await response.json();
    console.log('Backend device token registration:', resData);
  } catch (err) {
    // Non-critical background failure logged safely
    console.warn('Failed to send FCM token to backend:', err);
  }
}

/**
 * Unregister FCM token on user logout
 */
export async function unregisterFcmToken(token?: string, userId?: string) {
  try {
    const fcmToken = token || (await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY));
    if (!fcmToken && !userId) return;

    await fetch(`${BACKEND_API_BASE}/notifications/unregister-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: fcmToken || undefined,
        userId: userId || undefined,
      }),
    });
    console.log('[NotificationService] Deactivated FCM token on backend successfully.');
  } catch (err) {
    console.warn('[NotificationService] Unregister token error:', err);
  }
}

/**
 * Navigate to target screen based on notification payload data
 */
export function handleNotificationNavigation(data: Record<string, string> | undefined) {
  if (!data || !data.screen) return;

  const screen = data.screen;
  console.log('Handling Notification Navigation to screen:', screen, data);

  setTimeout(() => {
    if (!navigationRefHolder || !navigationRefHolder.isReady()) {
      console.warn('Navigation ref not ready yet for notification deep link');
      return;
    }

    switch (screen) {
      case 'Orders':
      case 'DeliveryOrders':
        navigationRefHolder.navigate('CustomerTabs', {
          screen: 'Orders',
          params: {
            orderId: data.orderId || data.targetId,
            activeTab: data.activeTab || 'my orders',
          },
        });
        break;
      case 'Membership':
        navigationRefHolder.navigate('CustomerTabs', { screen: 'Membership' });
        break;
      case 'PaymentSettings':
        navigationRefHolder.navigate('PaymentSettings');
        break;
      case 'CategoryDetails':
        navigationRefHolder.navigate('CategoryDetails', {
          categoryName: data.categoryName || 'Daily Needs',
        });
        break;
      case 'ProductDetails':
        if (data.productId) {
          navigationRefHolder.navigate('ProductDetails', {
            item: { id: data.productId, name: data.title || 'Featured Item' },
          });
        }
        break;
      case 'Cart':
        navigationRefHolder.navigate('Cart');
        break;
      default:
        navigationRefHolder.navigate('CustomerTabs', { screen: 'Home' });
        break;
    }
  }, 300);
}

/**
 * Initialize FCM listeners for Foreground, Background, and Terminated states
 */
export function setupFcmListeners(navRef?: any) {
  if (navRef) setNavigationRef(navRef);

  // Initialize Android Notification Channels
  try {
    if (NativeModules.SystemNotification && typeof NativeModules.SystemNotification.initializeChannels === 'function') {
      NativeModules.SystemNotification.initializeChannels();
    }
  } catch {}

  // Check if launched by tapping native system notification
  checkPendingSystemNotificationLaunch();

  // Listen for app coming to foreground to check tapped notifications
  const appStateSub = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      checkPendingSystemNotificationLaunch();
    }
  });

  if (!messagingModule) return () => {
    appStateSub.remove();
  };

  // 1. Foreground Notifications (App Active & Open)
  const unsubscribeForeground = messagingModule().onMessage(async (remoteMessage: any) => {
    console.log('FCM Foreground Notification Received:', remoteMessage);

    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Connect Alert';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || 'New update received';

    // Store in-app notification & dispatch system notification
    dispatchCustomerNotification({
      title,
      body,
      icon: 'Bell',
      category: 'order',
      targetScreen: remoteMessage.data?.screen || 'Orders',
      orderId: remoteMessage.data?.orderId,
    });

    // Show toast banner
    useToastStore.getState().showToast(`${title}: ${body}`, 'View', () => {
      if (remoteMessage.data) handleNotificationNavigation(remoteMessage.data as any);
    });
  });

  // 2. Background State (App in background, user taps notification)
  messagingModule().onNotificationOpenedApp((remoteMessage: any) => {
    console.log('FCM Notification tapped from Background state:', remoteMessage);
    if (remoteMessage.data) {
      handleNotificationNavigation(remoteMessage.data as any);
    }
  });

  // 3. Terminated / Killed State (App fully closed, cold start tap)
  messagingModule()
    .getInitialNotification()
    .then((remoteMessage: any) => {
      if (remoteMessage) {
        console.log('FCM Notification tapped from Terminated/Killed cold start state:', remoteMessage);
        if (remoteMessage.data) {
          handleNotificationNavigation(remoteMessage.data as any);
        }
      }
    });

  return unsubscribeForeground;
}
