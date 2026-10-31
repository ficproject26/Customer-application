import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../store/languageStore';
import { View, Text, StatusBar, TouchableOpacity, Pressable } from 'react-native';


// Screen Imports
import LocationSelection from '../screens/LocationSelection';
import Login from '../screens/auth/Login';
import JoinNow from '../screens/auth/JoinNow';
import HomeDashboard from '../screens/customer/HomeDashboard';
import CategoryDetails from '../screens/customer/CategoryDetails';
import LiveTracking from '../screens/customer/LiveTracking';
import DeliveryDashboard from '../screens/delivery/DeliveryDashboard';
import DeliveryMap from '../screens/delivery/DeliveryMap';
import ProductDetails from '../screens/customer/ProductDetails';
import MyAddresses from '../screens/customer/MyAddresses';
import PaymentSettings from '../screens/customer/PaymentSettings';
import WalletScreen from '../screens/customer/WalletScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import BookingConfirmationScreen from '../screens/customer/BookingConfirmationScreen';
import EditProfile from '../screens/customer/EditProfile';
import WishlistScreen from '../screens/customer/WishlistScreen';
import RecentlyViewedScreen from '../screens/customer/RecentlyViewedScreen';
import JobDetailsScreen from '../screens/customer/JobDetailsScreen';
import StayDetails from '../screens/customer/StayDetails';
import Snackbar from '../components/Snackbar';
import GuestAuthModal from '../components/GuestAuthModal';


// Tab placeholders/secondary screens
import CustomerOrders from '../screens/customer/CustomerOrders';
import CustomerMembership from '../screens/customer/CustomerMembership';
import CustomerNotifications from '../screens/customer/CustomerNotifications';
import CustomerProfile from '../screens/customer/CustomerProfile';
import HelpSupportScreen from '../screens/customer/HelpSupportScreen';
import PrivacySecurityScreen from '../screens/customer/PrivacySecurityScreen';
import ThemeSettingsScreen from '../screens/customer/ThemeSettingsScreen';
import Categories from '../screens/customer/Categories';
import CustomerCart from '../screens/customer/CustomerCart';
import { useCartStore } from '../store/cartStore';


import DeliveryOrders from '../screens/delivery/DeliveryOrders';
import DeliveryEarnings from '../screens/delivery/DeliveryEarnings';
import DeliveryProfile from '../screens/delivery/DeliveryProfile';

// Lucide Icon Wrapper
import * as Icons from 'lucide-react-native';

// Define Stack Params
export type RootStackParamList = {
  Auth: undefined;
  CustomerApp: undefined;
  DeliveryApp: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  JoinNow: undefined;
  CreateAccount: undefined;
  Register: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: { screen?: string; params?: any } | undefined;
  CategoryDetails: { categoryName: string; subCategoryName?: string; selectedItem?: string; vendor?: any; from?: string; to?: string; journeyDate?: string; departureTime?: string; priceRange?: string; travelType?: string; vehicleType?: string; passengers?: number; openSearchModal?: boolean; [key: string]: any };
  LiveTracking: { orderId: string; order?: any };
  Notifications: undefined;
  HelpSupport: undefined;
  PrivacySecurity: undefined;
  ThemeSettings: undefined;
  Profile: undefined;
  Membership: undefined;
  LocationSelection: undefined;
  ProductDetails: { item: any; category: string };
  MyAddresses: undefined;
  PaymentSettings: undefined;
  Wallet: undefined;
  Cart: undefined;
  Checkout: { item?: any; items?: any[]; subtotal?: number } | undefined;
  BookingConfirmation: {
    bookingId: string;
    items?: any[];
    totalAmount?: number;
    paymentMethod?: string;
    type?: string;
    date?: string;
    slot?: string;
    address?: string;
  };
  EditProfile: undefined;
  Wishlist: undefined;
  RecentlyViewed: undefined;
  JobDetails: { job: any; openApplySheet?: boolean };
  StayDetails: { stay: any; checkIn?: string; checkOut?: string; nights?: number; adults?: number; rooms?: number };
  Login: undefined;
  JoinNow: undefined;
};

export type DeliveryStackParamList = {
  DeliveryTabs: undefined;
  DeliveryMap: { orderId: string };
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const CustomerStack = createStackNavigator<CustomerStackParamList>();
const DeliveryStack = createStackNavigator<DeliveryStackParamList>();

const CustomerTab = createBottomTabNavigator();
const DeliveryTab = createBottomTabNavigator();

// Ultra-fast Tab Bar Button with 0ms touch response
const FastTabButton = React.memo((props: any) => {
  const { onPress, onLongPress, children, accessibilityState, style, ...rest } = props;
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: 'rgba(255, 106, 0, 0.12)', borderless: true, radius: 28 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
    >
      {children}
    </Pressable>
  );
});

// --- ICON HELPERS ---
const TabIcon = React.memo(({ name, color, size }: { name: string; color: string; size: number }) => {
  switch (name) {
    case 'Home':
      return <Icons.Home color={color} size={size} />;
    case 'LayoutGrid':
      return <Icons.LayoutGrid color={color} size={size} />;
    case 'ShoppingBag':
      return <Icons.ShoppingBag color={color} size={size} />;
    case 'Crown':
      return <Icons.Crown color={color} size={size} />;
    case 'User':
      return <Icons.User color={color} size={size} />;
    default:
      const IconComponent = (Icons as any)[name];
      return IconComponent ? <IconComponent color={color} size={size} /> : <View style={{ width: size, height: size }} />;
  }
});

// Memoized Screen Components for Bottom Tabs to prevent unnecessary re-renders
const MemoizedHomeDashboard = React.memo(HomeDashboard);
const MemoizedCategories = React.memo(Categories);
const MemoizedCustomerOrders = React.memo(CustomerOrders);
const MemoizedCustomerMembership = React.memo(CustomerMembership);
const MemoizedCustomerProfile = React.memo(CustomerProfile);

const MemoizedDeliveryDashboard = React.memo(DeliveryDashboard);
const MemoizedDeliveryOrders = React.memo(DeliveryOrders);
const MemoizedDeliveryEarnings = React.memo(DeliveryEarnings);
const MemoizedDeliveryProfile = React.memo(DeliveryProfile);

// Static memoized tab icon renderers for Customer tab bar
const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="Home" color={color} size={size} />
);
const renderCategoriesIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="LayoutGrid" color={color} size={size} />
);
const renderOrdersIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="ShoppingBag" color={color} size={size} />
);
const renderMembershipIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="Crown" color={color} size={size} />
);
const renderProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="User" color={color} size={size} />
);

// Static memoized tab icon renderers for Delivery tab bar
const renderDeliveryTruckIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="Truck" color={color} size={size} />
);
const renderDeliveryListIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="List" color={color} size={size} />
);
const renderDeliveryDollarIcon = ({ color, size }: { color: string; size: number }) => (
  <TabIcon name="DollarSign" color={color} size={size} />
);

// --- HOME & CATEGORIES STACK NAVIGATORS FOR PERSISTENT BOTTOM TABS ---
const HomeStack = createStackNavigator();
function HomeStackNavigator() {
  const colors = useThemeStore((state) => state.colors);
  return (
    <HomeStack.Navigator detachInactiveScreens={true} screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}>
      <HomeStack.Screen name="HomeMain" component={MemoizedHomeDashboard} />
      <HomeStack.Screen name="CategoryDetails" component={CategoryDetails} />
      <HomeStack.Screen name="ProductDetails" component={ProductDetails} />
      <HomeStack.Screen name="StayDetails" component={StayDetails} />
      <HomeStack.Screen name="JobDetails" component={JobDetailsScreen} />
    </HomeStack.Navigator>
  );
}

const CategoriesStack = createStackNavigator();
function CategoriesStackNavigator() {
  const colors = useThemeStore((state) => state.colors);
  return (
    <CategoriesStack.Navigator detachInactiveScreens={true} screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}>
      <CategoriesStack.Screen name="CategoriesMain" component={MemoizedCategories} />
      <CategoriesStack.Screen name="CategoryDetails" component={CategoryDetails} />
      <CategoriesStack.Screen name="ProductDetails" component={ProductDetails} />
      <CategoriesStack.Screen name="StayDetails" component={StayDetails} />
      <CategoriesStack.Screen name="JobDetails" component={JobDetailsScreen} />
    </CategoriesStack.Navigator>
  );
}

// --- CUSTOMER BOTTOM TAB NAVIGATION ---
function CustomerTabNavigator() {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { t, currentLanguage, refreshKey } = useTranslation();

  return (
    <CustomerTab.Navigator
      detachInactiveScreens={true}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <FastTabButton {...props} />,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: isDark ? '#000' : '#888',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
        },
      }}
    >
      <CustomerTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: renderHomeIcon,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{t('home')}</Text>
          ),
        }}
      />
      <CustomerTab.Screen
        name="Categories"
        component={CategoriesStackNavigator}
        options={{
          tabBarIcon: renderCategoriesIcon,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{t('categories')}</Text>
          ),
        }}
      />
      <CustomerTab.Screen
        name="Orders"
        component={MemoizedCustomerOrders}
        options={{
          tabBarIcon: renderOrdersIcon,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{t('orders')}</Text>
          ),
        }}
      />
      <CustomerTab.Screen
        name="Membership"
        component={MemoizedCustomerMembership}
        options={{
          tabBarIcon: renderMembershipIcon,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{t('membership')}</Text>
          ),
        }}
      />
      <CustomerTab.Screen
        name="Profile"
        component={MemoizedCustomerProfile}
        options={{
          tabBarIcon: renderProfileIcon,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{t('profile')}</Text>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!currentUser) {
              e.preventDefault();
              navigation.navigate('Login');
            }
          },
        })}
      />
    </CustomerTab.Navigator>
  );
}


// --- CUSTOMER MAIN NAVIGATOR ---
function CustomerNavigator() {
  const colors = useThemeStore((state) => state.colors);

  return (
    <>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
        translucent={false}
      />
      <CustomerStack.Navigator detachInactiveScreens={true} screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}>
        <CustomerStack.Screen name="CustomerTabs" component={CustomerTabNavigator} />
        <CustomerStack.Screen name="CategoryDetails" component={CategoryDetails} />
        <CustomerStack.Screen name="LiveTracking" component={LiveTracking} />
        <CustomerStack.Screen name="Membership" component={CustomerMembership} />
        <CustomerStack.Screen name="LocationSelection" component={LocationSelection} />
        <CustomerStack.Screen name="ProductDetails" component={ProductDetails} />
        <CustomerStack.Screen name="MyAddresses" component={MyAddresses} />
        <CustomerStack.Screen name="PaymentSettings" component={PaymentSettings} />
        <CustomerStack.Screen name="Wallet" component={WalletScreen} />
        <CustomerStack.Screen name="Cart" component={CustomerCart} />
        <CustomerStack.Screen name="Checkout" component={CheckoutScreen} />
        <CustomerStack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <CustomerStack.Screen
          name="Notifications"
          component={CustomerNotifications}
          options={{
            presentation: 'transparentModal',
            cardStyle: { backgroundColor: 'transparent' },
            headerShown: false,
            animation: 'fade',
          }}
        />
        <CustomerStack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <CustomerStack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <CustomerStack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
        <CustomerStack.Screen name="EditProfile" component={EditProfile} />
        <CustomerStack.Screen name="Wishlist" component={WishlistScreen} />
        <CustomerStack.Screen name="RecentlyViewed" component={RecentlyViewedScreen} />
        <CustomerStack.Screen name="JobDetails" component={JobDetailsScreen} />
        <CustomerStack.Screen name="StayDetails" component={StayDetails} />
        <CustomerStack.Screen name="Login" component={Login} />
        <CustomerStack.Screen name="JoinNow" component={JoinNow} />
      </CustomerStack.Navigator>
      <Snackbar />
      <GuestAuthModal />
    </>
  );
}


// --- DELIVERY PARTNER BOTTOM TAB NAVIGATION ---
function DeliveryTabNavigator() {
  return (
    <DeliveryTab.Navigator
      detachInactiveScreens={true}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <FastTabButton {...props} />,
        tabBarStyle: {
          backgroundColor: '#050B1E',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#F4C400',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
        }
      }}
    >
      <DeliveryTab.Screen
        name="Dashboard"
        component={MemoizedDeliveryDashboard}
        options={{
          tabBarIcon: renderDeliveryTruckIcon,
          tabBarLabel: 'Dashboard',
        }}
      />
      <DeliveryTab.Screen
        name="Orders"
        component={MemoizedDeliveryOrders}
        options={{
          tabBarIcon: renderDeliveryListIcon,
          tabBarLabel: 'Deliveries',
        }}
      />
      <DeliveryTab.Screen
        name="Earnings"
        component={MemoizedDeliveryEarnings}
        options={{
          tabBarIcon: renderDeliveryDollarIcon,
          tabBarLabel: 'Earnings',
        }}
      />
      <DeliveryTab.Screen
        name="Profile"
        component={MemoizedDeliveryProfile}
        options={{
          tabBarIcon: renderProfileIcon,
          tabBarLabel: 'Profile',
        }}
      />
    </DeliveryTab.Navigator>
  );
}

// --- DELIVERY MAIN NAVIGATOR ---
function DeliveryNavigator() {
  return (
    <DeliveryStack.Navigator screenOptions={{ headerShown: false }}>
      <DeliveryStack.Screen name="DeliveryTabs" component={DeliveryTabNavigator} />
      <DeliveryStack.Screen name="DeliveryMap" component={DeliveryMap} />
    </DeliveryStack.Navigator>
  );
}

// --- AUTHENTICATION NAVIGATOR ---
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="JoinNow" component={JoinNow} />
      <AuthStack.Screen name="CreateAccount" component={JoinNow} />
      <AuthStack.Screen name="Register" component={JoinNow} />
    </AuthStack.Navigator>
  );
}

// --- ROOT APP NAVIGATOR ---
export default function AppNavigator() {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (currentUser?.role === 'delivery') {
    return <DeliveryNavigator />;
  }

  // Unauthenticated guests as well as Customers and Vendors can browse the Customer App!
  return <CustomerNavigator />;
}
