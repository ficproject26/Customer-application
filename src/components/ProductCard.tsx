import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Icons from 'lucide-react-native';
import { useCartStore, isCartableCategory } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useActivityStore } from '../store/activityStore';
import { useToastStore } from '../store/toastStore';

import { useThemeStore } from '../store/themeStore';
import { getRelevantProductImage } from '../utils/productImages';
import { openRespectivePage } from '../utils/navigationHelpers';
import { useTranslation } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { useAuthGuardStore } from '../store/authGuardStore';
import { resolveImageUrl } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

export interface ProductItem {
  id: string;
  name: string;
  spec?: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  rating?: string;
  ratingCount?: string;
  image: string;
  category: string;
  assured?: boolean;
}

interface ProductCardProps {
  item: ProductItem;
  onPress: () => void;
  onPlaceOrder?: (name: string, price: string, category: string) => void;
}

function ProductCardComponent({ item, onPress, onPlaceOrder }: ProductCardProps) {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const [imgError, setImgError] = useState(false);
  const navigation = useNavigation<any>();
  const isInCart = useCartStore((state) => state.cartItems.some((i) => i.id === item.id));
  const addToCart = useCartStore((state) => state.addToCart);
  const isWishlisted = useWishlistStore((state) => state.wishlistItems.some((i) => i.id === item.id));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const showToast = useToastStore((state) => state.showToast);

  const currentUser = useAuthStore((state) => state.currentUser);
  const isGuestUser = useMemo(() => {
    return !currentUser || currentUser.isGuest || currentUser.id === 'guest_user' || Boolean(currentUser.name && currentUser.name.toLowerCase().includes('guest'));
  }, [currentUser]);

  const computedDiscount = useMemo(() => {
    if (item.originalPrice && item.price) {
      const numPrice = parseInt(String(item.price).replace(/[^\d]/g, ''), 10);
      const numOrig = parseInt(String(item.originalPrice).replace(/[^\d]/g, ''), 10);
      if (numOrig > numPrice) {
        const pct = Math.round(((numOrig - numPrice) / numOrig) * 100);
        if (pct > 0) return `${pct}% OFF`;
      }
    }
    return item.discount;
  }, [item.originalPrice, item.price, item.discount]);

  const [isProcessing, setIsProcessing] = useState(false);

  const catLower = useMemo(() => (item.category || '').toLowerCase().trim(), [item.category]);
  const actionType = (item as any).actionType || '';

  // Check if this category supports cart
  const hasCart = useMemo(() => isCartableCategory(item.category, item.name), [item.category, item.name]);

  const handleOpenRespectivePage = useCallback(() => {
    openRespectivePage(navigation, item);
  }, [item, navigation]);

  const handleCardPress = useCallback(() => {
    useActivityStore.getState().recordProductView({
      id: item.id,
      name: item.name,
      category: item.category,
      image: item.image,
      price: item.price,
    });

    if (!hasCart) {
      handleOpenRespectivePage();
      return;
    }

    onPress();
  }, [item, hasCart, handleOpenRespectivePage, onPress]);

  // Determine Right button text
  const actionBtnText = useMemo(() => {
    if (actionType === 'APPLY' || catLower.includes('job')) return 'Apply Now';
    if (actionType === 'RENT' || catLower.includes('rental')) return 'Rent Now';
    if (actionType === 'BOOK_STAY' || catLower.includes('stay') || catLower.includes('hotel') || catLower.includes('resort')) return 'Reserve';
    if (actionType === 'BOOK_TICKET' || catLower.includes('travel') || catLower.includes('flight') || /\bcab\b/i.test(catLower) || /\bbus\b/i.test(catLower)) return 'Book Ticket';
    if (actionType === 'BOOK_SERVICE' || catLower.includes('service') || catLower.includes('health') || catLower.includes('appoint') || catLower.includes('repair') || catLower.includes('clean')) return 'Book Service';
    if (catLower.includes('food') || catLower.includes('dine') || catLower.includes('restaurant')) return 'Order Now';
    return 'Buy Now';
  }, [actionType, catLower]);

  // Determine label next to price block
  const deliveryOrCategoryText = useMemo(() => {
    if (actionType === 'APPLY' || catLower.includes('job')) return (item as any).jobType || (item as any).spec || 'Full-time';
    if (actionType === 'RENT' || catLower.includes('rental')) return 'Flexible Rent';
    if (actionType === 'BOOK_STAY' || catLower.includes('stay') || catLower.includes('hotel') || catLower.includes('resort')) return 'Verified Stay';
    if (actionType === 'BOOK_TICKET' || catLower.includes('travel') || catLower.includes('flight') || /\bcab\b/i.test(catLower) || /\bbus\b/i.test(catLower)) return 'Instant Booking';
    if (actionType === 'BOOK_SERVICE' || catLower.includes('service') || catLower.includes('health') || catLower.includes('appoint') || catLower.includes('repair') || catLower.includes('clean')) return 'Doorstep Service';
    if (catLower.includes('food') || catLower.includes('dine') || catLower.includes('restaurant')) return 'Express Delivery';
    return 'Free Delivery';
  }, [actionType, catLower, item]);

  const rawImage = item.image || (item as any).img || (item as any).photo || (item as any).imageUrl;
  const cardImage = useMemo(() => {
    const resolved = resolveImageUrl(rawImage);
    if (!resolved || resolved.includes('photo-1581578731548') || resolved.includes('photo-1526170375885') || resolved.includes('photo-1528750901443')) {
      return getRelevantProductImage(item.name, (item as any).subcategory || (item as any).subcategoryName, item.category);
    }
    return resolved;
  }, [rawImage, item]);

  const handleAddToCart = useCallback(() => {
    if (!hasCart) {
      handleOpenRespectivePage();
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 150);

    if (isInCart) {
      showToast('Already in your cart', 'View Cart', () => navigation.navigate('Cart'));
    } else {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: cardImage,
      });
      showToast('Added to cart · View Cart', 'View Cart', () => navigation.navigate('Cart'));
    }
  }, [hasCart, handleOpenRespectivePage, isProcessing, isInCart, item, cardImage, navigation, showToast, addToCart]);

  const handleBuyOrBook = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 150);

    if (!hasCart) {
      handleOpenRespectivePage();
      return;
    }

    if (!isInCart) {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: cardImage,
      });
    }

    navigation.navigate('Checkout', { item: { ...item, image: cardImage } });
  }, [isProcessing, hasCart, handleOpenRespectivePage, isInCart, item, cardImage, navigation, addToCart]);

  const fallbackImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#0D1636' : '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0' }]}>
      {/* Product Image Section */}
      <View style={[styles.imgContainer, { backgroundColor: isDark ? '#131F48' : '#F8FAFC' }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.imgTouch}>
          <Image
            source={{ uri: imgError ? fallbackImage : cardImage }}
            style={styles.img}
            onError={() => setImgError(true)}
          />
        </TouchableOpacity>

        {/* Discount Badge */}
        {computedDiscount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>
              {computedDiscount.includes('OFF')
                ? `${computedDiscount.replace('OFF', '').trim()} ${t('OFF')}`
                : t(computedDiscount)}
            </Text>
          </View>
        ) : null}

        {/* Wishlist Heart Chip */}
        <TouchableOpacity
          style={[styles.wishlistChip, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF' }]}
          activeOpacity={0.8}
          onPress={() => {
            if (isGuestUser) {
              useAuthGuardStore.getState().showAuthModal('save items to your wishlist');
              return;
            }
            toggleWishlist({
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category,
              image: cardImage,
            });
          }}
        >
          <Icons.Heart
            color={isWishlisted ? '#EF4444' : isDark ? '#94A3B8' : '#374151'}
            size={15}
            fill={isWishlisted ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Details Container */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.details}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={2}>
          {t(item.name)}
        </Text>

        <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#475569' }]} numberOfLines={1}>
          {item.spec ? t(item.spec) : `${t(item.category)} • ${t('Certified Provider')}`}
        </Text>

        {/* Rating & Assured Badge Row */}
        <View style={styles.ratingRow}>
          <Icons.Star color="#F59E0B" size={12} fill="#F59E0B" />
          <Text style={[styles.ratingText, { color: isDark ? '#F1F5F9' : '#334155' }]}>
            {item.rating || '4.5'} ({item.ratingCount || '320'})
          </Text>
        </View>

        {/* Price Block & Delivery Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.price, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{item.price}</Text>
            {item.originalPrice ? (
              <Text style={[styles.strikePrice, { color: isDark ? '#94A3B8' : '#64748B' }]}>{item.originalPrice}</Text>
            ) : null}
          </View>
          <Text style={[styles.deliveryText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>{t(deliveryOrCategoryText)}</Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Action Row */}
      <View style={styles.actionRow}>
        {hasCart && (
          <TouchableOpacity
            style={[
              styles.cartBtn,
              { backgroundColor: isInCart ? (isDark ? '#064E3B' : '#D1FAE5') : colors.cardBgSecondary, borderColor: colors.cardBorder }
            ]}
            activeOpacity={0.8}
            onPress={handleAddToCart}
            disabled={isProcessing}
          >
            {isInCart ? (
              <Icons.Check color={isDark ? '#34D399' : '#059669'} size={16} strokeWidth={3} />
            ) : (
              <Icons.ShoppingCart color={colors.text} size={16} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.buyBtn,
            { backgroundColor: colors.primary },
            { flex: hasCart ? 1 : undefined, width: hasCart ? undefined : '100%' },
            isProcessing && { opacity: 0.7 }
          ]}
          activeOpacity={0.85}
          onPress={handleBuyOrBook}
          disabled={isProcessing}
        >
          <Text style={[styles.buyBtnText, { color: colors.primaryText }]}>{t(actionBtnText)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ProductCard = React.memo(ProductCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.image === nextProps.item.image
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imgContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imgTouch: {
    width: '100%',
    height: '100%',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  wishlistChip: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  details: {
    marginTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 17,
    minHeight: 34,
  },
  subtitle: {
    fontSize: 10.5,
    marginTop: 2,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  assuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  assuredText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#059669',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceCol: {
    flexDirection: 'column',
  },
  price: {
    fontSize: 15,
    fontWeight: '900',
  },
  strikePrice: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
