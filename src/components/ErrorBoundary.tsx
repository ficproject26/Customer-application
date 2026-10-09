import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import * as Icons from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  screenName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  private autoRecoveryTimer: any = null;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(`[ErrorBoundary caught error in ${this.props.screenName || 'Component'}]:`, error, errorInfo);
    this.setState({ errorInfo });

    // Schedule auto-recovery attempt after 3 seconds for transient render glitches
    if (this.autoRecoveryTimer) clearTimeout(this.autoRecoveryTimer);
    this.autoRecoveryTimer = setTimeout(() => {
      if (this.state.hasError) {
        console.log(`[ErrorBoundary] Auto-attempting recovery for ${this.props.screenName || 'Component'}...`);
        this.handleReset();
      }
    }, 4000);
  }

  componentWillUnmount() {
    if (this.autoRecoveryTimer) clearTimeout(this.autoRecoveryTimer);
  }

  public handleReset = () => {
    if (this.autoRecoveryTimer) clearTimeout(this.autoRecoveryTimer);
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn('onReset callback error:', e);
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#050B1E" />
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Icons.AlertTriangle color="#F5B800" size={26} />
            </View>
            <Text style={styles.title}>Section Temporarily Unavailable</Text>
            <Text style={styles.subtitle}>
              We encountered a minor display issue in {this.props.screenName || 'this view'}. Your data and cart settings remain completely safe.
            </Text>

            {this.state.error && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText} numberOfLines={4}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={this.handleReset}
            >
              <Icons.RefreshCw color="#0F172A" size={15} />
              <Text style={styles.primaryBtnText}>Retry & Restore View</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component to wrap individual screens or widgets with isolated Error Boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary screenName={screenName || WrappedComponent.displayName || WrappedComponent.name}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0B132B',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 184, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  debugBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    width: '100%',
  },
  debugText: {
    color: '#EF4444',
    fontSize: 10.5,
    fontFamily: 'monospace',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 11,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
