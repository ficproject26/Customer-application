import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const isLight = !isDark;

  const THEME_OPTIONS: Array<{
    id: 'light' | 'dark' | 'system';
    title: string;
    subtitle: string;
    icon: any;
    accentColor: string;
  }> = [
    {
      id: 'light',
      title: 'Light Theme',
      subtitle: 'Crisp warm ivory & high-contrast daylight visibility',
      icon: Icons.Sun,
      accentColor: '#F5B800',
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      subtitle: 'Deep midnight blue optimized for low light and OLED battery saving',
      icon: Icons.Moon,
      accentColor: '#38BDF8',
    },
    {
      id: 'system',
      title: 'System Default',
      subtitle: 'Automatically sync with your device OS appearance settings',
      icon: Icons.Monitor,
      accentColor: '#A855F7',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>

        <View style={styles.titleGroup}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>App Theme & Display</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Customize your visual styling & appearance
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Mode Selection */}
        <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
          APPEARANCE MODE
        </Text>

        <View style={styles.themeList}>
          {THEME_OPTIONS.map((opt) => {
            const isSelected = themeMode === opt.id;
            const IconComp = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                    borderColor: isSelected ? '#F5B800' : (isLight ? '#F1EAD8' : colors.cardBorder),
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setThemeMode(opt.id)}
              >
                <View
                  style={[
                    styles.themeIconCircle,
                    {
                      backgroundColor: isSelected
                        ? '#FEF3C7'
                        : (isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)'),
                    },
                  ]}
                >
                  <IconComp color={isSelected ? '#D97706' : colors.text} size={20} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.themeTitleRow}>
                    <Text style={[styles.themeTitle, { color: colors.text }]}>
                      {opt.title}
                    </Text>
                    {isSelected && (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeSubtitle, { color: colors.subtext }]}>
                    {opt.subtitle}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? '#F5B800' : colors.cardBorder,
                    },
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live Preview Card */}
        <Text style={[styles.sectionHeading, { color: colors.subtext, marginTop: 12 }]}>
          LIVE INTERFACE PREVIEW
        </Text>

        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : '#0B132B',
              borderColor: isLight ? '#E2E8F0' : '#1E293B',
            },
          ]}
        >
          {/* Preview Header */}
          <View style={styles.previewHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.previewAvatar, { backgroundColor: '#F5B800' }]}>
                <Icons.User color="#050B1E" size={14} />
              </View>
              <View>
                <Text style={[styles.previewUserTitle, { color: colors.text }]}>Preview Card</Text>
                <Text style={[styles.previewUserSubtitle, { color: colors.subtext }]}>Instant response UI</Text>
              </View>
            </View>
            <View style={[styles.previewPill, { backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.15)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>DIAMOND</Text>
            </View>
          </View>

          {/* Preview Action Buttons */}
          <View style={styles.previewBtnRow}>
            <View
              style={[
                styles.previewButton,
                { backgroundColor: '#F5B800' },
              ]}
            >
              <Icons.ShoppingBag color="#050B1E" size={12} />
              <Text style={styles.previewButtonText}>Primary Action</Text>
            </View>
            <View
              style={[
                styles.previewSecondaryButton,
                {
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                  borderColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)',
                },
              ]}
            >
              <Text style={[styles.previewSecondaryText, { color: colors.text }]}>Secondary</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  themeList: {
    gap: 12,
    marginBottom: 16,
  },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
  },
  themeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  themeSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  activeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5B800',
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewUserTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewUserSubtitle: {
    fontSize: 11,
  },
  previewPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#050B1E',
  },
  previewSecondaryButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
