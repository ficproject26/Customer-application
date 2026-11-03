import React from 'react';
import { StatusBar, StyleSheet, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Snackbar from './src/components/Snackbar';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useThemeStore } from './src/store/themeStore';
import { useAuthStore } from './src/store/authStore';
import { registerFcmToken, setupFcmListeners, setNavigationRef, startKeepAliveService, syncCustomerSession } from './src/services/notificationService';
import socketService from './src/services/socket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const navigationRef = useNavigationContainerRef();

  React.useEffect(() => {
    // Global Exception Guard to prevent background async errors from crashing the app
    const globalAny: any = globalThis as any;
    if (globalAny.ErrorUtils) {
      const defaultHandler = globalAny.ErrorUtils.getGlobalHandler();
      globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        console.warn('[Global Guard Handled Error]:', error?.message || error);
        if (__DEV__ && defaultHandler) {
          defaultHandler(error, false);
        }
      });
    }

    // Defer non-critical background services slightly to give the main thread 0ms contention on first paint
    const bgTimer = setTimeout(() => {
      // Initialize Real-time Socket Connection
      socketService.connect();

      // Start native background keep-alive service to guarantee background order alerts
      startKeepAliveService();
      try {
        const curUser = useAuthStore.getState().currentUser;
        const curToken = useAuthStore.getState().token;
        if (curUser) {
          syncCustomerSession(curUser, curToken);
        }
      } catch (e) {}

      // Initialize FCM Push Notifications and Listeners
      setNavigationRef(navigationRef);
      (async () => {
        try {
          await registerFcmToken();
          setupFcmListeners(navigationRef);
        } catch (e) {
          console.warn('[App] FCM init warning:', e);
        }
      })();
    }, 400);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        startKeepAliveService();
        try {
          const curUser = useAuthStore.getState().currentUser;
          const curToken = useAuthStore.getState().token;
          if (curUser) {
            syncCustomerSession(curUser, curToken);
          }
        } catch (e) {}
      }
    });

    return () => {
      clearTimeout(bgTimer);
      appStateSub.remove();
    };
  }, [navigationRef]);

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.headerBackground,
      text: colors.text,
      border: colors.cardBorder,
      notification: colors.primary,
    },
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <StatusBar
                barStyle={colors.statusBarStyle}
                backgroundColor={colors.headerBackground}
                translucent={false}
              />
              <AppNavigator />
              <Snackbar />
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

