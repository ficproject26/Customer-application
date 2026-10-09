import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import * as Icons from 'lucide-react-native';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { apiFetch } from '../services/api';
import GlassCard from './GlassCard';
import { useThemeStore } from '../store/themeStore';

const { height } = Dimensions.get('window');


interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function CartModal({ visible, onClose, navigation }: CartModalProps) {
  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const loadAllOrders = useOrderStore((state) => state.loadAllOrders);
  const colors = useThemeStore((state) => state.colors);

  // Calculate total amount
  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const numericPrice = parseInt(item.price.replace(/[^\d]/g, ''), 10) || 0;
      return acc + (numericPrice * item.quantity);
    }, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    onClose();
    navigation.navigate('Checkout', {
      items: cartItems,
      subtotal: calculateTotal(),
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.header, { borderColor: colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <Icons.ShoppingCart color={colors.primary} size={20} />
              <Text style={[styles.headerText, { color: colors.text }]}>Shopping Cart</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icons.X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>

          {/* Cart Content */}
          {cartItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icons.ShoppingBag color={colors.subtext} size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Your cart is empty</Text>
              <Text style={[styles.emptySubText, { color: colors.subtext }]}>Add premium products and services to get started.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {cartItems.map((item) => {
                  const defaultImg = 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=150&auto=format&fit=crop&q=60';
                  return (
                    <GlassCard key={item.id} style={styles.itemCard}>
                      <Image source={{ uri: item.image || defaultImg }} style={[styles.itemImg, { backgroundColor: colors.grayDark }]} />
                      <View style={styles.itemDetails}>
                        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.itemCategory, { color: colors.subtext }]}>{item.category}</Text>
                        <Text style={[styles.itemPrice, { color: colors.primary }]}>{item.price}</Text>
                      </View>
                      <View style={styles.rightActions}>
                        <TouchableOpacity 
                          style={styles.deleteBtn} 
                          onPress={() => removeFromCart(item.id)}
                        >
                          <Icons.Trash2 color="#EF4444" size={16} />
                        </TouchableOpacity>
                        
                        {/* Qty selectors */}
                        <View style={[styles.qtyRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.cardBorder }]} 
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Icons.Minus color={colors.text} size={10} />
                          </TouchableOpacity>
                          <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.cardBorder }]} 
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Icons.Plus color={colors.text} size={10} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </GlassCard>
                  );
                })}
              </ScrollView>

              {/* Summary Footer */}
              <View style={[styles.footer, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.subtext }]}>Total Amount:</Text>
                  <Text style={[styles.totalPrice, { color: colors.primary }]}>₹{calculateTotal().toLocaleString('en-IN')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.checkoutBtn} 
                  activeOpacity={0.8}
                  onPress={handleCheckout}
                >
                  <Text style={styles.checkoutBtnText}>Checkout & Place Orders</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: height * 0.75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 12,
  },
  itemImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemCategory: {
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
  },
  deleteBtn: {
    padding: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
  },
  qtyBtn: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#F4C400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#050B1E',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
