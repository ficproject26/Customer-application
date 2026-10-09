import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LandingHero from '../components/landing/LandingHero';
import LandingMarketplace, { Product, PRODUCTS } from '../components/landing/LandingMarketplace';
import * as Icons from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import GlassCard from '../components/GlassCard';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function LandingPage() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isHeaderSearchActive, setIsHeaderSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [isWishlistVisible, setIsWishlistVisible] = useState(false);

  const handleToggleLike = (id: string) => {
    if (likedItems.includes(id)) {
      setLikedItems(likedItems.filter(item => item !== id));
    } else {
      setLikedItems([...likedItems, id]);
    }
  };

  const scrollY = useSharedValue(0);
  
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const handleJoinPress = () => {
    navigation.navigate('Login');
  };

  const handleExplorePress = () => {
    navigation.navigate('Login');
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#030814" 
        translucent={false} 
      />
      
      {/* Brand Header Navbar */}
      <View style={[styles.navbar, { paddingTop: insets.top, backgroundColor: '#030814', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <View style={styles.navbarContent}>
          {isHeaderSearchActive ? (
            <View style={[styles.headerSearchWrapper, { backgroundColor: '#0D1636' }]}>
              <Icons.Search color="rgba(255, 255, 255, 0.35)" size={14} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.headerSearchInput, { color: '#FFFFFF' }]}
                placeholder="Search products..."
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
            </View>
          ) : (
            <View 
              style={styles.navProfile} 
            >
              <Image 
                source={require('../assets/images/forge_india_logo.jpg')} 
                style={styles.navLogo} 
              />
              <View style={styles.profileTextWrapper}>
                <Text style={[styles.welcomeText, { color: '#FFFFFF' }]}>Welcome</Text>
                <View style={styles.quoteRow}>
                  <Text style={[styles.quoteText, { color: 'rgba(255, 255, 255, 0.6)' }]}>Let's Connect</Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.navActions}>
            <TouchableOpacity 
              style={styles.navIconBtn} 
              activeOpacity={0.7} 
              onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            >
              {themeMode === 'light' ? (
                <Icons.Moon color="#FFFFFF" size={20} />
              ) : (
                <Icons.Sun color="#FFFFFF" size={20} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navIconBtn} 
              activeOpacity={0.7} 
              onPress={() => {
                setIsHeaderSearchActive(!isHeaderSearchActive);
                if (isHeaderSearchActive) {
                  setSearchQuery('');
                }
              }}
            >
              {isHeaderSearchActive ? (
                <Icons.X color="#FFFFFF" size={20} />
              ) : (
                <Icons.Search color="#FFFFFF" size={20} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navIconBtn} 
              activeOpacity={0.7} 
              onPress={() => setIsWishlistVisible(true)}
            >
              <Icons.Heart 
                color={likedItems.length > 0 ? "#FF2E93" : "#FFFFFF"} 
                size={20} 
                fill={likedItems.length > 0 ? "#FF2E93" : "transparent"} 
              />
              {likedItems.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{likedItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navIconBtn} 
              activeOpacity={0.7} 
              onPress={() => Alert.alert('Your Cart', 'Sign in to access your shopping cart')}
            >
              <Icons.ShoppingCart color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {/* Hero Section */}
        <LandingHero
          onJoinPress={handleJoinPress}
          onExplorePress={handleExplorePress}
        />

        {/* Shopping Storefront Section */}
        <LandingMarketplace
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onProductPress={(prod) => {
            setSelectedProduct(prod);
          }}
          onCategoryPress={(name) => {
            Alert.alert('Categories', `Sign in to view all products under "${name}".`, [
              { text: 'Sign In Now', onPress: handleExplorePress },
              { text: 'Cancel', style: 'cancel' }
            ]);
          }}
          onSearchPress={handleExplorePress}
          likedItems={likedItems}
          onToggleLike={handleToggleLike}
        />
      </Animated.ScrollView>

      {/* Product Details Premium Modal */}
      <Modal
        visible={selectedProduct !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setSelectedProduct(null)} 
          />
          {selectedProduct && (
            <GlassCard style={styles.modalCard}>
              {/* Product Image Header with Close Button */}
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} />
                <TouchableOpacity 
                  style={styles.modalCloseBtn} 
                  onPress={() => setSelectedProduct(null)}
                  activeOpacity={0.7}
                >
                  <Icons.X color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              <View style={styles.modalInfoContainer}>
                <Text style={[styles.modalProductName, { color: colors.text }]}>{selectedProduct.name}</Text>
                
                {/* Rating and Discount Row */}
                <View style={styles.modalMetaRow}>
                  <View style={styles.modalRatingBadge}>
                    <Icons.Star color="#F4C400" size={10} fill="#F4C400" />
                    <Text style={styles.modalRatingText}> {selectedProduct.rating}</Text>
                  </View>
                  <View style={styles.modalDiscountBadge}>
                    <Text style={styles.modalDiscountText}>{selectedProduct.discount}</Text>
                  </View>
                </View>

                {/* Price Container */}
                <View style={styles.modalPriceRow}>
                  <Text style={[styles.modalPriceText, { color: colors.primary }]}>{selectedProduct.price}</Text>
                  <Text style={[styles.modalOriginalPriceText, { color: colors.grayLight }]}>{selectedProduct.originalPrice}</Text>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.cardBorder }]} />

                {/* Description */}
                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>PRODUCT DESCRIPTION</Text>
                <Text style={[styles.modalDescText, { color: colors.text, opacity: 0.7 }]}>{selectedProduct.description}</Text>

                {/* Action Buttons */}
                {(() => {
                  const isBooking = selectedProduct.id.startsWith('s') || 
                                    selectedProduct.id.startsWith('st') || 
                                    selectedProduct.id.startsWith('tr') ||
                                    selectedProduct.name.toLowerCase().includes('consultation') ||
                                    selectedProduct.name.toLowerCase().includes('service') ||
                                    selectedProduct.name.toLowerCase().includes('plumber') ||
                                    selectedProduct.name.toLowerCase().includes('stay') ||
                                    selectedProduct.name.toLowerCase().includes('ticket') ||
                                    selectedProduct.name.toLowerCase().includes('booking');
                  return (
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        useAuthStore.getState().setPendingPurchaseProduct(selectedProduct);
                        setSelectedProduct(null);
                        handleExplorePress();
                      }}
                    >
                      <Text style={[styles.modalActionBtnText, { color: themeMode === 'light' ? '#FFFFFF' : '#050B1E' }]}>
                        {isBooking ? 'Book Now' : 'Buy Now'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}

                <TouchableOpacity 
                  style={[styles.modalSecondaryBtn, { borderColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Alert.alert('Add to Cart', 'Please sign in to add items to your cart.', [
                      {
                        text: 'Sign In Now',
                        onPress: () => {
                          useAuthStore.getState().setPendingPurchaseProduct(selectedProduct);
                          setSelectedProduct(null);
                          handleExplorePress();
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.primary }]}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
        </View>
      </Modal>

      {/* Guest Wishlist Modal Dialog */}
      {(() => {
        const wishlistProducts = PRODUCTS.filter(p => likedItems.includes(p.id));
        return (
          <Modal
            visible={isWishlistVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsWishlistVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { height: '70%', backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                {/* Header */}
                <View style={[styles.wishlistHeader, { borderBottomColor: colors.cardBorder }]}>
                  <View style={styles.wishlistTitleRow}>
                    <Icons.Heart color="#FF2E93" size={20} fill="#FF2E93" />
                    <Text style={[styles.wishlistHeaderText, { color: colors.text }]}>My Wishlist ({likedItems.length})</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsWishlistVisible(false)}>
                    <Icons.X color={colors.text} size={20} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {wishlistProducts.length === 0 ? (
                  <View style={styles.wishlistEmpty}>
                    <Icons.Heart color={themeMode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'} size={64} style={{ marginBottom: 16 }} />
                    <Text style={[styles.wishlistEmptyText, { color: colors.text }]}>Your wishlist is empty</Text>
                    <Text style={[styles.wishlistEmptySub, { color: colors.grayLight }]}>Tap the heart icon on deals to save them here.</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.wishlistScroll} showsVerticalScrollIndicator={false}>
                    {wishlistProducts.map((item) => (
                      <GlassCard key={item.id} style={styles.wishlistItemCard}>
                        <Image source={{ uri: item.image }} style={styles.wishlistItemImg} />
                        <View style={styles.wishlistItemDetails}>
                          <Text style={[styles.wishlistItemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.wishlistItemPrice, { color: colors.primary }]}>{item.price}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.wishlistRemoveBtn}
                          onPress={() => handleToggleLike(item.id)}
                        >
                          <Icons.Trash2 color="#EF4444" size={16} />
                        </TouchableOpacity>
                      </GlassCard>
                    ))}
                  </ScrollView>
                )}

                {/* Footer */}
                <View style={[styles.wishlistFooter, { borderTopColor: colors.cardBorder }]}>
                  <TouchableOpacity 
                    style={[styles.wishlistLoginBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsWishlistVisible(false);
                      handleExplorePress();
                    }}
                  >
                    <Text style={[styles.wishlistLoginText, { color: themeMode === 'light' ? '#FFFFFF' : '#050B1E' }]}>Sign In to Save Wishlist</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030814',
  },
  navbar: {
    width: '100%',
    backgroundColor: '#030814',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  navbarContent: {
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  navLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F4C400',
  },
  profileTextWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 1,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 1,
  },
  quoteText: {
    color: '#F4C400',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navIconBtn: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(13, 22, 54, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
  },
  modalImageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 11, 30, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoContainer: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalRatingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F4C400',
  },
  modalDiscountBadge: {
    backgroundColor: 'rgba(233, 30, 99, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalDiscountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  modalPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F4C400',
  },
  modalOriginalPriceText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textDecorationLine: 'line-through',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalDescText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActionBtn: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  modalActionBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  headerSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    marginRight: 10,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  wishlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  wishlistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wishlistHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  wishlistEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  wishlistEmptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  wishlistEmptySub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  wishlistScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  wishlistItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 12,
  },
  wishlistItemImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0D1636',
  },
  wishlistItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  wishlistItemName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wishlistItemPrice: {
    color: '#F4C400',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  wishlistRemoveBtn: {
    padding: 8,
  },
  wishlistFooter: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  wishlistLoginBtn: {
    backgroundColor: '#F4C400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  wishlistLoginText: {
    color: '#050B1E',
    fontSize: 13,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF2E93',
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
