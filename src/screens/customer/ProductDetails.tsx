import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useCartStore, isCartableCategory } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useToastStore } from '../../store/toastStore';
import { useActivityStore } from '../../store/activityStore';
import { apiFetch, resolveImageUrl } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getRelevantProductImage } from '../../utils/productImages';
import { openRespectivePage } from '../../utils/navigationHelpers';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useTranslation } from '../../store/languageStore';

export interface ProductVariantOption {
  id: string;
  name: string;
  priceDiff?: number;
  inStock?: boolean;
}

export interface ProductVariant {
  id: string;
  type: string;
  label: string;
  options: ProductVariantOption[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  mainCategory?: string;
  subNavbarCategory?: string;
  image: string;
  gallery?: string[];
  description?: string;
  price: number;
  mrp?: number;
  discountPercent?: number;
  rating?: number;
  ratingCount?: string;
  assured?: boolean;
  availability?: string;
  deliveryInfo?: string;
  seller?: {
    name: string;
    rating?: string;
    verified?: boolean;
    location?: string;
  };
  warranty?: string;
  highlights?: string[];
  specifications?: Array<{ label: string; val: string }>;
  variants?: ProductVariant[];
  vehicleNumber?: string;
  vehicleRegNo?: string;
  busNumber?: string;
  unit?: string;
  foodType?: string;
  isVeg?: boolean;
  cuisine?: string;
}

export const calculatePrices = (item: any) => {
  let price = Number(item?.price || 0);
  if (isNaN(price)) {
    price = parseInt(String(item?.price || '0').replace(/[^\d]/g, ''), 10) || 0;
  }
  let originalPrice = Number(item?.originalPrice || item?.mrp || item?.original_price || 0);
  if (isNaN(originalPrice) || originalPrice === 0) {
    originalPrice = parseInt(String(item?.originalPrice || item?.mrp || '0').replace(/[^\d]/g, ''), 10) || 0;
  }

  let discountVal = item?.discountPercent || item?.discountPercentage;
  if (!discountVal && typeof item?.discount === 'string') {
    const match = item.discount.match(/(\d+)/);
    if (match) discountVal = parseFloat(match[1]);
  } else if (!discountVal && typeof item?.discount === 'number') {
    discountVal = item.discount;
  }

  if (originalPrice > 0 && price > originalPrice) {
    const temp = price;
    price = originalPrice;
    originalPrice = temp;
  } else if ((!originalPrice || originalPrice <= price) && price > 0 && discountVal > 0 && discountVal < 100) {
    originalPrice = Math.round(price / (1 - discountVal / 100));
  }

  const discountPercent = (originalPrice > price && originalPrice > 0)
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : (discountVal || 0);

  return {
    price,
    mrp: originalPrice > price ? originalPrice : undefined,
    discountPercent,
  };
};

export const extractAllImages = (data: any, raw: any, fallback: string): string[] => {
  const list: any[] = [];
  if (data?.images && Array.isArray(data.images)) {
    data.images.forEach((img: any) => {
      if (typeof img === 'string') list.push(img);
      else if (img && typeof img === 'object') list.push(img.url || img.src || img.uri || img.image || '');
    });
  }
  if (data?.imageUrls && Array.isArray(data.imageUrls)) list.push(...data.imageUrls);
  if (data?.gallery && Array.isArray(data.gallery)) list.push(...data.gallery);
  if (data?.image) list.push(data.image);
  if (data?.imageUrl) list.push(data.imageUrl);

  if (raw?.images && Array.isArray(raw.images)) {
    raw.images.forEach((img: any) => {
      if (typeof img === 'string') list.push(img);
      else if (img && typeof img === 'object') list.push(img.url || img.src || img.uri || img.image || '');
    });
  }
  if (raw?.imageUrls && Array.isArray(raw.imageUrls)) list.push(...raw.imageUrls);
  if (raw?.gallery && Array.isArray(raw.gallery)) list.push(...raw.gallery);
  if (raw?.image) list.push(raw.image);
  if (raw?.imageUrl) list.push(raw.imageUrl);

  const cleaned = list
    .map((item) => {
      if (!item || typeof item !== 'string') return '';
      const s = item.trim();
      if (!s) return '';
      return resolveImageUrl(s);
    })
    .filter((url) => Boolean(url && typeof url === 'string' && url.length > 5));

  const deduplicated = Array.from(new Set(cleaned));
  return deduplicated.length > 0 ? deduplicated : [fallback];
};

export const getCanonicalVertical = (item: any): 'Services' | 'Products' | 'Daily Needs' | 'Food' | 'Stay' | 'Travel' | 'Jobs' => {
  if (!item) return 'Products';
  const raw = [
    item.mainCategory,
    item.subNavbarCategory,
    item.category,
    item.subcategory,
    item.subCategory,
    item.tag,
    item.type,
  ].filter(Boolean).join(' ').toLowerCase().trim();

  if (raw.includes('stay') || ['hotel', 'hotels', 'homestay', 'resort', 'resorts', 'villa', 'villas', 'pg', 'hostel', 'apartment', 'guest house', 'room'].some(k => raw.includes(k))) return 'Stay';
  if (raw.includes('food') || ['restaurant', 'dining', 'bakery', 'biryani', 'catering', 'sweets', 'ice cream', 'fast food', 'beverage', 'juice', 'south indian', 'north indian', 'chinese', 'continental', 'dessert', 'snack', 'thali', 'dosa', 'parotta', 'pizza', 'burger', 'cafe'].some(k => raw.includes(k))) return 'Food';
  if (raw.includes('daily need') || ['grocery', 'groceries', 'supermarket', 'vegetable', 'vegetables', 'fruits', 'fruit', 'rice', 'eggs', 'milk', 'dairy', 'pharmacy', 'medicine', 'organic', 'staples', 'personal care', 'provisions'].some(k => raw.includes(k))) return 'Daily Needs';
  if (raw.includes('job') || ['hiring', 'recruitment', 'career', 'careers', 'it jobs', 'full time', 'part time', 'opening', 'vacancy', 'employment'].some(k => raw.includes(k))) return 'Jobs';
  if (raw.includes('service') || ['hospital', 'doctor', 'clinic', 'repair', 'plumbing', 'plumber', 'plumbers', 'electrician', 'cleaning', 'salon', 'spa', 'fitness', 'gym', 'education', 'carpentry', 'carpenter', 'painter', 'home care', 'pest control', 'laundry', 'appliance'].some(k => raw.includes(k))) return 'Services';
  if (raw.includes('travel') || ['tour', 'tours', 'cab', 'cabs', 'taxi', 'bus', 'buses', 'flight', 'train', 'car rental'].some(k => raw.includes(k))) return 'Travel';

  return 'Products';
};

export const calculateDiscount = (mrp?: number, price?: number): number => {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};


export default function ProductDetails() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { width } = useWindowDimensions();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const showToast = useToastStore((state) => state.showToast);

  const routeParams = (route.params as any) || {};
  const rawItem = routeParams.item || routeParams.product;
  const categoryParam = routeParams.category || rawItem?.category;

  const defaultFallbackImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80';

  const extractImage = (data: any): string => {
    if (!data) return getRelevantProductImage(rawItem?.name, rawItem?.subcategory || rawItem?.subCategory || rawItem?.subcategoryName, categoryParam || rawItem?.category);
    let img = '';
    if (typeof data.image === 'string' && data.image.trim()) img = data.image.trim();
    else if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) img = data.imageUrl.trim();
    else if (typeof data.img === 'string' && data.img.trim()) img = data.img.trim();
    else if (typeof data.photo === 'string' && data.photo.trim()) img = data.photo.trim();
    else if (Array.isArray(data.gallery) && data.gallery.length > 0 && typeof data.gallery[0] === 'string' && data.gallery[0].trim()) {
      img = data.gallery[0].trim();
    }

    if (!img) {
      return getRelevantProductImage(data.name || rawItem?.name, data.subcategory || data.subCategory || rawItem?.subcategory, categoryParam || data.category || rawItem?.category);
    }
    return resolveImageUrl(img);
  };

  const [imageError, setImageError] = useState(false);

  const [product, setProduct] = useState<Product>(() => {
    const { price: rawPrice, mrp: rawMrp, discountPercent } = calculatePrices(rawItem);
    const initialGallery = extractAllImages(null, rawItem, defaultFallbackImage);
    const initialImg = initialGallery[0] || defaultFallbackImage;

    return {
      id: rawItem?.id || rawItem?._id || routeParams?.productId || `prod_${Date.now()}`,
      name: rawItem?.name || rawItem?.title || '',
      brand: rawItem?.brand || rawItem?.vendor || undefined,
      category: categoryParam || rawItem?.category || rawItem?.mainCategory || 'Products',
      subcategory: rawItem?.subcategory || rawItem?.subCategory || undefined,
      mainCategory: rawItem?.mainCategory,
      subNavbarCategory: rawItem?.subNavbarCategory,
      image: initialImg,
      gallery: initialGallery,
      description: rawItem?.desc || rawItem?.description || '',
      price: rawPrice,
      mrp: rawMrp,
      discountPercent,
      rating: rawItem?.rating ? parseFloat(String(rawItem.rating)) : 0,
      ratingCount: rawItem?.ratingCount ? String(rawItem.ratingCount) : '0',
      assured: Boolean(rawItem?.isAssured || rawItem?.assured),
      availability: rawItem?.availability || 'In Stock',
      deliveryInfo: rawItem?.deliveryInfo || '',
      seller: rawItem?.seller || (rawItem?.vendor ? { name: rawItem.vendor, verified: true } : { name: 'Verified Partner', verified: true }),
      warranty: rawItem?.warranty || undefined,
      highlights: rawItem?.highlights && rawItem.highlights.length > 0 ? rawItem.highlights : (rawItem?.spec ? [rawItem.spec] : []),
      specifications: rawItem?.specifications && rawItem.specifications.length > 0 ? rawItem.specifications : (rawItem?.spec ? [{ label: 'Specification', val: rawItem.spec }] : []),
      variants: rawItem?.variants || undefined,
      vehicleNumber: rawItem?.vehicleNumber || rawItem?.vehicleRegNo || rawItem?.busNumber,
      unit: rawItem?.unit,
      foodType: rawItem?.foodType || rawItem?.cuisine,
      isVeg: rawItem?.isVeg ?? (rawItem?.vegNonVeg === 'veg' || rawItem?.foodType === 'veg'),
      cuisine: rawItem?.cuisine || rawItem?.foodType,
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch full details from MongoDB Atlas silently in the background
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    const pId = rawItem?.id || rawItem?._id || routeParams.productId;
    if (!pId) return;
    setRefreshing(true);
    try {
      const res = await apiFetch(`/products/${pId}`, { skipCache: true });
      if (res && (res.data || res.product)) {
        const productData = res.data || res.product;
        setProduct((prev) => {
          const { price: livePrice, mrp: liveMrp, discountPercent } = calculatePrices(productData);
          const liveGallery = extractAllImages(productData, prev, defaultFallbackImage);
          const finalImg = liveGallery[0] || prev.image || defaultFallbackImage;

          return {
            ...prev,
            ...productData,
            price: livePrice > 0 ? livePrice : prev.price,
            mrp: liveMrp || prev.mrp,
            discountPercent: discountPercent || prev.discountPercent,
            image: finalImg,
            gallery: liveGallery,
            unit: productData.unit || prev.unit,
            foodType: productData.foodType || prev.foodType,
            isVeg: productData.isVeg ?? prev.isVeg,
            cuisine: productData.cuisine || prev.cuisine,
          };
        });
      }
    } catch (err) {
      console.warn('[ProductDetails] onRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [rawItem?.id, rawItem?._id, routeParams.productId]);

  useEffect(() => {
    let isCurrent = true;
    const fetchLiveProduct = async () => {
      const pId = rawItem?.id || rawItem?._id || routeParams.productId;
      if (pId) {
        setIsSyncing(true);
        try {
          const res = await apiFetch(`/products/${pId}`);
          if (isCurrent && res && (res.data || res.product)) {
            const productData = res.data || res.product;
            setProduct((prev) => {
              const { price: livePrice, mrp: liveMrp, discountPercent } = calculatePrices(productData);
              const liveGallery = extractAllImages(productData, prev, defaultFallbackImage);
              const finalImg = liveGallery[0] || prev.image || defaultFallbackImage;

              return {
                ...prev,
                ...productData,
                price: livePrice > 0 ? livePrice : prev.price,
                mrp: liveMrp || prev.mrp,
                discountPercent: discountPercent || prev.discountPercent,
                image: finalImg,
                gallery: liveGallery,
                unit: productData.unit || prev.unit,
                foodType: productData.foodType || prev.foodType,
                isVeg: productData.isVeg ?? prev.isVeg,
                cuisine: productData.cuisine || prev.cuisine,
              };
            });
          }
        } catch (err) {
          console.warn('[ProductDetails] Background fetch error (using cached UI data):', err);
        } finally {
          if (isCurrent) setIsSyncing(false);
        }
      }
    };
    fetchLiveProduct();
    return () => { isCurrent = false; };
  }, [rawItem?.id, rawItem?._id, routeParams.productId]);

  // Record Activity View
  useEffect(() => {
    if (product) {
      useActivityStore.getState().recordProductView({
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        price: `₹${product.price.toLocaleString('en-IN')}`,
        vendor: product.seller?.name || product.brand,
      });
    }
  }, [product?.id]);

  // State for active image gallery thumb and selected variant options
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<{ [variantId: string]: ProductVariantOption }>({});

  // Initialize default selected variants
  useEffect(() => {
    if (product?.variants) {
      const initialMap: { [variantId: string]: ProductVariantOption } = {};
      product.variants.forEach((v) => {
        if (v.options && v.options.length > 0) {
          initialMap[v.id] = v.options[0];
        }
      });
      setSelectedVariantOptions(initialMap);
    }
  }, [product?.id]);

  // Compute total price modifications from selected variants
  let extraPrice = 0;
  Object.values(selectedVariantOptions).forEach((opt) => {
    if (opt.priceDiff) extraPrice += opt.priceDiff;
  });

  const unitSellingPrice = Math.max(0, product.price + extraPrice);
  const unitMrp = product.mrp ? product.mrp + extraPrice : undefined;
  const totalPrice = unitSellingPrice * qty;

  const computedDiscountPct = product.discountPercent || calculateDiscount(unitMrp, unitSellingPrice);

  const gallery = (Array.isArray(product.gallery) && product.gallery.filter(Boolean).length > 0)
    ? product.gallery.filter(Boolean)
    : [product.image || defaultFallbackImage];

  const activeImage = gallery[selectedThumb] || gallery[0] || product.image || defaultFallbackImage;

  const isFavorite = wishlistItems.some((i) => i.id === product.id);
  const isInCart = cartItems.some((i) => i.id === product.id);

  // Construct label for variants
  const selectedVariantSummary = Object.values(selectedVariantOptions)
    .map((opt) => opt.name)
    .join(' / ');

  const fullCartItemName = selectedVariantSummary
    ? `${product.name} (${selectedVariantSummary})`
    : product.name;

  const canonicalVertical = useMemo(() => {
    return getCanonicalVertical(product || rawItem);
  }, [product, rawItem]);

  const catLower = (product?.category || '').toLowerCase().trim();
  const hasCart = isCartableCategory(product?.category, product?.name);

  // Determine Right button text
  let actionBtnText = 'Buy Now';
  if (canonicalVertical === 'Jobs') {
    actionBtnText = 'Apply Now';
  } else if (canonicalVertical === 'Stay') {
    actionBtnText = 'Reserve / Book Stay';
  } else if (canonicalVertical === 'Travel') {
    actionBtnText = 'Book Ticket';
  } else if (canonicalVertical === 'Services') {
    actionBtnText = 'Book Service';
  } else if (canonicalVertical === 'Food') {
    actionBtnText = 'Order Now';
  } else if (canonicalVertical === 'Daily Needs') {
    actionBtnText = 'Buy Now';
  }

  const handleAddToCart = () => {
    if (!hasCart) return;
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 150);

    if (isInCart) {
      showToast('Already in your cart', 'View Cart', () =>
        navigation.navigate('Cart')
      );
    } else {
      addToCart({
        id: product!.id,
        productId: product!.id,
        vendorId: (product as any).vendorId || (product as any).vendor_id,
        vendor_id: (product as any).vendorId || (product as any).vendor_id,
        name: fullCartItemName,
        price: `₹${unitSellingPrice.toLocaleString('en-IN')}`,
        originalPrice: product.mrp || (product as any).originalPrice,
        mrp: product.mrp || (product as any).originalPrice,
        quantity: qty,
        category: product!.category,
        image: activeImage,
        seller: (product as any).vendorName || (product as any).brand || (product as any).vendor,
        vehicleNumber: (product as any).vehicleNumber || (product as any).vehicleRegNo || (product as any).busNumber,
      });
      showToast('Added to cart · View Cart', 'View Cart', () =>
        navigation.navigate('Cart')
      );
    }
  };

  const handleBuyNow = () => {
    if (!hasCart) {
      openRespectivePage(navigation, product);
      return;
    }

    const authUser = useAuthStore.getState().currentUser;
    if (!isUserAuthenticated(authUser)) {
      useAuthStore.getState().setPendingPurchaseProduct({
        ...product,
        quantity: qty,
        actionType: 'buy_now',
        returnScreen: 'ProductDetails',
      });
      useAuthGuardStore.getState().showAuthModal('place an order or purchase this item');
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 150);

    const prodOriginalPrice = product.mrp || (product as any).originalPrice;

    if (hasCart && !isInCart) {
      addToCart({
        id: product!.id,
        name: fullCartItemName,
        price: `₹${unitSellingPrice.toLocaleString('en-IN')}`,
        originalPrice: prodOriginalPrice,
        mrp: prodOriginalPrice,
        quantity: qty,
        category: product!.category,
        image: activeImage,
      });
    }

    const isJob = catLower.includes('job');

    if (isJob) {
      // Jobs are 100% free - no payment required
      navigation.navigate('BookingConfirmation', {
        bookingId: `JOB-APP-${Date.now().toString().slice(-6)}`,
        items: [
          {
            name: fullCartItemName,
            price: 'Free',
            category: 'Jobs',
            image: activeImage,
          },
        ],
        totalAmount: 0,
        paymentMethod: 'Free Application (No Payment)',
        type: 'service',
        date: 'Application Submitted',
      });
      return;
    }

    // All paid transactions (Products, Daily Needs, Food, Services, Stay/Travel) go through Checkout where Razorpay Test Mode processes payment
    navigation.navigate('Checkout', {
      item: {
        id: product!.id,
        name: fullCartItemName,
        price: `₹${unitSellingPrice.toLocaleString('en-IN')}`,
        originalPrice: prodOriginalPrice,
        mrp: prodOriginalPrice,
        category: product!.category,
        image: activeImage,
        quantity: qty,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBg}
        translucent={false}
      />
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.cardBorder, paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icons.ChevronLeft color={colors.icon} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]} numberOfLines={1}>
          {canonicalVertical === 'Services'
            ? t('Service Details')
            : canonicalVertical === 'Food'
            ? t('Food Details')
            : canonicalVertical === 'Daily Needs'
            ? t('Item Details')
            : canonicalVertical === 'Stay'
            ? t('Stay Details')
            : canonicalVertical === 'Travel'
            ? t('Travel Details')
            : t('Product Details')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              toggleWishlist({
                id: product!.id,
                name: product!.name,
                price: `₹${unitSellingPrice.toLocaleString('en-IN')}`,
                category: product!.category,
                image: activeImage,
              })
            }
          >
            <Icons.Heart
              color={isFavorite ? '#EF4444' : colors.icon}
              fill={isFavorite ? '#EF4444' : 'transparent'}
              size={20}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <Icons.ShoppingCart color={colors.icon} size={20} />
            {cartItems.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || '#FF6A00']}
            tintColor={colors.primary || '#FF6A00'}
          />
        }
      >
        {/* Gallery Main Banner */}
        <View style={[styles.imageContainer, { backgroundColor: isDark ? '#050B1E' : '#FFFFFF', width, height: width * 0.78 }]}>
          <Image
            source={{
              uri: !imageError
                ? resolveImageUrl(gallery[selectedThumb] || activeImage)
                : (getRelevantProductImage(product.name, product.category, product.category) || defaultFallbackImage)
            }}
            style={styles.mainImg}
            onError={() => {
              console.warn('[ProductDetails] Failed loading product image, falling back to default.');
              setImageError(true);
            }}
          />
          {gallery.length > 1 && (
            <View style={styles.galleryCounter}>
              <Text style={styles.galleryCounterText}>
                {selectedThumb + 1}/{gallery.length}
              </Text>
            </View>
          )}
        </View>

        {/* Gallery Thumbnails */}
        {gallery.length > 1 && (
          <View style={[styles.thumbRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.cardBorder }]}>
            {gallery.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.thumb, { borderColor: colors.cardBorder }, selectedThumb === idx && { borderColor: colors.primary }]}
                onPress={() => {
                  setImageError(false);
                  setSelectedThumb(idx);
                }}
              >
                <Image source={{ uri: resolveImageUrl(img || activeImage) }} style={styles.thumbImg} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.content}>
          {/* Category Breadcrumbs & Badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <View style={{ backgroundColor: isDark ? 'rgba(245, 184, 0, 0.15)' : '#FFF8E6', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(245, 184, 0, 0.3)' : '#FDE68A' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#F5B800' : '#B45309', textTransform: 'uppercase' }}>
                {canonicalVertical}
              </Text>
            </View>
            {Boolean(product.subcategory || product.category) && (
              <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext }}>
                  {product.subcategory || product.category}
                </Text>
              </View>
            )}
            {canonicalVertical === 'Food' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: product.isVeg ? (isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2'), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: product.isVeg ? '#A7F3D0' : '#FECACA' }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: product.isVeg ? '#059669' : '#DC2626', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: product.isVeg ? '#059669' : '#DC2626' }} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: product.isVeg ? '#059669' : '#DC2626' }}>
                  {product.isVeg ? 'PURE VEG' : 'NON-VEG'}
                </Text>
              </View>
            )}
            {Boolean(product.unit) && (
              <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? colors.cardBorder : '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                  {product.unit}
                </Text>
              </View>
            )}
          </View>

          {/* Brand & Title */}
          {product.brand && (
            <Text style={[styles.brandText, { color: colors.primary }]}>{product.brand.toUpperCase()}</Text>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{product.name}</Text>
          {(product.vehicleNumber || product.vehicleRegNo || product.busNumber) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A' }}>
                <Icons.ShieldCheck size={11} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#FCD34D' : '#92400E', letterSpacing: 0.5 }}>
                  Vehicle Reg: {product.vehicleNumber || product.vehicleRegNo || product.busNumber}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Rating & Availability Badges */}
          <View style={styles.metaRow}>
            {product.rating ? (
              <View style={[styles.ratingBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)' }]}>
                <Icons.Star color="#F59E0B" size={13} fill="#F59E0B" />
                <Text style={styles.ratingText}>
                  {product.rating} {product.ratingCount ? `(${product.ratingCount} reviews)` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Pricing Block */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>₹{unitSellingPrice.toLocaleString('en-IN')}</Text>
            {unitMrp && unitMrp > unitSellingPrice && (
              <Text style={[styles.strikePrice, { color: colors.muted }]}>₹{unitMrp.toLocaleString('en-IN')}</Text>
            )}
            {computedDiscountPct > 0 && (
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>{computedDiscountPct}% OFF</Text>
              </View>
            )}
          </View>

          {/* Delivery / Fulfilment Information */}
          <Text style={[styles.subtext, { color: colors.subtext }]}>
            {t(product.deliveryInfo || (
              canonicalVertical === 'Services'
                ? 'Standard 60-minute doorstep arrival with guaranteed satisfaction'
                : canonicalVertical === 'Food'
                ? 'Express 30-45 mins doorstep food delivery'
                : canonicalVertical === 'Daily Needs'
                ? 'Same-day fresh delivery direct to your home'
                : 'Free delivery available for Connect Members'
            ))}
          </Text>

          {/* Trust Features Row tailored per vertical */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: isDark ? colors.cardBorder : '#F1EAD8' }}>
            {canonicalVertical === 'Services' ? (
              <>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.MapPin color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Doorstep</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Verified expert visit</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.ShieldCheck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>30 Days Warranty</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Free service re-work</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Clock color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>60 Mins Arrival</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Punctual doorstep</Text>
                </View>
              </>
            ) : canonicalVertical === 'Food' ? (
              <>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Clock color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>30-45 Mins</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Express delivery</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.ShieldCheck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>FSSAI Hygienic</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Sanitized kitchen</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Package color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Hot & Fresh</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Insulated packing</Text>
                </View>
              </>
            ) : canonicalVertical === 'Daily Needs' ? (
              <>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Sparkles color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Farm Fresh</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>100% Quality checked</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Truck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Same Day</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Direct from stores</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.ShieldCheck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Best Value</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Wholesale pricing</Text>
                </View>
              </>
            ) : canonicalVertical === 'Travel' ? (
              <>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Clock color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>On-Time Trip</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Punctual schedule</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.ShieldCheck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Sanitized Ride</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Clean & comfortable</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.CheckCircle color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Instant E-Ticket</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Confirmed seat</Text>
                </View>
              </>
            ) : (
              <>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.Truck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>Free Delivery</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Orders over ₹499</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.RotateCcw color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>7 Days Return</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Easy replacement</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Icons.ShieldCheck color="#FF6A00" size={20} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4 }}>100% Secure</Text>
                  <Text style={{ fontSize: 9.5, color: '#64748B' }}>Verified Payment</Text>
                </View>
              </>
            )}
          </View>

          {/* Product Category Specific Variants */}
          {product.variants && product.variants.length > 0 ? (
            product.variants.map((variant) => (
              <View key={variant.id} style={styles.variantSection}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>{variant.label}</Text>
                <View style={styles.variantRow}>
                  {variant.options.map((opt) => {
                    const isSelected = selectedVariantOptions[variant.id]?.id === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.variantCard,
                          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                          isSelected && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(244, 196, 0, 0.2)' : 'rgba(244, 196, 0, 0.12)' }
                        ]}
                        onPress={() =>
                          setSelectedVariantOptions((prev) => ({ ...prev, [variant.id]: opt }))
                        }
                      >
                        <Text style={[styles.variantText, { color: isSelected ? colors.text : colors.subtext }, isSelected && { fontWeight: 'bold' }]}>
                          {opt.name}
                        </Text>
                        {opt.priceDiff ? (
                          <Text style={styles.variantDiffText}>
                            {opt.priceDiff > 0 ? `+₹${opt.priceDiff}` : `-₹${Math.abs(opt.priceDiff)}`}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : null}

          {/* Quantity or Passenger Selector */}
          {(catLower.includes('travel') || /\bbus\b/i.test(catLower) || /\bbus ticket\b/i.test(product?.name || '') || /\bbus travel\b/i.test(product?.name || '')) && !catLower.includes('fruit') && !catLower.includes('food') && !catLower.includes('product') && !catLower.includes('daily') ? (
            <View style={styles.sectionMargin}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('Select Passengers / Seats')}</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '👤 1 Person', count: 1, tag: 'Single Seat' },
                  { label: '👥 2 Persons', count: 2, tag: 'Double Seats' },
                  { label: '👨‍👩‍👧‍👦 Family (4 Persons)', count: 4, tag: 'Family Group' },
                ].map((passOpt) => {
                  const isSelected = qty === passOpt.count;
                  return (
                    <TouchableOpacity
                      key={passOpt.count}
                      style={[
                        styles.variantCard,
                        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                        isSelected && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(244, 196, 0, 0.2)' : 'rgba(244, 196, 0, 0.12)' }
                      ]}
                      onPress={() => setQty(passOpt.count)}
                    >
                      <Text style={[styles.variantText, { color: isSelected ? colors.text : colors.subtext }, isSelected && { fontWeight: 'bold' }]}>
                        {passOpt.label}
                      </Text>
                      <Text style={styles.variantDiffText}>
                        ₹{(unitSellingPrice * passOpt.count).toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={[styles.qtyContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Text style={[styles.qtyLabel, { color: colors.text }]}>{t('Quantity:')}</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.cardBgSecondary, borderColor: colors.cardBorder }]}
                  onPress={() => setQty(Math.max(1, qty - 1))}
                >
                  <Icons.Minus color={colors.text} size={16} />
                </TouchableOpacity>
                <Text style={[styles.qtyVal, { color: colors.text }]}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.cardBgSecondary, borderColor: colors.cardBorder }]}
                  onPress={() => setQty(qty + 1)}
                >
                  <Icons.Plus color={colors.text} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description / Overview */}
          <View style={styles.sectionMargin}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {canonicalVertical === 'Services' ? t('About Service') : (canonicalVertical === 'Food' ? t('About Food') : (canonicalVertical === 'Daily Needs' ? t('About Product') : t('Product Overview')))}
            </Text>
            <Text style={[styles.descText, { color: colors.subtext, lineHeight: 20 }]}>
              {t(product.description || (
                canonicalVertical === 'Services'
                  ? `Professional doorstep ${product.name} service performed by background-verified and experienced specialists with specialized tools and guaranteed satisfaction.`
                  : (canonicalVertical === 'Food'
                      ? `Delicious and authentic ${product.name} prepared fresh to order using finest ingredients in a certified hygienic kitchen.`
                      : (canonicalVertical === 'Daily Needs'
                          ? `Freshly sourced high quality ${product.name} carefully selected, inspected, and delivered directly to your home.`
                          : `High quality ${product.name} backed by authorized vendor assurance and verified Connect App standards.`))
              ))}
            </Text>
          </View>

          {/* Highlights */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            {canonicalVertical === 'Services' ? t('Service Highlights') : (canonicalVertical === 'Food' ? t('Food Highlights') : t('Highlights & Features'))}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {(product.highlights && product.highlights.length > 0
              ? product.highlights
              : (canonicalVertical === 'Services'
                  ? [
                      'Certified & Background-Verified Specialists',
                      'Upfront & Transparent Pricing with Zero Hidden Charges',
                      '30-Day Service Guarantee & Re-work Assurance',
                      'Genuine Spare Parts & Professional Equipment',
                      'Punctual Doorstep Service with Post-Work Cleanup',
                    ]
                  : (canonicalVertical === 'Food'
                      ? [
                          '100% Fresh & Authentic Ingredients',
                          'Freshly Prepared Upon Order Placement',
                          'Hygienic Kitchen Preparation & FSSAI Standards',
                          'Spill-Proof & Temperature-Retaining Packaging',
                          'Contactless Express Delivery Within 30-45 Mins',
                        ]
                      : (canonicalVertical === 'Daily Needs'
                          ? [
                              'Farm-fresh produce & premium grocery selection',
                              'Strict quality checks and grading before dispatch',
                              'Hygienically weighed, packed, and sealed',
                              'Same-day doorstep delivery with live tracking',
                            ]
                          : [
                              '100% Genuine and authentic product',
                              'Comprehensive manufacturer/seller warranty support',
                              'Tested and verified quality standards',
                              'Safe and secure doorstep delivery',
                            ]))
            )).map((hl, i) => (
              <View key={i} style={styles.hlRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.hlText, { color: colors.text }]}>{t(hl)}</Text>
              </View>
            ))}
          </View>

          {/* Specifications / Included-Excluded for Services / Details */}
          {canonicalVertical === 'Services' ? (
            <>
              {/* Service Key Specifications */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('Service Details & Standards')}</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 12 }]}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { label: 'Service Mode', val: 'Doorstep / At Home' },
                    { label: 'Warranty', val: '30 Days Service Guarantee' },
                    { label: 'Response Time', val: 'Within 60 Minutes' },
                    { label: 'Technician', val: 'Verified & Background-Checked' },
                  ].map((spec, i) => (
                    <View key={i} style={{ width: '48%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: isDark ? colors.cardBorder : '#E2E8F0' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase' }}>{spec.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginTop: 3 }}>{spec.val}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* What's Included */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{t("What's Included")}</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {[
                  'Comprehensive initial inspection and fault diagnosis',
                  'Professional service execution by certified specialist',
                  'Standard professional tools and diagnostic equipment',
                  'Post-repair functionality testing and quality check',
                  'Complete workspace cleanup after service completion',
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <Icons.Check color="#059669" size={16} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* What's Excluded */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{t("What's Excluded")}</Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {[
                  'Cost of replacement components, wires, pipes or spare parts (billed at standard rates with invoice)',
                  'Major masonry, civil, or structural alterations unless booked separately',
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <Icons.X color="#DC2626" size={16} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.subtext, flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Technical Specifications for Products / Details for other categories */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                {canonicalVertical === 'Food' ? t('Food Details') : (canonicalVertical === 'Daily Needs' ? t('Pack & Product Info') : t('Specifications'))}
              </Text>
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {product.specifications && product.specifications.length > 0 ? (
                  product.specifications.map((spec, i) => (
                    <View
                      key={i}
                      style={[
                        styles.specRow,
                        i < (product.specifications?.length || 0) - 1 && [styles.specDivider, { borderBottomColor: colors.cardBorder }],
                      ]}
                    >
                      <Text style={[styles.specLabel, { color: colors.subtext }]}>{t(spec.label)}</Text>
                      <Text style={[styles.specVal, { color: colors.text }]}>{t(spec.val)}</Text>
                    </View>
                  ))
                ) : (
                  (canonicalVertical === 'Food' ? [
                    { label: 'Classification', val: product.isVeg ? '100% Vegetarian' : 'Non-Vegetarian' },
                    { label: 'Cuisine / Category', val: product.cuisine || product.foodType || product.subcategory || 'Specialty' },
                    { label: 'Portion Size', val: product.unit || 'Serves 1-2 Persons' },
                    { label: 'Packaging', val: 'Tamper-Evident Food Grade Box' },
                  ] : (canonicalVertical === 'Daily Needs' ? [
                    { label: 'Pack Quantity', val: product.unit || 'Standard Pack' },
                    { label: 'Category', val: product.subcategory || product.category },
                    { label: 'Freshness', val: 'Farm Direct / Fresh Daily' },
                    { label: 'Storage Instructions', val: 'Store in a cool and dry place' },
                  ] : [
                    { label: 'Category', val: product.category },
                    { label: 'Condition', val: 'Brand New / Genuine' },
                    { label: 'Availability', val: product.availability || 'In Stock' },
                    { label: 'Fulfilment', val: 'Connect Verified Partner' },
                  ])).map((spec, i, arr) => (
                    <View
                      key={i}
                      style={[
                        styles.specRow,
                        i < arr.length - 1 && [styles.specDivider, { borderBottomColor: colors.cardBorder }],
                      ]}
                    >
                      <Text style={[styles.specLabel, { color: colors.subtext }]}>{t(spec.label)}</Text>
                      <Text style={[styles.specVal, { color: colors.text }]}>{t(spec.val)}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* Seller / Vendor Details */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('Seller & Fulfillment')}</Text>
          <View style={[styles.vendorCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Icons.Store color={colors.icon} size={20} />
            <View style={styles.vendorInfo}>
              <Text style={[styles.vendorName, { color: colors.text }]}>
                {t(product.seller?.name || product.brand || 'Information unavailable')}
              </Text>
              <Text style={[styles.vendorMeta, { color: colors.subtext }]}>
                {product.seller?.rating ? `★ ${product.seller.rating} Rating • ` : ''}
                {product.seller?.verified ? t('Verified Vendor') : t('Authorized Seller')}
              </Text>
            </View>
          </View>

          {/* Warranty & Return Info */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('Warranty & Support')}</Text>
          <View style={[styles.vendorCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Icons.ShieldCheck color="#16A34A" size={20} />
            <View style={styles.vendorInfo}>
              <Text style={[styles.vendorName, { color: colors.text }]}>
                {t(product.warranty || 'Information unavailable')}
              </Text>
              <Text style={[styles.vendorMeta, { color: colors.subtext }]}>
                {t('Genuine brand product with full seller warranty coverage.')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, borderTopColor: colors.cardBorder, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {hasCart && (
          <TouchableOpacity
            style={[
              styles.cartBtn,
              { backgroundColor: isInCart ? (isDark ? '#064E3B' : '#D1FAE5') : colors.cardBgSecondary, borderColor: colors.cardBorder }
            ]}
            onPress={handleAddToCart}
            disabled={isProcessing}
          >
            {isInCart ? (
              <Icons.Check color={isDark ? '#34D399' : '#059669'} size={18} strokeWidth={3} />
            ) : (
              <Icons.ShoppingCart color={colors.icon} size={18} />
            )}
            <Text style={[styles.cartBtnText, { color: isInCart ? (isDark ? '#34D399' : '#059669') : colors.text }, isInCart && { fontWeight: 'bold' }]}>
              {isInCart ? t('In Cart') : t('Add to Cart')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.buyBtn,
            { backgroundColor: colors.primary },
            { flex: hasCart ? 1.4 : undefined, width: hasCart ? undefined : '100%' },
            isProcessing && { opacity: 0.7 }
          ]}
          onPress={handleBuyNow}
          disabled={isProcessing}
        >
          <Text style={[styles.buyBtnText, { color: colors.primaryText }]}>
            {t(actionBtnText)} {totalPrice > 0 ? `(₹${totalPrice.toLocaleString('en-IN')})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#172033',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  imageContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  galleryCounter: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  galleryCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  thumbActive: {
    borderColor: '#F4C400',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#172033',
    lineHeight: 25,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#D97706',
  },
  assuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assuredText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 23,
    fontWeight: '900',
    color: '#172033',
  },
  strikePrice: {
    fontSize: 14,
    color: '#9AA0A6',
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtext: {
    fontSize: 11.5,
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionMargin: {
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#172033',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  variantSection: {
    marginBottom: 4,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantActive: {
    borderColor: '#F4C400',
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
  },
  variantText: {
    fontSize: 12,
    color: '#475569',
  },
  variantTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  variantDiffText: {
    fontSize: 9.5,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  qtyLabel: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#172033',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#172033',
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  hlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F4C400',
  },
  hlText: {
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
    lineHeight: 17,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  specDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  specVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: 'bold',
    flex: 1.2,
    textAlign: 'right',
  },
  unavailableText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#172033',
  },
  vendorMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
    elevation: 10,
  },
  cartBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF6A00',
    backgroundColor: '#FFF3E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartBtnInCart: {
    backgroundColor: '#D1FAE5',
    borderColor: '#34D399',
  },
  cartBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FF6A00',
  },
  buyBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FF6A00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  buyBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  backBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#F4C400',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
