import { AppRegistry, InteractionManager, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreAllLogs(true);

// Top-level FCM Background Message Handler (executes when app is in background or closed)
try {
  const messaging = require('@react-native-firebase/messaging').default;
  const { NativeModules } = require('react-native');
  if (messaging) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('FCM Message Handled in Background/Closed State:', remoteMessage);
      if (remoteMessage) {
        const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Connect Alert';
        const body = remoteMessage.notification?.body || remoteMessage.data?.body || remoteMessage.data?.message || 'New update received';
        const screen = remoteMessage.data?.screen || remoteMessage.data?.targetScreen || (remoteMessage.data?.category === 'offer' ? 'Home' : 'Orders');
        const targetId = remoteMessage.data?.orderId || remoteMessage.data?.targetId || remoteMessage.data?.bookingId || '';
        const rawCategory = (remoteMessage.data?.category || '').toLowerCase();
        
        let resolvedChannel = 'connect_orders_realtime_channel';
        if (rawCategory === 'offer' || rawCategory === 'promotion') {
          resolvedChannel = 'connect_offers_channel';
        } else if (rawCategory === 'membership' || rawCategory === 'account') {
          resolvedChannel = 'connect_account_channel';
        }

        if (NativeModules.SystemNotification && typeof NativeModules.SystemNotification.showSystemNotification === 'function') {
          NativeModules.SystemNotification.showSystemNotification(
            title,
            body,
            screen,
            targetId,
            resolvedChannel
          );
        }
      }
    });
  }
} catch (e) {
  console.warn('[index.js] FCM Messaging background handler fallback:', e?.message || e);
}

// Polyfill/Override InteractionManager.runAfterInteractions to use requestIdleCallback
// in order to avoid deprecation warnings and handle the future removal of InteractionManager.
InteractionManager.runAfterInteractions = (task) => {
  let handle;
  let cancelled = false;

  const runTask = () => {
    if (cancelled) return;
    if (typeof task === 'function') {
      task();
    } else if (task && typeof task.gen === 'function') {
      task.gen();
    }
  };

  if (typeof requestIdleCallback !== 'undefined') {
    handle = requestIdleCallback(runTask);
    return {
      then: (onFulfilled) => Promise.resolve().then(onFulfilled),
      cancel: () => {
        cancelled = true;
        if (typeof cancelIdleCallback !== 'undefined') {
          cancelIdleCallback(handle);
        }
      }
    };
  } else {
    handle = setTimeout(runTask, 0);
    return {
      then: (onFulfilled) => Promise.resolve().then(onFulfilled),
      cancel: () => {
        cancelled = true;
        clearTimeout(handle);
      }
    };
  }
};

AppRegistry.registerComponent(appName, () => App);
