import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  PermissionsAndroid,
  Linking,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import * as Icons from 'lucide-react-native';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useActivityStore } from '../../store/activityStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation, LANGUAGES_LIST } from '../../store/languageStore';

const getMembershipBadgeConfig = (membershipStr?: string, isDark: boolean = false) => {
  const tier = (membershipStr || 'gold').toLowerCase().trim();
  if (tier === 'diamond') {
    return {
      label: 'DIAMOND MEMBER',
      bg: isDark ? 'rgba(126, 34, 206, 0.3)' : '#F3E8FF',
      border: isDark ? '#C084FC' : '#A855F7',
      text: isDark ? '#E9D5FF' : '#7E22CE',
      iconColor: isDark ? '#C084FC' : '#A855F7',
      IconComp: Icons.Sparkles,
    };
  }
  return {
    label: 'GOLD MEMBER',
    bg: isDark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7',
    border: isDark ? '#F59E0B' : '#D97706',
    text: isDark ? '#FDE68A' : '#B45309',
    iconColor: '#F59E0B',
    IconComp: Icons.Crown,
  };
};

export default function CustomerProfile() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const isLight = !isDark;
  const { t, currentLanguage, setLanguage } = useTranslation();

  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const recentViews = useActivityStore((state) => state.recentViews);

  // Loading, error, photo action sheet & language modal states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const loadProfileData = useCallback(() => {
    setProfileError(null);
    setAvatarError(false);
    // Non-blocking background refresh
    fetchProfile().catch((e: any) => {
      if (!useAuthStore.getState().currentUser) {
        setProfileError(e?.message || 'Unable to load your profile details.');
      }
    });
  }, [fetchProfile]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Permissions helpers
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Connect Mobile needs camera access to capture your profile photo.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Library Permission',
            message: 'Connect Mobile needs access to your gallery to choose a profile photo.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Photo Library Permission',
            message: 'Connect Mobile needs storage access to choose a profile photo.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  // Camera Handler
  const handleTakePhoto = async () => {
    setIsPhotoModalOpen(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera permission in app settings to take a profile photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 600,
        maxHeight: 600,
        cameraType: 'front',
        saveToPhotos: false,
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel || !response.assets || response.assets.length === 0) return;
        const newUri = response.assets[0].uri;
        if (newUri) {
          setIsUploadingPhoto(true);
          setAvatarError(false);
          try {
            await updateProfile({ avatar: newUri });
          } catch (err) {
            console.warn('Failed to update avatar photo:', err);
          } finally {
            setIsUploadingPhoto(false);
          }
        }
      }
    );
  };

  // Gallery Handler
  const handleChooseFromGallery = async () => {
    setIsPhotoModalOpen(false);
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert(
        'Gallery Permission Required',
        'Please allow photo access in app settings to select a profile photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 600,
        maxHeight: 600,
        selectionLimit: 1,
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel || !response.assets || response.assets.length === 0) return;
        const newUri = response.assets[0].uri;
        if (newUri) {
          setIsUploadingPhoto(true);
          setAvatarError(false);
          try {
            await updateProfile({ avatar: newUri });
          } catch (err) {
            console.warn('Failed to update avatar photo from gallery:', err);
          } finally {
            setIsUploadingPhoto(false);
          }
        }
      }
    );
  };

  // Remove Photo Handler
  const handleRemovePhoto = async () => {
    setIsPhotoModalOpen(false);
    setIsUploadingPhoto(true);
    setAvatarError(false);
    try {
      await updateProfile({ avatar: '' });
    } catch (err) {
      console.warn('Failed to remove avatar photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Connect account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const isAuthenticated = isUserAuthenticated(currentUser);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={isLight ? '#FFF1C7' : colors.background} translucent={false} />
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: isLight ? '#FFF1C7' : colors.background, borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 16 }]}>{t('Profile')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Prominent Log In / Sign Up Banner */}
          <View style={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', borderColor: colors.cardBorder, borderWidth: 1, marginBottom: 24, elevation: 3 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <Icons.User color="#F4C400" size={38} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6, textAlign: 'center' }}>Welcome to Connect!</Text>
            <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center', marginBottom: 20, lineHeight: 19 }}>
              Sign in or create an account to view your orders, save delivery addresses, earn membership rewards, and manage payment methods.
            </Text>

            <TouchableOpacity
              style={{ backgroundColor: '#F4C400', width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginBottom: 10 }}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Icons.LogIn size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>Log In / Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', borderWidth: 1.5, width: '100%', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
              onPress={() => navigation.navigate('JoinNow')}
              activeOpacity={0.85}
            >
              <Icons.UserPlus size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          {/* Account Features Prompts (Locked for Guest) */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Account Features</Text>
          <View style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            {[
              { label: 'My Orders & Bookings', icon: Icons.Package, actionText: 'view your order history and live tracking' },
              { label: 'Wishlist & Favorites', icon: Icons.Heart, actionText: 'save your favorite products and services' },
              { label: 'Saved Delivery Addresses', icon: Icons.MapPin, actionText: 'manage delivery addresses' },
              { label: 'Connect Wallet & Balance', icon: Icons.Wallet, actionText: 'access your wallet and balance' },
              { label: 'Saved Payment Methods', icon: Icons.CreditCard, actionText: 'manage payment options' },
            ].map((item, idx, arr) => {
              const ItemIcon = item.icon;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder }}
                  onPress={() => useAuthGuardStore.getState().showAuthModal(item.actionText)}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <ItemIcon color={colors.subtext} size={18} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{item.label}</Text>
                  <Icons.Lock color={colors.subtext} size={16} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Basic Guest Settings */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Preferences & Support</Text>
          <View style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
              onPress={() => setIsLangModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Icons.Globe color="#F4C400" size={18} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>Language / ಭಾಷೆ</Text>
              <Text style={{ fontSize: 13, color: colors.subtext, marginRight: 8, fontWeight: '500' }}>
                {LANGUAGES_LIST.find((l) => l.code === currentLanguage)?.name || 'English'}
              </Text>
              <Icons.ChevronRight color={colors.subtext} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
              onPress={() => navigation.navigate('ThemeSettings')}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Icons.Moon color="#F4C400" size={18} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>App Theme</Text>
              <Text style={{ fontSize: 13, color: colors.subtext, marginRight: 8, fontWeight: '500' }}>
                {themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}
              </Text>
              <Icons.ChevronRight color={colors.subtext} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Icons.HelpCircle color="#F4C400" size={18} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>Help & Customer Support</Text>
              <Icons.ChevronRight color={colors.subtext} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              onPress={() => navigation.navigate('PrivacySecurity')}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Icons.ShieldCheck color="#F4C400" size={18} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>Privacy & Terms</Text>
              <Icons.ChevronRight color={colors.subtext} size={16} />
            </TouchableOpacity>
          </View>

          {/* App Version Info Footer */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: colors.subtext, marginTop: 10 }}>
            Connect Mobile v2.4.0
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />
      {/* Top App Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CustomerTabs', { screen: 'Home' });
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {profileLoading && !currentUser ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#F5B800" size="large" />
          <Text style={[styles.loadingText, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
            Loading profile...
          </Text>
        </View>
      ) : profileError && !currentUser ? (
        <View style={styles.centerContainer}>
          <Icons.AlertTriangle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load profile</Text>
          <Text style={styles.errorSubtitle}>{profileError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfileData}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Production Redesigned Top Profile Card */}
          <TouchableOpacity
            style={[
              styles.profileCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {/* Left: Large Circular Avatar with Camera Action Button */}
            <TouchableOpacity
              style={styles.avatarWrapper}
              activeOpacity={0.85}
              onPress={() => setIsPhotoModalOpen(true)}
            >
              {currentUser?.avatar && !avatarError ? (
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={[styles.avatarCircleFallback, { backgroundColor: isLight ? '#0F172A' : '#1E293B' }]}>
                  <Text style={styles.avatarInitial}>
                    {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}

              {isUploadingPhoto ? (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#F5B800" />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraActionButton}
                  activeOpacity={0.8}
                  onPress={() => setIsPhotoModalOpen(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icons.Camera color="#0F172A" size={13} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Center: Profile Name, Tier, Email & Phone */}
            <View style={styles.profileDetailsCol}>
              <View style={styles.nameAndBadgeRow}>
                <Text style={[styles.profileNameText, { color: colors.text }]} numberOfLines={1}>
                  {currentUser?.name || 'Connect Member'}
                </Text>
                {currentUser?.membership ? (() => {
                  const badge = getMembershipBadgeConfig(currentUser.membership, isDark);
                  const BadgeIcon = badge.IconComp;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('CustomerTabs', { screen: 'Membership' })}
                      style={[
                        styles.goldMembershipBadge,
                        {
                          backgroundColor: badge.bg,
                          borderColor: badge.border,
                        },
                      ]}
                    >
                      <BadgeIcon color={badge.iconColor} size={10} />
                      <Text style={[styles.goldMembershipText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })() : null}
              </View>

              <Text style={[styles.profileEmailText, { color: colors.subtext }]} numberOfLines={1}>
                {currentUser?.email || ''}
              </Text>

              {currentUser?.phone ? (
                <Text style={[styles.profilePhoneText, { color: colors.subtext }]}>
                  {currentUser.phone}
                </Text>
              ) : null}
            </View>

            {/* Right: Edit Button */}
            <TouchableOpacity
              style={[
                styles.editButtonPill,
                {
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Icons.Pencil color={isLight ? '#0F172A' : '#FFFFFF'} size={13} />
              <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* 1. ACCOUNT SECTION */}
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            ACCOUNT
          </Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            {/* My Orders */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CustomerTabs', { screen: 'Orders' })}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.ShoppingBag color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>My Orders</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Wishlist with live count */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Wishlist')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FDF2F8' }]}>
                <Icons.Heart color="#DB2777" size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Wishlist</Text>
              <View style={styles.menuBadgeRow}>
                {wishlistItems.length > 0 && (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>
                      {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                )}
                <Icons.ChevronRight color="#94A3B8" size={16} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Personal Information */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.User color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Personal Information</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Saved Addresses */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MyAddresses')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.MapPin color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Saved Addresses</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Connect Wallet */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Wallet')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Icons.Wallet color="#D97706" size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Connect Wallet & Balance</Text>
              <View style={styles.menuBadgeRow}>
                <View style={[styles.countPill, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.countPillText, { color: '#D97706', fontWeight: 'bold' }]}>
                    ₹{(currentUser?.walletBalance ?? 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Icons.ChevronRight color="#94A3B8" size={16} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Payment Methods */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PaymentSettings')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.CreditCard color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Payment Methods</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* My Bookings */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('CustomerTabs', {
                  screen: 'Orders',
                  params: { activeTab: 'bookings' },
                })
              }
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Calendar color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>My Bookings</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>
          </View>

          {/* 2. MY ACTIVITY SECTION */}
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            MY ACTIVITY
          </Text>
          <View
            style={[
              styles.activityCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            <View style={styles.activityHeader}>
              <View style={styles.activityHeaderTitleRow}>
                <View style={[styles.activityIconCircle, { backgroundColor: isLight ? '#FEF9E7' : 'rgba(245, 184, 0, 0.12)' }]}>
                  <Icons.Eye color="#F5B800" size={15} />
                </View>
                <Text style={[styles.activityCardTitle, { color: colors.text }]}>Recently Viewed</Text>
              </View>
              {recentViews && recentViews.length > 0 ? (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RecentlyViewed')}
                >
                  <Text style={[styles.viewAllText, { color: '#F5B800' }]}>View All</Text>
                  <Icons.ChevronRight color="#F5B800" size={14} />
                </TouchableOpacity>
              ) : null}
            </View>

            {recentViews && recentViews.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentViewsScroll}
              >
                {recentViews.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.recentViewCard,
                      {
                        backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        item: {
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          category: item.category || 'Products',
                          img: item.image,
                          image: item.image,
                          vendor: item.vendor,
                        },
                        category: item.category || 'Products',
                      })
                    }
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.recentViewImg} />
                    ) : (
                      <View style={[styles.recentViewImg, styles.recentViewPlaceholder]}>
                        <Icons.ShoppingBag color="#94A3B8" size={20} />
                      </View>
                    )}
                    <Text style={[styles.recentViewName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.price ? (
                      <Text style={styles.recentViewPrice}>{item.price}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyActivityContainer}>
                <View style={[styles.emptyActivityIconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)' }]}>
                  <Icons.Clock color="#94A3B8" size={20} />
                </View>
                <Text style={[styles.emptyActivityTitle, { color: colors.text }]}>No recently viewed items</Text>
                <Text style={[styles.emptyActivitySubtitle, { color: colors.subtext }]}>
                  Products you explore will appear here.
                </Text>
              </View>
            )}
          </View>

          {/* 3. SUPPORT & SETTINGS SECTION */}
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            SUPPORT & SETTINGS
          </Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            {/* Help & Support */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('HelpSupport')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.HelpCircle color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Help & Support</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Notifications */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Bell color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Privacy & Security */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PrivacySecurity')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.ShieldCheck color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Privacy & Security</Text>
              <Icons.ChevronRight color="#94A3B8" size={16} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Language Selection Row */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => setIsLangModalOpen(true)}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 184, 0, 0.12)' }]}>
                <Icons.Globe color="#F5B800" size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('Language')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#F5B800', fontWeight: 'bold' }}>{currentLanguage}</Text>
                <Icons.ChevronRight color="#94A3B8" size={16} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Settings & Theme Row */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ThemeSettings')}
            >
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Palette color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('App Theme')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.subtext, textTransform: 'capitalize', fontWeight: 'bold' }}>{themeMode}</Text>
                <Icons.ChevronRight color="#94A3B8" size={16} />
              </View>
            </TouchableOpacity>

            {/* Quick Theme Switcher Pills */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['light', 'dark', 'system'] as const).map((mode) => {
                  const isSelected = themeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: isSelected ? colors.primary : (isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)'),
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      }}
                      onPress={() => setThemeMode(mode)}
                    >
                      {mode === 'light' && <Icons.Sun color={isSelected ? colors.primaryText : colors.text} size={14} />}
                      {mode === 'dark' && <Icons.Moon color={isSelected ? colors.primaryText : colors.text} size={14} />}
                      {mode === 'system' && <Icons.Monitor color={isSelected ? colors.primaryText : colors.text} size={14} />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primaryText : colors.text, textTransform: 'capitalize' }}>
                        {t(mode)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutButton} activeOpacity={0.8} onPress={handleSignOut}>
            <Icons.LogOut color="#EF4444" size={16} />
            <Text style={styles.signOutText}>{t('Sign Out')}</Text>
          </TouchableOpacity>

          {/* Version Info */}
          <Text style={[styles.versionText, { color: colors.muted }]}>
            Connect App v2.4.0 • Made with Forge India Connect
          </Text>
        </ScrollView>
      )}

      {/* Language Selector Modal */}
      <Modal
        visible={isLangModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalOpen(false)}
        >
          <View
            style={[
              styles.actionSheetCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.actionSheetTitle, { color: colors.text }]}>{t('select_language')}</Text>
            <Text style={[styles.actionSheetSub, { color: colors.subtext, marginBottom: 16 }]}>
              {t('choose_language_desc')}
            </Text>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {LANGUAGES_LIST.map((lang) => {
                const isSelected = currentLanguage === lang.name;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.actionSheetOption,
                      {
                        backgroundColor: isSelected ? (isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.15)') : 'transparent',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        marginBottom: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      },
                    ]}
                    onPress={() => {
                      setLanguage(lang.name);
                      setIsLangModalOpen(false);
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#D97706' : colors.text }}>
                        {lang.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                        {lang.nativeName}
                      </Text>
                    </View>
                    {isSelected && <Icons.Check color="#D97706" size={18} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.actionCancelBtn, { marginTop: 12, borderColor: isLight ? '#E2E8F0' : colors.cardBorder }]}
              onPress={() => setIsLangModalOpen(false)}
            >
              <Text style={[styles.actionCancelText, { color: colors.text }]}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Picker Action Sheet Modal */}
      <Modal
        visible={isPhotoModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhotoModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPhotoModalOpen(false)}
        >
          <View
            style={[
              styles.actionSheetCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.actionSheetTitle, { color: colors.text }]}>Profile Photo</Text>
            <Text style={[styles.actionSheetSub, { color: colors.subtext }]}>
              Update your account avatar
            </Text>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handleTakePhoto}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(245, 184, 0, 0.12)' }]}>
                <Icons.Camera color="#F5B800" size={18} />
              </View>
              <Text style={[styles.actionOptionText, { color: colors.text }]}>Take Photo with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handleChooseFromGallery}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Icons.Image color="#3B82F6" size={18} />
              </View>
              <Text style={[styles.actionOptionText, { color: colors.text }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            {currentUser?.avatar ? (
              <TouchableOpacity style={styles.actionSheetOption} onPress={handleRemovePhoto}>
                <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Icons.Trash2 color="#EF4444" size={18} />
                </View>
                <Text style={[styles.actionOptionText, { color: '#EF4444' }]}>Remove Current Photo</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.actionCancelBtn, { borderColor: isLight ? '#E2E8F0' : colors.cardBorder }]}
              onPress={() => setIsPhotoModalOpen(false)}
            >
              <Text style={[styles.actionCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // Redesigned Top Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    width: 78,
    height: 78,
    marginRight: 14,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  avatarCircleFallback: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraActionButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5B800',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    marginBottom: 3,
  },
  profileNameText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    maxWidth: 140,
  },
  goldMembershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goldMembershipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  profileEmailText: {
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 2,
  },
  profilePhoneText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  menuBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DB2777',
  },
  divider: {
    height: 1,
    marginLeft: 58,
  },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1.5,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentViewsScroll: {
    gap: 10,
  },
  recentViewCard: {
    width: 105,
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
  },
  recentViewImg: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#E2E8F0',
  },
  recentViewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentViewName: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    marginBottom: 2,
  },
  recentViewPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F5B800',
  },
  emptyActivityContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyActivityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyActivityTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyActivitySubtitle: {
    fontSize: 11.5,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },

  // Modal Action Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.65)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  actionSheetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionSheetSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionCancelBtn: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 14,
    alignItems: 'center',
  },
  actionCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
