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

  const isJob = useMemo(() => {
    const combined = `${catLower} ${(item.name || '').toLowerCase()} ${(item.spec || '').toLowerCase()}`;
    return actionType === 'APPLY' || combined.includes('job') || combined.includes('career') || combined.includes('intern');
  }, [actionType, catLower, item.name, item.spec]);

  const isServiceOrBooking = useMemo(() => {
    const combined = `${catLower} ${(item.name || '').toLowerCase()} ${(item.spec || '').toLowerCase()} ${((item as any).subcategory || '').toLowerCase()}`;
    return (
      actionType === 'BOOK_SERVICE' ||
      actionType === 'BOOK_STAY' ||
      actionType === 'BOOK_TICKET' ||
      combined.includes('service') ||
      combined.includes('stay') ||
      combined.includes('hotel') ||
      combined.includes('resort') ||
      combined.includes('villa') ||
      combined.includes('travel') ||
      combined.includes('flight') ||
      /\bcab\b/i.test(combined) ||
      /\bbus\b/i.test(combined) ||
      combined.includes('technician') ||
      combined.includes('installer') ||
      combined.includes('electric') ||
      combined.includes('plumb') ||
      combined.includes('repair') ||
      combined.includes('clean') ||
      combined.includes('health') ||
      combined.includes('appoint')
    );
  }, [actionType, catLower, item.name, item.spec, item]);

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

    if (isJob) {
      navigation.navigate('JobDetails', { job: item });
      return;
    }

    if (!hasCart) {
      handleOpenRespectivePage();
      return;
    }

    onPress();
  }, [item, isJob, hasCart, handleOpenRespectivePage, navigation, onPress]);

  const rawImage = item.image || (item as any).img || (item as any).photo || (item as any).imageUrl;
  const cardImage = useMemo(() => {
    const resolved = resolveImageUrl(rawImage);
    if (!resolved || resolved.includes('photo-1581578731548') || resolved.includes('photo-1526170375885') || resolved.includes('photo-1528750901443')) {
      return getRelevantProductImage(item.name, (item as any).subcategory || (item as any).subcategoryName, item.category);
    }
    return resolved;
  }, [rawImage, item]);

  // Formatted Subtitle with pipe delimiter (e.g. "Hot & Fresh | Italian", "Private Pool | 5 BHK")
  const formattedSubtitle = useMemo(() => {
    if (item.spec && item.spec.includes('|')) return item.spec;
    const subcat = (item as any).subcategory || (item as any).subcategoryName || '';
    const brandOrCat = (item as any).brand || (item as any).company || item.category || '';
    if (subcat && brandOrCat && subcat.toLowerCase() !== brandOrCat.toLowerCase()) {
      return `${subcat} | ${brandOrCat}`;
    }
    if (item.spec) return item.spec;
    if (isJob) return `${(item as any).company || 'Verified Employer'} | ${(item as any).location || 'India'}`;
    return `${item.category} • Quality Assured`;
  }, [item, isJob]);

  // Handlers
  const handleApplyNow = useCallback(() => {
    if (isGuestUser) {
      useAuthGuardStore.getState().showAuthModal('apply for this job position');
      return;
    }
    navigation.navigate('JobDetails', { job: item, openApplySheet: true });
  }, [isGuestUser, navigation, item]);

  const handleAddToCart = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 200);

    if (isJob || !hasCart) {
      showToast('Jobs are application-only', 'Apply Now', () => handleApplyNow());
      return;
    }

    if (isInCart) {
      showToast('Already in your cart', 'View Cart', () => navigation.navigate('Cart'));
    } else {
      addToCart({
        id: item.id,
        productId: item.id,
        vendorId: (item as any).vendorId || (item as any).vendor_id,
        vendor_id: (item as any).vendorId || (item as any).vendor_id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice || (item as any).mrp,
        mrp: (item as any).mrp || item.originalPrice,
        category: item.category,
        image: cardImage,
        seller: (item as any).vendorName || (item as any).vendor || (item as any).company || (item as any).seller,
        vehicleNumber: (item as any).vehicleNumber || (item as any).vehicleRegNo || (item as any).busNumber,
      });
      showToast('Added to cart · View Cart', 'View Cart', () => navigation.navigate('Cart'));
    }
  }, [isProcessing, isJob, hasCart, isInCart, item, cardImage, navigation, showToast, addToCart, handleApplyNow]);

  const handleBuyNow = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 200);

    if (!isInCart) {
      addToCart({
        id: item.id,
        productId: item.id,
        vendorId: (item as any).vendorId || (item as any).vendor_id,
        vendor_id: (item as any).vendorId || (item as any).vendor_id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: cardImage,
      });
    }

    navigation.navigate('Checkout', { item: { ...item, image: cardImage } });
  }, [isProcessing, isInCart, item, cardImage, navigation, addToCart]);

  const handleBookNow = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 200);
    handleOpenRespectivePage();
  }, [isProcessing, handleOpenRespectivePage]);

  const fallbackImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';
  const reviewsCount = (item as any).reviews || (item as any).reviewsCount || item.ratingCount || '120';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#0D1636' : '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#F1EAD8' }]}>
      {/* Product Image Section */}
      <View style={[styles.imgContainer, { backgroundColor: isDark ? '#131F48' : '#FAF6ED' }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.imgTouch}>
          <Image
            source={{ uri: imgError ? fallbackImage : cardImage }}
            style={styles.img}
            onError={() => setImgError(true)}
          />
        </TouchableOpacity>

        {/* Top-Left Badge: Green Job Type Badge or Red Discount Badge */}
        {isJob ? (
          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeText}>
              {(item as any).jobType || (item as any).employmentType || 'Full Time'}
            </Text>
          </View>
        ) : computedDiscount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>
              {computedDiscount.includes('OFF')
                ? `${computedDiscount.replace('OFF', '').trim()} ${t('OFF')}`
                : t(computedDiscount)}
            </Text>
          </View>
        ) : null}

        {/* Floating Rating Pill at Bottom-Left of Image */}
        <View style={styles.ratingPill}>
          <Icons.Star color="#F59E0B" size={10} fill="#F59E0B" />
          <Text style={styles.ratingScore}>{item.rating || '4.5'}</Text>
          <Text style={styles.ratingCount}>({reviewsCount} reviews)</Text>
        </View>

        {/* Wishlist Heart Chip */}
        <TouchableOpacity
          style={[styles.wishlistChip, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#FFFFFF' }]}
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
            color={isWishlisted ? '#EF4444' : isDark ? '#94A3B8' : '#475569'}
            size={14}
            fill={isWishlisted ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Details Container */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.details}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
          {t(item.name)}
        </Text>

        <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#64748B' }]} numberOfLines={1}>
          {formattedSubtitle}
        </Text>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{item.price}</Text>
          {item.originalPrice ? (
            <Text style={[styles.strikePrice, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>{item.originalPrice}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Category-Specific Action Buttons */}
      <View style={styles.actionRow}>
        {isJob ? (
          /* Jobs: Single Full-Width Primary Button "Apply Now" */
          <TouchableOpacity
            style={styles.fullPrimaryBtn}
            activeOpacity={0.85}
            onPress={handleApplyNow}
            disabled={isProcessing}
          >
            <Icons.Send color="#FFFFFF" size={12} strokeWidth={2.5} />
            <Text style={styles.fullPrimaryBtnText}>{t('Apply Now')}</Text>
          </TouchableOpacity>
        ) : isServiceOrBooking ? (
          /* Services / Travel / Stay: Two Buttons "Add to Cart" + "Book Now" */
          <>
            <TouchableOpacity
              style={[
                styles.outlineBtn,
                isInCart ? { borderColor: '#16A34A', backgroundColor: isDark ? '#064E3B' : '#DCFCE7' } : { borderColor: '#FF6A00' }
              ]}
              activeOpacity={0.85}
              onPress={handleAddToCart}
              disabled={isProcessing}
            >
              {isInCart ? (
                <>
                  <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                  <Text style={[styles.outlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>{t('Added')}</Text>
                </>
              ) : (
                <>
                  <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                  <Text style={styles.outlineBtnText} numberOfLines={1}>{t('Add to Cart')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleBookNow}
              disabled={isProcessing}
            >
              <Icons.Calendar color="#FFFFFF" size={11} strokeWidth={2.5} />
              <Text style={styles.primaryBtnText} numberOfLines={1}>{t('Book Now')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Products / Daily Needs / Food: Two Buttons "Add to Cart" + "Buy Now" */
          <>
            <TouchableOpacity
              style={[
                styles.outlineBtn,
                isInCart ? { borderColor: '#16A34A', backgroundColor: isDark ? '#064E3B' : '#DCFCE7' } : { borderColor: '#FF6A00' }
              ]}
              activeOpacity={0.85}
              onPress={handleAddToCart}
              disabled={isProcessing}
            >
              {isInCart ? (
                <>
                  <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                  <Text style={[styles.outlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>{t('Added')}</Text>
                </>
              ) : (
                <>
                  <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                  <Text style={styles.outlineBtnText} numberOfLines={1}>{t('Add to Cart')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleBuyNow}
              disabled={isProcessing}
            >
              <Icons.Zap color="#FFFFFF" size={11} strokeWidth={2.5} fill="#FFFFFF" />
              <Text style={styles.primaryBtnText} numberOfLines={1}>{t('Buy Now')}</Text>
            </TouchableOpacity>
          </>
        )}
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 8.5,
    marginBottom: 14,
    shadowColor: '#7A6B58',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2.5,
  },
  imgContainer: {
    position: 'relative',
    width: '100%',
    height: 124,
    borderRadius: 13,
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
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 2,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  jobBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 2,
  },
  jobBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wishlistChip: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 2,
  },
  ratingPill: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
  },
  ratingScore: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  details: {
    marginTop: 7,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 10.5,
    marginTop: 1.5,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 6,
  },
  price: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  strikePrice: {
    fontSize: 10.5,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  outlineBtn: {
    flex: 1,
    height: 31,
    borderRadius: 7,
    borderWidth: 1.4,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  outlineBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF6A00',
  },
  primaryBtn: {
    flex: 1,
    height: 31,
    borderRadius: 7,
    backgroundColor: '#FF6A00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  primaryBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fullPrimaryBtn: {
    width: '100%',
    height: 32,
    borderRadius: 7,
    backgroundColor: '#FF6A00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  fullPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
