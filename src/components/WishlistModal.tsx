import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import * as Icons from 'lucide-react-native';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore, isCartableCategory } from '../store/cartStore';
import GlassCard from './GlassCard';
import { useThemeStore } from '../store/themeStore';

const { height } = Dimensions.get('window');

interface WishlistModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WishlistModal({ visible, onClose }: WishlistModalProps) {
  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const removeFromWishlist = useWishlistStore((state) => state.removeFromWishlist);
  const addToCart = useCartStore((state) => state.addToCart);
  const colors = useThemeStore((state) => state.colors);

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
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
              <Icons.Heart color="#FF2E93" size={20} fill="#FF2E93" />
              <Text style={[styles.headerText, { color: colors.text }]}>My Wishlist</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icons.X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {wishlistItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icons.Heart color={colors.subtext} size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Your wishlist is empty</Text>
              <Text style={[styles.emptySubText, { color: colors.subtext }]}>Tap the heart icon on any product or service to save it here.</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
              {wishlistItems.map((item) => {
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
                        onPress={() => removeFromWishlist(item.id)}
                      >
                        <Icons.Trash2 color="#EF4444" size={16} />
                      </TouchableOpacity>
                      
                      {isCartableCategory(item.category, item.name) && (
                        <TouchableOpacity 
                          style={styles.cartBtn}
                          onPress={() => handleAddToCart(item)}
                        >
                          <Icons.ShoppingCart color="#050B1E" size={14} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </GlassCard>
                );
              })}
            </ScrollView>
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
    height: height * 0.7,
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
  cartBtn: {
    backgroundColor: '#F4C400',
    borderRadius: 6,
    padding: 6,
  },
});
