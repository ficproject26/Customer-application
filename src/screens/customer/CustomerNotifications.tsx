import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import GlassCard from '../../components/GlassCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CustomerNotifications() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const isLight = themeMode === 'light' || colors.background !== '#050B1E';

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'order' | 'offer'>('all');

  // Smooth Fade & Scale Animation States
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismissModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
      if (callback) callback();
    });
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return item.unread;
    if (activeTab === 'order') return item.category === 'order';
    if (activeTab === 'offer') return item.category === 'offer';
    return true;
  });

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notification alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAll() },
      ]
    );
  };

  const getActionConfig = (notif: any) => {
    const titleLower = (notif.title || '').toLowerCase();
    const bodyLower = (notif.body || '').toLowerCase();
    const combined = `${titleLower} ${bodyLower}`;

    if (notif.actionLabel) {
      return {
        label: notif.actionLabel,
        type: notif.actionType || (notif.actionLabel.includes('Booking') ? 'booking' : notif.actionLabel.includes('Job') ? 'job' : notif.actionLabel.includes('Offer') ? 'offer' : 'order'),
      };
    }

    if (
      notif.actionType === 'booking' ||
      notif.orderType === 'booking' ||
      combined.includes('booking') ||
      combined.includes('booked') ||
      combined.includes('ticket') ||
      combined.includes('bus') ||
      combined.includes('stay') ||
      combined.includes('hotel') ||
      combined.includes('service')
    ) {
      return { label: 'View Booking', type: 'booking' as const };
    }

    if (
      notif.actionType === 'job' ||
      notif.orderType === 'job' ||
      combined.includes('job') ||
      combined.includes('application') ||
      combined.includes('applied') ||
      combined.includes('interview') ||
      combined.includes('candidate')
    ) {
      return { label: 'View Job', type: 'job' as const };
    }

    if (
      notif.actionType === 'order' ||
      notif.orderType === 'order' ||
      notif.category === 'order' ||
      combined.includes('order') ||
      combined.includes('delivery') ||
      combined.includes('delivered') ||
      combined.includes('product')
    ) {
      return { label: 'View Order', type: 'order' as const };
    }

    if (notif.category === 'offer' || combined.includes('offer') || combined.includes('discount')) {
      return { label: 'View Offer', type: 'offer' as const };
    }

    return { label: 'View Details', type: 'general' as const };
  };

  const handleActionPress = (notif: any) => {
    if (notif.unread) {
      markAsRead(notif.id);
    }
    const config = getActionConfig(notif);
    handleDismissModal(() => {
      if (notif.targetScreen === 'Orders' || config.type === 'order' || config.type === 'booking' || config.type === 'job') {
        const activeTab = config.type === 'booking'
          ? 'my bookings'
          : config.type === 'job'
          ? 'job applied'
          : 'my orders';
        navigation.navigate('CustomerTabs', {
          screen: 'Orders',
          params: {
            activeTab: notif.targetParams?.activeTab || activeTab,
            category: notif.targetParams?.category,
            orderId: notif.orderId || notif.bookingId || notif.targetParams?.orderId,
          },
        });
      } else if (notif.targetScreen === 'Membership' || config.type === 'offer') {
        navigation.navigate('CustomerTabs', { screen: 'Membership' });
      } else if (notif.targetScreen) {
        navigation.navigate(notif.targetScreen, notif.targetParams);
      } else {
        navigation.navigate('CustomerTabs', { screen: 'Orders' });
      }
    });
  };

  const handleCardPress = (notif: any) => {
    handleActionPress(notif);
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return <Icons.Bell color="#F5B800" size={18} />;
    const IconComp = (Icons as any)[iconName];
    if (!IconComp) return <Icons.Bell color="#F5B800" size={18} />;
    return <IconComp color="#F5B800" size={18} />;
  };

  return (
    <View style={styles.overlayContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dimmed Blurred Backdrop (Tap Outside to Dismiss) */}
      <TouchableWithoutFeedback onPress={() => handleDismissModal()}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: isLight ? 'rgba(15, 23, 42, 0.55)' : 'rgba(0, 0, 0, 0.72)',
              opacity: fadeAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Centered Animated Modal Popup */}
      <Animated.View
        style={[
          styles.modalCard,
          {
            backgroundColor: isLight ? '#FFFDF7' : '#0B132B',
            borderColor: isLight ? 'rgba(242, 183, 5, 0.4)' : colors.cardBorder,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Top Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isLight ? '#FFF1C7' : 'rgba(245, 184, 0, 0.08)',
              borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
            },
          ]}
        >
          <View style={styles.titleGroup}>
            <View style={styles.headerIconCircle}>
              <Icons.Bell color="#F5B800" size={18} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRightActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Read All</Text>
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={styles.clearBtn}>
                <Icons.Trash2 color="#EF4444" size={16} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDismissModal()} activeOpacity={0.7} style={styles.closeBtn}>
              <Icons.X color={colors.text} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter Tabs */}
        {notifications.length > 0 && (
          <View style={[styles.filterBar, { borderBottomColor: isLight ? '#F1EAD8' : colors.cardBorder }]}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'order', label: 'Orders' },
              { id: 'offer', label: 'Offers' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterTab,
                    isActive && styles.filterTabActive,
                    isActive && { backgroundColor: isLight ? '#F5B800' : 'rgba(245, 184, 0, 0.18)' },
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      { color: isLight ? (isActive ? '#0F172A' : '#64748B') : isActive ? '#F5B800' : 'rgba(255,255,255,0.6)' },
                      isActive && { fontWeight: 'bold' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Notifications List Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                activeOpacity={0.88}
                onPress={() => handleCardPress(notif)}
                style={styles.cardContainer}
              >
                <GlassCard
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: notif.unread
                        ? isLight ? '#FFFDF5' : 'rgba(245, 184, 0, 0.08)'
                        : isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.6)',
                      borderColor: notif.unread
                        ? '#F5B800'
                        : isLight ? '#F1EAD8' : colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.notifRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: notif.unread
                            ? 'rgba(245, 184, 0, 0.18)'
                            : isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                        },
                      ]}
                    >
                      {renderIcon(notif.icon)}
                    </View>

                    <View style={styles.detailsCol}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
                          {notif.title}
                        </Text>
                        {notif.unread && <View style={styles.unreadDot} />}
                      </View>
                      <Text
                        style={[
                          styles.notifBody,
                          { color: isLight ? '#475569' : 'rgba(255, 255, 255, 0.7)' },
                        ]}
                        numberOfLines={2}
                      >
                        {notif.body}
                      </Text>
                      <View style={styles.timeAndActionRow}>
                        <View style={styles.timeRow}>
                          <Icons.Clock color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={11} />
                          <Text style={[styles.notifTime, { color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)' }]}>
                            {notif.time}
                          </Text>
                        </View>

                        {/* Explicit Action Button requested by user */}
                        {(() => {
                          const actionConfig = getActionConfig(notif);
                          const isBooking = actionConfig.type === 'booking';
                          const isJob = actionConfig.type === 'job';
                          const isOffer = actionConfig.type === 'offer';
                          return (
                            <TouchableOpacity
                              style={[
                                styles.actionPillBtn,
                                isBooking
                                  ? { backgroundColor: '#F59E0B' }
                                  : isJob
                                  ? { backgroundColor: '#4F46E5' }
                                  : isOffer
                                  ? { backgroundColor: '#9333EA' }
                                  : { backgroundColor: '#10B981' },
                              ]}
                              onPress={() => handleActionPress(notif)}
                              activeOpacity={0.8}
                            >
                              {isBooking ? (
                                <Icons.Ticket size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                              ) : isJob ? (
                                <Icons.Briefcase size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                              ) : isOffer ? (
                                <Icons.Sparkles size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                              ) : (
                                <Icons.Package size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                              )}
                              <Text style={styles.actionPillBtnText}>{actionConfig.label}</Text>
                              <Icons.ChevronRight size={11} color="#FFFFFF" style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                          );
                        })()}
                      </View>
                    </View>

                    <Icons.ChevronRight color={isLight ? '#CBD5E1' : 'rgba(255,255,255,0.3)'} size={16} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isLight ? '#FFF1C7' : 'rgba(245, 184, 0, 0.1)' }]}>
                <Icons.BellOff color="#F5B800" size={36} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : 'rgba(255,255,255,0.5)' }]}>
                You're all caught up! Order updates, booking confirmations, and promo alerts will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH * 0.92, 440),
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 184, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  filterTabActive: {},
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 20,
  },
  cardContainer: {
    marginBottom: 10,
  },
  notifCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  actionPillBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
