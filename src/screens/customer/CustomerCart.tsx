import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import * as Icons from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { useThemeStore } from '../../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useTranslation } from '../../store/languageStore';

export default function CustomerCart() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const showToast = useToastStore((state) => state.showToast);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const rawPrice = item.price;
      const numericPrice =
        typeof rawPrice === 'number'
          ? rawPrice
          : parseInt(String(rawPrice || '0').replace(/[^\d]/g, ''), 10) || 0;
      return acc + numericPrice * item.quantity;
    }, 0);
  };

  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleDecrement = (id: string, currentQty: number) => {
    if (currentQty <= 1) {
      removeFromCart(id);
      showToast('Item removed from cart');
    } else {
      updateQuantity(id, currentQty - 1);
    }
  };

  const handleRemove = (id: string) => {
    removeFromCart(id);
    showToast('Item removed from cart');
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    if (!useAuthStore.getState().currentUser) {
      useAuthGuardStore.getState().showAuthModal('proceed to checkout and place your order');
      return;
    }
    navigation.navigate('Checkout', {
      items: cartItems,
      subtotal: calculateTotal(),
    });
  };

  const handleExplore = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CustomerTabs', { screen: 'Home' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
        translucent={false}
      />

      {/* Top Navbar */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top + 4,
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.navLeftRow}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' },
            ]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('CustomerTabs', { screen: 'Home' });
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.ArrowLeft color={colors.text} size={18} />
          </TouchableOpacity>

          <View style={styles.titleWithBadge}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('My Cart')}</Text>
            {totalCount > 0 && (
              <View style={styles.headerCountBadge}>
                <Text style={styles.headerCountBadgeText}>{totalCount}</Text>
              </View>
            )}
          </View>
        </View>

        {cartItems.length > 0 && (
          <TouchableOpacity onPress={clearCart} style={styles.clearBtn} activeOpacity={0.7}>
            <Icons.Trash2 color="#EF4444" size={14} />
            <Text style={styles.clearBtnText}>{t('Clear All')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items List or Empty State */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.08)', borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.2)' },
            ]}
          >
            <Icons.ShoppingBag color="#F5B800" size={44} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('Your Cart is Empty')}</Text>
          <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
            Explore our curated products, fresh daily needs, chef specials, stays, and doorstep services.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} activeOpacity={0.85} onPress={handleExplore}>
            <Text style={styles.exploreBtnText}>{t('Start Shopping Now →')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.itemList}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((item) => {
              const defaultImg =
                'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.cartCard,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    },
                  ]}
                >
                  <Image source={{ uri: item.image || (item as any).img || defaultImg }} style={styles.itemImg} />
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTopRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.12)' },
                        ]}
                      >
                        <Text style={styles.categoryBadgeText}>{(item.category || 'Product').toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemove(item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Icons.Trash2 color="#EF4444" size={15} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <View style={styles.priceAndQtyRow}>
                      <Text style={[styles.itemPrice, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                        {item.price}
                      </Text>

                      <View
                        style={[
                          styles.qtyControls,
                          {
                            backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleDecrement(item.id, item.quantity)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Icons.Minus color={colors.text} size={13} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Icons.Plus color={colors.text} size={13} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Checkout Floating Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#0B132B',
                borderTopColor: isLight ? '#F1EAD8' : colors.cardBorder,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  {t('Items Total')} ({totalCount} {t('items')})
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  ₹{calculateTotal().toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  {t('Delivery Fee')}
                </Text>
                <Text style={[styles.summaryVal, { color: '#10B981', fontWeight: '800' }]}>{t('FREE')}</Text>
              </View>
            </View>

            <View style={styles.totalActionRow}>
              <View>
                <Text style={[styles.totalAmountLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  {t('Grand Total')}
                </Text>
                <Text style={[styles.totalAmountValue, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                  ₹{calculateTotal().toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                activeOpacity={0.85}
                onPress={handleProceedToCheckout}
              >
                <Text style={styles.checkoutBtnText}>{t('Proceed to Checkout')}</Text>
                <Icons.ArrowRight color="#0F172A" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerCountBadge: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  headerCountBadgeText: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '900',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  exploreBtn: {
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  itemList: {
    flex: 1,
    padding: 16,
  },
  cartCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  itemImg: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#D97706',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  removeBtn: {
    padding: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  priceAndQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 8,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyText: {
    fontSize: 12.5,
    fontWeight: '900',
    minWidth: 16,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  summaryBreakdown: {
    gap: 4,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  totalAmountLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
});
