import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastStore } from '../store/toastStore';
import { useNotificationStore } from '../store/notificationStore';
import { API_URL_ANDROID, API_URL_IOS } from './env';

export const FCM_TOKEN_STORAGE_KEY = 'connect_fcm_device_token';

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

/**
 * Request native Android & iOS push notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Android POST_NOTIFICATIONS permission denied');
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
 * Register FCM device token with local storage & backend
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
 * Send token to MongoDB backend via REST API
 */
async function sendTokenToBackend(token: string) {
  try {
    const response = await fetch(`${BACKEND_API_BASE}/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: `android_${Date.now()}`,
      }),
    });
    const resData = await response.json();
    console.log('Backend device token registration:', resData);
  } catch (err) {
    console.warn('Failed to send FCM token to backend:', err);
  }
}

/**
 * Navigate to target screen based on FCM payload data
 */
export function handleNotificationNavigation(data: Record<string, string> | undefined) {
  if (!data || !data.screen) return;

  const screen = data.screen;
  console.log('Handling FCM Push Notification Navigation to screen:', screen, data);

  setTimeout(() => {
    if (!navigationRefHolder || !navigationRefHolder.isReady()) {
      console.warn('Navigation ref not ready yet for FCM deep link');
      return;
    }

    switch (screen) {
      case 'Orders':
      case 'DeliveryOrders':
        navigationRefHolder.navigate('CustomerTabs', { screen: 'Orders' });
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
  if (!messagingModule) return () => {};

  // 1. Foreground Notifications (App Active & Open)
  const unsubscribeForeground = messagingModule().onMessage(async (remoteMessage: any) => {
    console.log('FCM Foreground Notification Received:', remoteMessage);

    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Connect Alert';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || 'New update received';

    // Store in-app notification store
    useNotificationStore.getState().addNotification({
      title,
      body,
      icon: 'Bell',
      category: 'order',
      targetScreen: remoteMessage.data?.screen || 'Orders',
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
