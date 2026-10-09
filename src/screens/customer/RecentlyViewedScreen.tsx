import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useActivityStore } from '../../store/activityStore';
import { useCartStore, isCartableCategory } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { useThemeStore } from '../../store/themeStore';
import { openRespectivePage } from '../../utils/navigationHelpers';

export default function RecentlyViewedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const recentViews = useActivityStore((state) => state.recentViews);
  const clearActivity = useActivityStore((state) => state.clearActivity);
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.showToast);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Browsing History',
      'Are you sure you want to clear all your recently viewed products?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearActivity(),
        },
      ]
    );
  };

  const handleAddOrBook = (item: any) => {
    const hasCart = isCartableCategory(item.category, item.name);

    if (hasCart) {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image,
      });
      showToast('Added to cart · View Cart', 'View Cart', () =>
        navigation.navigate('Cart')
      );
    } else {
      openRespectivePage(navigation, item);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recently Viewed</Text>
        {recentViews && recentViews.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearHistory}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {!recentViews || recentViews.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}>
            <Icons.Clock color={colors.textSecondary} size={36} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recently Viewed Items</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Products you browse while exploring the Connect catalog will be saved here for easy access.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomerTabs', { screen: 'Categories' })}
          >
            <Text style={styles.exploreBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Products List */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {recentViews.length} {recentViews.length === 1 ? 'Product' : 'Products'} viewed
          </Text>

          {recentViews.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
              onPress={() => {
                if (isCartableCategory(item.category, item.name)) {
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
                  });
                } else {
                  openRespectivePage(navigation, item);
                }
              }}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.placeholderImage, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}>
                  <Icons.Package color={colors.textSecondary} size={24} />
                </View>
              )}

              <View style={styles.detailsCol}>
                <Text style={[styles.categoryTag, { color: colors.textSecondary }]}>{item.category || 'Product'}</Text>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemPrice, { color: isLight ? '#0F172A' : '#F4C400' }]}>{item.price}</Text>
              </View>

              {(() => {
                const catLower = (item.category || '').toLowerCase().trim();
                const hasCart = 
                  catLower.includes('product') || 
                  catLower.includes('elect') || 
                  catLower.includes('fash') || 
                  catLower.includes('grocer') || 
                  catLower.includes('daily') || 
                  catLower.includes('food') || 
                  catLower.includes('dine');
                
                return (
                  <TouchableOpacity
                    style={styles.addCartBtn}
                    activeOpacity={0.8}
                    onPress={() => handleAddOrBook(item)}
                  >
                    {hasCart ? (
                      <>
                        <Icons.ShoppingBag color="#0F172A" size={14} />
                        <Text style={styles.addCartBtnText}>Add</Text>
                      </>
                    ) : (
                      <>
                        <Icons.Calendar color="#0F172A" size={14} />
                        <Text style={styles.addCartBtnText}>Book</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: '#F4C400',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4C400',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addCartBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
