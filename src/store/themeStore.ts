import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryText: string;
  background: string;
  secondary: string;
  grayDark: string;
  grayLight: string;
  cardBg: string;
  cardBgSecondary: string;
  cardBorder: string;
  cardBackground: string;
  text: string;
  subtext: string;
  muted: string;
  textSecondary: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  headerBackground: string;
  headerText: string;
  tabBarBg: string;
  tabBarBorder: string;
  drawerBg: string;
  modalBg: string;
  statusBarStyle: 'light-content' | 'dark-content';
  icon: string;
  divider: string;
  border: string;
  cardTitle: string;
  cardSubtext: string;
  placeholderText: string;
  disabledText: string;
  errorText: string;
  successText: string;
  warningText: string;
  promoBg: string;
  promoBorder: string;
  promoTitle: string;
  promoSub: string;
  badgeBg: string;
  badgeText: string;
}

const darkColors: ThemeColors = {
  primary: '#F4C400',
  primaryText: '#050B1E',
  background: '#050B1E',
  secondary: '#FFFFFF',
  grayDark: '#0D1636',
  grayLight: '#CBD5E1',
  cardBg: '#0D1636',
  cardBgSecondary: '#131F48',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  cardBackground: '#0D1636',
  text: '#F8FAFC',
  subtext: '#CBD5E1',
  muted: '#94A3B8',
  textSecondary: '#CBD5E1',
  inputBg: '#0F172A',
  inputBorder: 'rgba(255, 255, 255, 0.2)',
  headerBg: '#050B1E',
  headerBackground: '#050B1E',
  headerText: '#FFFFFF',
  tabBarBg: '#050B1E',
  tabBarBorder: 'rgba(255, 255, 255, 0.12)',
  drawerBg: '#050B1E',
  modalBg: '#0D1636',
  statusBarStyle: 'light-content',
  icon: '#F8FAFC',
  divider: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.15)',
  cardTitle: '#F8FAFC',
  cardSubtext: '#CBD5E1',
  placeholderText: '#94A3B8',
  disabledText: '#64748B',
  errorText: '#F87171',
  successText: '#34D399',
  warningText: '#FBBF24',
  promoBg: 'rgba(244, 196, 0, 0.12)',
  promoBorder: 'rgba(244, 196, 0, 0.35)',
  promoTitle: '#FFFFFF',
  promoSub: '#CBD5E1',
  badgeBg: 'rgba(244, 196, 0, 0.18)',
  badgeText: '#F4C400',
};

const lightColors: ThemeColors = {
  primary: '#F5B800',
  primaryText: '#101827',
  background: '#FFF8E8',
  secondary: '#101827',
  grayDark: '#FFF1C7',
  grayLight: '#64748B',
  cardBg: '#FFFFFF',
  cardBgSecondary: '#F8FAFC',
  cardBorder: '#F1EAD8',
  cardBackground: '#FFFFFF',
  text: '#101827',
  subtext: '#475569',
  muted: '#94A3B8',
  textSecondary: '#64748B',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  headerBg: '#FFF3D6',
  headerBackground: '#FFF3D6',
  headerText: '#101827',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  drawerBg: '#FFF8E8',
  modalBg: '#FFFFFF',
  statusBarStyle: 'dark-content',
  icon: '#101827',
  divider: '#E2E8F0',
  border: '#E2E8F0',
  cardTitle: '#101827',
  cardSubtext: '#64748B',
  placeholderText: '#94A3B8',
  disabledText: '#94A3B8',
  errorText: '#EF4444',
  successText: '#10B981',
  warningText: '#D97706',
  promoBg: '#FFF1C7',
  promoBorder: '#FDE68A',
  promoTitle: '#101827',
  promoSub: '#475569',
  badgeBg: '#FEF3C7',
  badgeText: '#D97706',
};

const getIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
};

const getThemeColors = (mode: ThemeMode): ThemeColors => {
  return getIsDark(mode) ? darkColors : lightColors;
};

interface ThemeState {
  themeMode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'light', // default to light theme, user can switch to dark anytime
      colors: lightColors,
      isDark: false,
      setThemeMode: (mode: ThemeMode) => {
        const isDark = getIsDark(mode);
        set({
          themeMode: mode,
          isDark: isDark,
          colors: getThemeColors(mode),
        });
      },
    }),
    {
      name: 'connect_app_theme_preference',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const mode = state.themeMode || 'light';
          const isDark = getIsDark(mode);
          state.isDark = isDark;
          state.colors = getThemeColors(mode);
        }
      },
    }
  )
);

// Set up appearance listener for system theme changes
Appearance.addChangeListener(() => {
  const currentMode = useThemeStore.getState().themeMode;
  if (currentMode === 'system') {
    const isDark = Appearance.getColorScheme() === 'dark';
    useThemeStore.setState({
      isDark,
      colors: getThemeColors('system'),
    });
  }
});
