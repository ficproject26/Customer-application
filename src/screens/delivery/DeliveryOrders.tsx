import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import GlassCard from '../../components/GlassCard';
import * as Icons from 'lucide-react-native';

const { height } = Dimensions.get('window');

export default function DeliveryOrders() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  const allOrders = useOrderStore((state) => state.allOrders);
  const loadAllOrders = useOrderStore((state) => state.loadAllOrders);
  const claimOrder = useOrderStore((state) => state.claimOrder);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [loading, setLoading] = useState(allOrders.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchOrdersSilently = useCallback(async () => {
    try {
      await loadAllOrders();
    } catch (err) {
      console.warn('Silent shipment load err:', err);
    }
  }, [loadAllOrders]);

  useEffect(() => {
    if (isFocused) {
      if (allOrders.length === 0) {
        setLoading(true);
      }
      fetchOrdersSilently().finally(() => setLoading(false));

      // Silent auto-refresh every 6 seconds while screen is active
      const interval = setInterval(() => {
        fetchOrdersSilently();
      }, 6000);

      return () => clearInterval(interval);
    }
  }, [isFocused, fetchOrdersSilently]);

  const onPullToRefresh = async () => {
    setRefreshing(true);
    await fetchOrdersSilently();
    setRefreshing(false);
  };

  const handleClaim = async (orderId: string) => {
    if (!currentUser) return;
    setClaimingId(orderId);
    const ok = await claimOrder(orderId, currentUser.id);
    setClaimingId(null);
    if (ok) {
      Alert.alert('Order Claimed', 'Go to dashboard to start navigation.');
      navigation.navigate('Dashboard' as any);
    } else {
      Alert.alert('Error', 'Unable to claim order at this moment.');
    }
  };

  // Filter claimable orders (Ready For Pickup and not yet assigned/accepted)
  const claimable = allOrders.filter(
    (o) => o.status === 'Ready For Pickup' || o.status === 'Order Received'
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Shipments</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{claimable.length} available</Text>
        </View>
      </View>

      {loading && allOrders.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color="#F4C400" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullToRefresh}
              tintColor="#F4C400"
              colors={['#F4C400']}
            />
          }
        >
          {claimable.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icons.Inbox color="rgba(255,255,255,0.2)" size={48} />
              <Text style={styles.emptyText}>No available shipments</Text>
              <Text style={styles.emptySub}>All orders are currently handled by other partners or preparing.</Text>
            </View>
          ) : (
            claimable.map((order) => (
              <GlassCard key={order.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNoLabel}>ORDER NUMBER</Text>
                    <Text style={styles.orderNo}>#{order.order_number}</Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutText}>₹75.00</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailCol}>
                    <Text style={styles.label}>PICKUP FROM</Text>
                    <Text style={styles.val}>ABC Electronics Hub</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.label}>DISTANCE</Text>
                    <Text style={styles.val}>2.8 km away</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => handleClaim(order.id)}
                  disabled={claimingId !== null}
                >
                  <Text style={styles.claimBtnText}>
                    {claimingId === order.id ? 'Claiming shipment...' : 'Accept & Claim shipment'}
                  </Text>
                </TouchableOpacity>
              </GlassCard>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: height * 0.05,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  countBadge: {
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 196, 0, 0.25)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F4C400',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: height * 0.2,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
    lineHeight: 16,
  },
  orderCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(13, 22, 54, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  orderNo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },
  payoutBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  payoutText: {
    fontSize: 12,
    fontWeight: 'black',
    color: '#10B981',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 10,
    borderRadius: 10,
  },
  detailCol: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 'bold',
  },
  val: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 2,
  },
  claimBtn: {
    backgroundColor: '#F4C400',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050B1E',
  },
});
