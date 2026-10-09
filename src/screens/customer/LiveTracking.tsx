import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiFetch } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore, Order } from '../../store/orderStore';
import { useThemeStore } from '../../store/themeStore';
import MapComponent from '../../components/MapComponent';
import * as Icons from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const VENDOR_DEFAULT_LAT = 12.9348;
const VENDOR_DEFAULT_LNG = 77.6189;
const CUSTOMER_DEFAULT_LAT = 12.9716;
const CUSTOMER_DEFAULT_LNG = 77.6412;

// Generate realistic intermediate GPS route waypoints
function generateWaypoints(lat1: number, lon1: number, lat2: number, lon2: number, steps: number = 22): [number, number][] {
  const points: [number, number][] = [];
  const midLat = lat1 + (lat2 - lat1) * 0.48;
  const midLng = lon1 + (lon2 - lon1) * 0.62;

  const anchors: [number, number][] = [
    [lat1, lon1],
    [lat1 + (midLat - lat1) * 0.4, lon1 + (midLng - lon1) * 0.2],
    [midLat, midLng],
    [midLat + (lat2 - midLat) * 0.6, midLng + (lon2 - midLng) * 0.7],
    [lat2, lon2],
  ];

  for (let i = 0; i < anchors.length - 1; i++) {
    const start = anchors[i];
    const end = anchors[i + 1];
    const segSteps = Math.ceil(steps / (anchors.length - 1));
    for (let j = 0; j < segSteps; j++) {
      const t = j / segSteps;
      const lt = start[0] + (end[0] - start[0]) * t;
      const ln = start[1] + (end[1] - start[1]) * t;
      points.push([lt, ln]);
    }
  }
  points.push([lat2, lon2]);
  return points;
}

export default function LiveTracking() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);

  const routeParams = (route.params as any) || {};
  const paramOrder: Order | undefined = routeParams.order;
  const paramOrderId: string = routeParams.orderId || paramOrder?.id || paramOrder?.order_number || '';

  const currentUser = useAuthStore((state) => state.currentUser);
  const allOrders = useOrderStore((state) => state.allOrders);

  // Retrieve initial order from route params or local order store
  const storeOrder = useMemo(() => {
    if (!paramOrderId) return undefined;
    return allOrders.find(
      (o) => o.id === paramOrderId || o.order_number === paramOrderId
    );
  }, [allOrders, paramOrderId]);

  const [order, setOrder] = useState<any>(paramOrder || storeOrder || null);
  const [partner, setPartner] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Coordinate states
  const vendorCoords = useMemo(() => ({
    lat: Number(order?.vendor_latitude) || VENDOR_DEFAULT_LAT,
    lng: Number(order?.vendor_longitude) || VENDOR_DEFAULT_LNG,
  }), [order]);

  const customerCoords = useMemo(() => ({
    lat: Number(order?.customer_latitude) || CUSTOMER_DEFAULT_LAT,
    lng: Number(order?.customer_longitude) || CUSTOMER_DEFAULT_LNG,
  }), [order]);

  // Precomputed Route Waypoints
  const fullRoute = useMemo(() => {
    return generateWaypoints(
      vendorCoords.lat,
      vendorCoords.lng,
      customerCoords.lat,
      customerCoords.lng,
      20
    );
  }, [vendorCoords, customerCoords]);

  // Initial ETA calculation based on order or category
  const initialEta = useMemo(() => {
    if (order?.tracking?.eta) return Number(order.tracking.eta);
    if (order?.delivery_time && !isNaN(parseInt(order.delivery_time, 10))) {
      return parseInt(order.delivery_time, 10);
    }
    const cat = order?.category;
    if (cat === 'Food') return 22;
    if (cat === 'Daily Needs') return 16;
    return 18;
  }, [order]);

  // Dynamic simulation progression index
  const [routeIndex, setRouteIndex] = useState<number>(3);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(3.2);
  const [eta, setEta] = useState<number>(initialEta);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);

  const activeOrderId = order?.id || order?.order_number || paramOrderId;
  const category = order?.category || 'Daily Needs';

  // Dynamic express delivery estimated timing window (not hardcoded to 30 mins)
  const dynamicDeliveryTiming = useMemo(() => {
    if (order?.delivery_time) return order.delivery_time;
    if (order?.estimated_delivery) return order.estimated_delivery;
    if (category === 'Food') return '20-30 mins';
    if (category === 'Daily Needs') return '15-25 mins';
    return `${Math.max(eta - 4, 5)}-${eta + 6} mins`;
  }, [order, category, eta]);

  // Current Rider position
  const currentRiderCoord = useMemo(() => {
    if (fullRoute.length === 0) return { lat: vendorCoords.lat, lng: vendorCoords.lng };
    const pt = fullRoute[Math.min(routeIndex, fullRoute.length - 1)];
    return { lat: pt[0], lng: pt[1] };
  }, [fullRoute, routeIndex, vendorCoords]);

  // Load backend order tracking data
  const loadTrackingData = async () => {
    if (!activeOrderId) return;
    try {
      const res = await apiFetch(`/orders/${encodeURIComponent(activeOrderId)}`);
      if (res && res.status === 'success' && res.data) {
        const { order: o, partner: p, timeline: t } = res.data;
        if (o) setOrder(o);
        if (p) setPartner(p);
        if (Array.isArray(t) && t.length > 0) setTimeline(t);
        if (res.data.tracking?.eta) setEta(res.data.tracking.eta);
        if (res.data.tracking?.distance) setDistanceRemaining(res.data.tracking.distance);
      }
    } catch (err) {
      console.warn('[LiveTracking] Silent fetch notice:', err);
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, [activeOrderId]);

  // Live GPS Simulation loop: rider moves dynamically along route towards customer
  useEffect(() => {
    if (!isLiveSimulating || fullRoute.length === 0) return;

    const interval = setInterval(() => {
      setRouteIndex((prev) => {
        if (prev >= fullRoute.length - 1) {
          setIsLiveSimulating(false);
          setDistanceRemaining(0.1);
          setEta(1);
          return fullRoute.length - 1;
        }
        const next = prev + 1;
        const total = fullRoute.length - 1;
        const progress = next / total;

        const remDist = Math.max(Number((3.5 * (1 - progress)).toFixed(1)), 0.1);
        const remEta = Math.max(Math.round(initialEta * (1 - progress)), 1);

        setDistanceRemaining(remDist);
        setEta(remEta);
        return next;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [isLiveSimulating, fullRoute, initialEta]);

  // Socket.io Real-time partner location updates
  useEffect(() => {
    if (!activeOrderId) return;

    socketService.connect();
    socketService.joinOrder(activeOrderId);

    const handleLocationUpdate = (payload: any) => {
      if (payload && payload.latitude && payload.longitude) {
        setIsLiveSimulating(false);
        if (payload.distance !== undefined) setDistanceRemaining(Number(payload.distance));
        if (payload.eta !== undefined) setEta(Number(payload.eta));
        if (payload.partner) setPartner((p: any) => ({ ...p, ...payload.partner }));
      }
    };

    socketService.on('delivery_location_update', handleLocationUpdate);
    socketService.on('partner_location_update', handleLocationUpdate);

    return () => {
      socketService.off('delivery_location_update', handleLocationUpdate);
      socketService.off('partner_location_update', handleLocationUpdate);
      socketService.leaveOrder(activeOrderId);
    };
  }, [activeOrderId]);

  // Default Verified Partner details
  const effectivePartner = useMemo(() => {
    return (
      partner || {
        name: 'Rajesh Kumar',
        phone: '+91 98451 22319',
        rating: 4.9,
        deliveries_count: 856,
        vehicle_type: 'Express Bike',
        vehicle_number: 'Hero Splendor • KA-05-EX-8821',
      }
    );
  }, [partner]);

  const progressRatio = fullRoute.length > 0 ? routeIndex / (fullRoute.length - 1) : 0;
  const isNearby = distanceRemaining <= 0.6 || eta <= 3;
  const isDelivered = progressRatio >= 0.98 || routeIndex >= fullRoute.length - 1;

  // Phone Call Action Handler
  const handleCallPartner = () => {
    const rawPhone = effectivePartner?.phone || '+919845122319';
    const cleanNumber = rawPhone.replace(/[^\d+]/g, '');
    const url = `tel:${cleanNumber}`;

    Alert.alert(
      'Call Delivery Partner',
      `Dial ${effectivePartner.name} at ${effectivePartner.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'default',
          onPress: () => {
            Linking.openURL(url).catch((err) => {
              Alert.alert('Unable to place call', 'Please dial ' + effectivePartner.phone + ' directly.');
            });
          },
        },
      ]
    );
  };

  const handleMessagePartner = () => {
    const phone = effectivePartner?.phone || '+919845122319';
    const textMsg = `Hello ${effectivePartner.name}, I am tracking my express order #${order?.order_number || activeOrderId}.`;
    Linking.openURL(`sms:${phone.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(textMsg)}`).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg || colors.background}
      />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg || colors.background, borderColor: colors.cardBorder || '#E8DEC8' }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : (colors.cardBg || '#FFFFFF'), borderColor: colors.cardBorder || '#E2E8F0' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.ChevronLeft color={colors.text || '#101827'} size={20} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text || '#101827' }]}>⚡ Live Express Tracking</Text>
          <Text style={styles.headerSub}>
            Order #{order?.order_number || activeOrderId || 'CN-EXPRESS'}
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveBadgeText}>LIVE GPS</Text>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapComponent
          riderLat={currentRiderCoord.lat}
          riderLng={currentRiderCoord.lng}
          vendorLat={vendorCoords.lat}
          vendorLng={vendorCoords.lng}
          customerLat={customerCoords.lat}
          customerLng={customerCoords.lng}
          route={fullRoute}
          distance={distanceRemaining}
          eta={eta}
          riderName={effectivePartner.name}
          customerName={order?.customer_name || 'Customer'}
        />

        {/* Floating ETA Pill on Map */}
        <View
          style={[
            styles.floatingEtaCard,
            {
              backgroundColor: isDark ? 'rgba(5, 11, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: '#10B981',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icons.Zap color="#10B981" size={16} />
            <Text style={[styles.floatingEtaText, { color: isDark ? '#FFFFFF' : '#101827' }]}>
              {isDelivered
                ? 'Arrived at your doorstep!'
                : isNearby
                ? `Nearby • Arriving in ~${eta} mins`
                : `Express Delivery • ~${eta} mins`}
            </Text>
          </View>
          <Text style={styles.floatingDistText}>{distanceRemaining} km away</Text>
        </View>
      </View>

      {/* Bottom Scrollable Info Panel */}
      <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
        {/* Delivery Partner Contact Card */}
        <View
          style={[
            styles.themedCard,
            {
              backgroundColor: colors.cardBg || '#FFFFFF',
              borderColor: colors.cardBorder || '#F1EAD8',
            },
          ]}
        >
          <View style={styles.partnerHeaderRow}>
            <View style={styles.partnerAvatarWrapper}>
              <View style={styles.partnerAvatarCircle}>
                <Icons.User color="#FFFFFF" size={22} />
              </View>
              <View style={[styles.onlineBadgeDot, { borderColor: colors.cardBg || '#FFFFFF' }]} />
            </View>

            <View style={styles.partnerInfoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.partnerNameText, { color: colors.text || '#101827' }]}>
                  {effectivePartner.name}
                </Text>
                <View style={styles.verifiedTag}>
                  <Icons.CheckCircle2 color="#10B981" size={12} />
                  <Text style={styles.verifiedTagText}>Verified</Text>
                </View>
              </View>
              <Text style={[styles.partnerVehicleText, { color: colors.subtext || '#475569' }]}>
                {effectivePartner.vehicle_type} • {effectivePartner.vehicle_number}
              </Text>
              <View style={styles.ratingRow}>
                <Icons.Star color="#F59E0B" size={12} fill="#F59E0B" />
                <Text style={styles.ratingText}>
                  {effectivePartner.rating || '4.9'} ({effectivePartner.deliveries_count || '856'} deliveries)
                </Text>
                <Text style={[styles.phoneDisplay, { color: colors.muted || '#94A3B8' }]}>
                  • {effectivePartner.phone}
                </Text>
              </View>
            </View>
          </View>

          {/* Direct Action Buttons */}
          <View style={styles.partnerActionRow}>
            <TouchableOpacity style={styles.callPrimaryBtn} onPress={handleCallPartner} activeOpacity={0.85}>
              <Icons.PhoneCall color="#FFFFFF" size={16} />
              <Text style={styles.callBtnText}>Call Partner ({effectivePartner.phone})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.messageBtn,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}
              onPress={handleMessagePartner}
              activeOpacity={0.85}
            >
              <Icons.MessageSquare color="#10B981" size={17} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Status Stepper */}
        <View
          style={[
            styles.themedCard,
            {
              backgroundColor: colors.cardBg || '#FFFFFF',
              borderColor: colors.cardBorder || '#F1EAD8',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#10B981' : '#059669' }]}>
              ORDER STATUS & JOURNEY
            </Text>
            <View style={styles.windowBadge}>
              <Icons.Clock color="#10B981" size={11} />
              <Text style={styles.windowBadgeText}>{dynamicDeliveryTiming}</Text>
            </View>
          </View>

          {[
            {
              title: 'Order Confirmed',
              desc: `${order?.vendor_name || 'Connect Store'} accepted your express order`,
              done: true,
              active: progressRatio < 0.25,
            },
            {
              title: 'Packed at Local Hub',
              desc: 'Items packed and sealed in your pincode store for rapid dispatch',
              done: progressRatio >= 0.2,
              active: progressRatio >= 0.2 && progressRatio < 0.4,
            },
            {
              title: 'Delivery Partner Assigned & Accepted',
              desc: `${effectivePartner.name} accepted order & picked up package`,
              done: progressRatio >= 0.35,
              active: progressRatio >= 0.35 && progressRatio < 0.55,
            },
            {
              title: 'Out for Delivery (On the Way)',
              desc: `${effectivePartner.name} is riding along the fastest route to your doorstep`,
              done: progressRatio >= 0.55,
              active: progressRatio >= 0.55 && progressRatio < 0.95,
            },
            {
              title: isDelivered ? 'Arrived & Delivered' : 'Arriving at Your Doorstep',
              desc: isDelivered
                ? 'Package handed over safely. Enjoy!'
                : 'Delivery partner is within reaching distance',
              done: isDelivered,
              active: isDelivered || isNearby,
            },
          ].map((st, idx) => (
            <View key={idx} style={styles.stepItemRow}>
              <View style={styles.stepIconColumn}>
                <View
                  style={[
                    styles.stepDot,
                    st.done
                      ? styles.stepDotDone
                      : st.active
                      ? [styles.stepDotActive, { backgroundColor: colors.cardBg || '#FFFFFF' }]
                      : [styles.stepDotPending, { backgroundColor: colors.cardBg || '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1' }],
                  ]}
                >
                  {st.done ? (
                    <Icons.Check color="#FFFFFF" size={10} strokeWidth={3} />
                  ) : st.active ? (
                    <View style={styles.innerPulse} />
                  ) : null}
                </View>
                {idx < 4 && (
                  <View
                    style={[
                      styles.stepLine,
                      st.done ? styles.stepLineDone : [styles.stepLinePending, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0' }],
                    ]}
                  />
                )}
              </View>

              <View style={styles.stepContentCol}>
                <Text
                  style={[
                    styles.stepTitleText,
                    st.done
                      ? { color: colors.text || '#101827' }
                      : st.active
                      ? styles.stepTitleActive
                      : { color: colors.muted || '#94A3B8' },
                  ]}
                >
                  {st.title}
                </Text>
                <Text style={[styles.stepDescText, { color: colors.subtext || '#64748B' }]}>{st.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Destination & Order Details Summary */}
        <View
          style={[
            styles.themedCard,
            {
              backgroundColor: colors.cardBg || '#FFFFFF',
              borderColor: colors.cardBorder || '#F1EAD8',
            },
          ]}
        >
          <Text style={[styles.summaryHeaderTitle, { color: colors.muted || '#64748B' }]}>
            DELIVERY DESTINATION & SUMMARY
          </Text>

          <View style={styles.summaryRow}>
            <Icons.MapPin color="#10B981" size={18} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.summaryLabel, { color: colors.muted || '#94A3B8' }]}>Delivery Address</Text>
              <Text style={[styles.summaryValue, { color: colors.text || '#101827' }]}>
                {order?.customer_address || 'Customer Delivery Address'}
              </Text>
              {order?.customer_name && (
                <Text style={[styles.summarySub, { color: colors.subtext || '#64748B' }]}>
                  Recipient: {order.customer_name} ({order.customer_phone || ''})
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.divider || '#F1EAD8' }]} />

          <View style={styles.summaryRow}>
            <Icons.PackageCheck color="#3B82F6" size={18} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.summaryLabel, { color: colors.muted || '#94A3B8' }]}>Ordered Items</Text>
              <Text style={[styles.summaryValue, { color: colors.text || '#101827' }]}>
                {order?.product_details || 'Express Delivery Items'}
              </Text>
              <Text style={[styles.summarySub, { color: colors.subtext || '#64748B' }]}>
                Payment: {order?.payment_method || 'Razorpay / Cash'} • Amount: ₹
                {(order?.amount ?? 0).toLocaleString('en-IN')}
              </Text>
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  windowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  windowBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
  },
  mapContainer: {
    height: 270,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    position: 'relative',
  },
  floatingEtaCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingEtaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  floatingDistText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    paddingTop: 8,
  },
  themedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  partnerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  partnerAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  partnerInfoCol: {
    flex: 1,
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '900',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  verifiedTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  partnerVehicleText: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '800',
  },
  phoneDisplay: {
    fontSize: 11,
    fontWeight: '600',
  },
  partnerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  callPrimaryBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  messageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stepItemRow: {
    flexDirection: 'row',
  },
  stepIconColumn: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotActive: {
    borderWidth: 2.5,
    borderColor: '#10B981',
  },
  innerPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  stepDotPending: {
    borderWidth: 2,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
  },
  stepLineDone: {
    backgroundColor: '#10B981',
  },
  stepLinePending: {
    backgroundColor: '#E2E8F0',
  },
  stepContentCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitleActive: {
    color: '#10B981',
  },
  stepDescText: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  summaryHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 18,
  },
  summarySub: {
    fontSize: 11,
    marginTop: 3,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
});
