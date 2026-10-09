import { AppRegistry, InteractionManager, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreAllLogs(true);

// Top-level FCM Background Message Handler (executes when app is in background or closed)
try {
  const messaging = require('@react-native-firebase/messaging').default;
  if (messaging) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('FCM Message Handled in Background/Closed State:', remoteMessage);
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
