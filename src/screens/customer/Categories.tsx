// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
  Platform,
  LayoutAnimation,
  UIManager,
  StatusBar,
} from 'react-native';
import * as _reactNative from 'react-native';
import * as _react from 'react';
import * as Icons from 'lucide-react-native';
import CartModal from '../../components/CartModal';
import * as SafeAreaContext from 'react-native-safe-area-context';
import * as NavigationNative from '@react-navigation/native';
import * as ThemeStore from '../../store/themeStore';
import * as LocationStore from '../../store/locationStore';
import * as LanguageStore from '../../store/languageStore';
import * as ApiModule from '../../services/api';
import * as ToastStore from '../../store/toastStore';
import * as CartStore from '../../store/cartStore';
import * as NotificationStore from '../../store/notificationStore';
import * as SafeVoiceModule from '../../utils/safeVoice';
import * as SidebarDataModule from './sidebarData';
import * as _jsxRuntime from 'react/jsx-runtime';

var _CartModal = {
  default: CartModal
};
var _slicedToArray2 = {
  default: (arr, n) => Array.isArray(arr) ? arr.slice(0, n) : []
};
var _asyncToGenerator2 = {
  default: (fn) => function() {
    var self = this, args = arguments;
    return new Promise(function(resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) { step('next', value); }
      function _throw(err) { step('throw', err); }
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }
        if (info.done) {
          resolve(value);
        } else {
          Promise.resolve(value).then(_next, _throw);
        }
      }
      _next();
    });
  }
};

if ("android" === 'android' && _reactNative.UIManager.setLayoutAnimationEnabledExperimental) {
    _reactNative.UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Top horizontal category pills
  var TOP_SLIDER_CATEGORIES = [{
    name: 'All',
    icon: 'LayoutGrid',
    key: 'All'
  }, {
    name: 'Products',
    icon: 'ShoppingBag',
    key: 'Product'
  }, {
    name: 'Services',
    icon: 'Wrench',
    key: 'Services'
  }, {
    name: 'Daily Needs',
    icon: 'Milk',
    key: 'Daily Needs'
  }, {
    name: 'Food',
    icon: 'Utensils',
    key: 'Food'
  }, {
    name: 'Stay',
    icon: 'Bed',
    key: 'Stay'
  }, {
    name: 'Travel',
    icon: 'Plane',
    key: 'Travel'
  }, {
    name: 'Jobs',
    icon: 'Briefcase',
    key: 'Job'
  }];

  // Curated high-resolution illustrations for every subcategory
  var SUBCAT_IMAGES = {
    // Products
    Electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=70',
    'IT & Office': 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=200&auto=format&fit=crop&q=70',
    'Home Appliances': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=70',
    Furniture: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&auto=format&fit=crop&q=70',
    Fashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=70',
    Beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&auto=format&fit=crop&q=70',
    'Baby Care': 'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=200&auto=format&fit=crop&q=70',
    'Sports & Fitness': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=70',
    Books: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&auto=format&fit=crop&q=70',
    Gaming: 'https://images.unsplash.com/photo-1385846882-47137b678fae?w=200&auto=format&fit=crop&q=70',
    'Home & Kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=200&auto=format&fit=crop&q=70',
    // Services (Home & Technician Services)
    Plumbing: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=200&auto=format&fit=crop&q=70',
    'AC Repair & Service': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&auto=format&fit=crop&q=70',
    Electrical: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=70',
    'Washing Machine Repair': 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=200&auto=format&fit=crop&q=70',
    'Refrigerator Repair': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=70',
    'TV Repair': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&auto=format&fit=crop&q=70',
    'RO / Water Purifier': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200&auto=format&fit=crop&q=70',
    'Microwave Repair': 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=200&auto=format&fit=crop&q=70',
    'Geyser Repair': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=200&auto=format&fit=crop&q=70',
    Carpentry: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=200&auto=format&fit=crop&q=70',
    'CCTV Installation': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200&auto=format&fit=crop&q=70',
    'Solar Service': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=70',
    'Appliance Repair': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&auto=format&fit=crop&q=70',
    Painting: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=70',
    Cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=70',
    'Pest Control': 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=200&auto=format&fit=crop&q=70',
    // Daily Needs
    Grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=70',
    'Fruits & Vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop&q=70',
    Dairy: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=70',
    Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=70',
    Beverages: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=70',
    // Food
    Restaurants: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=70',
    'Fast Food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=70',
    Cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=70',
    Desserts: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200&auto=format&fit=crop&q=70',
    // Stay (Curated Real Hotel & Resort Photos for 16 Categories)
    Hotels: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&auto=format&fit=crop&q=80',
    Resorts: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&auto=format&fit=crop&q=80',
    Homestays: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&auto=format&fit=crop&q=80',
    'Service Apartments': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80',
    'Vacation Rentals': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=80',
    'Student Accommodation': 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&auto=format&fit=crop&q=80',
    'Corporate Stay': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&auto=format&fit=crop&q=80',
    'Camping & Adventure': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&auto=format&fit=crop&q=80',
    'Heritage Stay': 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400&auto=format&fit=crop&q=80',
    'Couple Stay': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&auto=format&fit=crop&q=80',
    'Family Stay': 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&auto=format&fit=crop&q=80',
    'Medical Stay': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80',
    'Religious Stay': 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&auto=format&fit=crop&q=80',
    'International Stay': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&auto=format&fit=crop&q=80',
    'Long-Term Stay': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop&q=80',
    'Short-Term Stay': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&auto=format&fit=crop&q=80',
    // Travel (Bus Only)
    'Bus Booking': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&auto=format&fit=crop&q=70',
    'AC Sleeper': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&auto=format&fit=crop&q=70',
    'Volvo Multi-Axle': 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200&auto=format&fit=crop&q=70',
    // Jobs
    IT: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=70',
    'IT Jobs': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&auto=format&fit=crop&q=70',
    'Non-IT': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=70',
    'Non-IT Jobs': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=70',
    'Delivery & Field': 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=300&auto=format&fit=crop&q=70',
    'Delivery & Field Jobs': 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=300&auto=format&fit=crop&q=70'
  };
  var DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=70';

  // 1:1 Mirror of Vendor App BusinessScreen.tsx Hierarchy
  var VENDOR_HIERARCHY = {
    Job: {
      'IT': ['Software Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Mobile App Developer', 'UI/UX Designer', 'DevOps Engineer', 'Cloud Engineer', 'Data Analyst', 'AI Engineer', 'Cyber Security Analyst'],
      'Non-IT': ['Admin Executive', 'Office Assistant', 'Data Entry Operator', 'Operations Executive', 'Customer Service Executive', 'Receptionist', 'Sales Executive', 'HR Executive', 'Accountant'],
      'Delivery & Field': ['Delivery Executive', 'Warehouse Associate', 'Field Agent', 'Driver']
    },
    Product: {
      'Electronics': ['Smartphones', 'Tablets', 'Laptops', 'Smart Watches', 'Headphones', 'Earbuds', 'Speakers', 'Cameras', 'Printers', 'Accessories'],
      'Fashion': ['Men Shirts', 'Men T-Shirts', 'Men Jeans', 'Men Footwear', 'Women Sarees', 'Women Kurtis', 'Women Dresses', 'Kids Clothing', 'Footwear'],
      'Beauty & Grooming': ['Skincare', 'Haircare', 'Cosmetics', 'Perfumes', 'Grooming Products', 'Wellness Products'],
      'Home & Kitchen': ['Kitchen Appliances', 'Cookware', 'Storage Containers', 'Dining Sets', 'Home Decor', 'Lighting'],
      'Sports & Fitness': ['Gym Equipment', 'Yoga Accessories', 'Sports Wear', 'Sports Equipment', 'Fitness Trackers'],
      'Books & Stationery': ['Academic Books', 'Story Books', 'Notebooks', 'Office Stationery', 'Art Supplies']
    },
    Services: {
      'A/C': ['AC Power Jet Service', 'Gas Refill & Leak Fix', 'AC Installation & Uninstallation', 'Compressor Repair', 'AC Filter Cleaning'],
      'IT & Device Support': ['Laptop Repairs', 'PC Repairs', 'Wifi & Network Setup', 'CCTV Installation', 'Software Troubleshooting'],
      'Electrical & Plumbing': ['Switch & Socket Repair', 'Fan Repair & Fitting', 'Tap & Mixer Fitting', 'Pipe Leakage Repair', 'Drainage Unblocking'],
      'Cleaning & Pest Control': ['Full Home Deep Cleaning', 'Bathroom Deep Cleaning', 'Cockroach & Ant Control', 'Termite Treatment']
    },
    'Daily Needs': {
      'Snacks & Beverages': ['Potato Chips', 'Biscuits & Cookies', 'Fruit Juices', 'Instant Coffee', 'Tea Powder', 'Namkeen & Bhujia'],
      'Personal Care': ['Shampoo & Conditioner', 'Bathing Soap', 'Toothpaste & Brush', 'Face Wash', 'Body Lotion', 'Deodorant'],
      'Fruits & Vegetables': ['Fresh Fruits', 'Fresh Vegetables', 'Leafy Greens', 'Organic Produce'],
      'Grocery & Staples': ['Wheat Flour / Atta', 'Basmati Rice', 'Toor Dal & Pulses', 'Sugar & Salt', 'Cooking Oil & Ghee', 'Spices & Masala'],
      'Dairy, Bread & Eggs': ['Fresh Milk', 'Curd & Yogurt', 'Paneer & Tofu', 'Bread & Buns', 'Farm Eggs', 'Butter & Cheese'],
      'Household & Cleaning': ['Detergent Powder', 'Dishwash Gel', 'Floor Cleaner', 'Garbage Bags', 'Air Freshener']
    }
  };

  // Generic Multi-Select Toggle Helper
  var toggleMultiFilter = (currentList = ['All'], itemKey, allKey = 'All') => {
    var isAll = itemKey.toLowerCase() === allKey.toLowerCase() || itemKey.toLowerCase() === 'all';
    var effectiveAll = allKey;
    if (isAll) {
      return [effectiveAll];
    }
    var withoutAll = (currentList || []).filter(x => x.toLowerCase() !== 'all');
    var exists = withoutAll.some(x => x.toLowerCase() === itemKey.toLowerCase());
    var updated;
    if (exists) {
      updated = withoutAll.filter(x => x.toLowerCase() !== itemKey.toLowerCase());
    } else {
      updated = [...withoutAll, itemKey];
    }
    return updated.length > 0 ? updated : [effectiveAll];
  };
  var isMultiSelected = (currentList = ['All'], itemKey, allKey = 'All') => {
    if (!currentList || currentList.length === 0) return itemKey.toLowerCase() === allKey.toLowerCase() || itemKey.toLowerCase() === 'all';
    var isAll = itemKey.toLowerCase() === allKey.toLowerCase() || itemKey.toLowerCase() === 'all';
    if (isAll) {
      return currentList.some(x => x.toLowerCase() === 'all');
    }
    return currentList.some(x => x.toLowerCase() === itemKey.toLowerCase());
  };
  var getMultiPreviewText = (currentList = ['All'], allLabel = 'All') => {
    if (!currentList || currentList.length === 0 || currentList.some(x => x.toLowerCase() === 'all')) {
      return allLabel;
    }
    if (currentList.length === 1) {
      return currentList[0];
    }
    return `${currentList.length} selected`;
  };

  // Filter state definition

  var DEFAULT_FILTERS = {
    categoryType: 'All',
    subCategory: 'All',
    subCategories: ['All'],
    childCategory: 'All',
    childCategories: ['All'],
    sortBy: 'recommended',
    priceRange: 'all',
    rating: 'all',
    availability: [],
    distance: 'all',
    offers: [],
    // Food
    foodDietary: 'all',
    foodDietaries: ['all'],
    foodCuisine: 'all',
    foodCuisines: ['all'],
    foodDeliverySpeed: 'all',
    // Stay
    stayPropertyType: 'all',
    stayPropertyTypes: ['all'],
    stayRoomClass: 'all',
    stayRoomClasses: ['all'],
    stayGuests: 'all',
    stayAmenities: [],
    // Travel
    travelBusClass: 'all',
    travelBusClasses: ['all'],
    travelDepartureSlot: 'all',
    travelDepartureSlots: ['all'],
    travelAmenities: [],
    // Job
    jobTypeFilter: 'all',
    jobTypes: ['all'],
    jobExperience: 'all',
    jobExperiences: ['all'],
    jobSalary: 'all',
    jobWorkMode: 'all',
    jobWorkModes: ['all'],
    // Services
    serviceTypeFilter: 'all',
    serviceTypes: ['all'],
    serviceBookingType: 'all',
    // Products
    productDepartment: 'all',
    productDepartments: ['all'],
    productStockOnly: false,
    // Daily Needs
    dailyNeedsSection: 'all',
    dailyNeedsSections: ['all'],
    dailyNeedsFreshness: 'all'
  };
  function Categories() {
    var _this = this;
    var _useWindowDimensions = (0, _reactNative.useWindowDimensions)(),
      width = _useWindowDimensions.width;
    var insets = (0, SafeAreaContext.useSafeAreaInsets)();
    var navigation = (0, NavigationNative.useNavigation)();
    var colors = (0, ThemeStore.useThemeStore)(state => state.colors);
    var isDark = (0, ThemeStore.useThemeStore)(state => state.isDark);
    var getDisplayLocation = (0, LocationStore.useLocationStore)(state => state.getDisplayLocation);
    var isLight = !isDark;
    var _useTranslation = (0, LanguageStore.useTranslation)(),
      t = _useTranslation.t;
    var route = (0, NavigationNative.useRoute)();
    var isFocused = (0, NavigationNative.useIsFocused)();

    // Navigation and Search States
    var _useState = (0, _react.useState)(''),
      _useState2 = (0, _slicedToArray2.default)(_useState, 2),
      searchQuery = _useState2[0],
      setSearchQuery = _useState2[1];
    var _useState3 = (0, _react.useState)('All'),
      _useState4 = (0, _slicedToArray2.default)(_useState3, 2),
      selectedMainCategory = _useState4[0],
      setSelectedMainCategory = _useState4[1];
    var _useState5 = (0, _react.useState)('All'),
      _useState6 = (0, _slicedToArray2.default)(_useState5, 2),
      selectedSubcategory = _useState6[0],
      setSelectedSubcategory = _useState6[1];

    // Dedicated Travel Ticket Booking States
    var _useState7 = (0, _react.useState)('Bangalore'),
      _useState8 = (0, _slicedToArray2.default)(_useState7, 2),
      travelFrom = _useState8[0],
      setTravelFrom = _useState8[1];
    var _useState9 = (0, _react.useState)('Chennai'),
      _useState0 = (0, _slicedToArray2.default)(_useState9, 2),
      travelTo = _useState0[0],
      setTravelTo = _useState0[1];
    var _useState1 = (0, _react.useState)('Bus'),
      _useState10 = (0, _slicedToArray2.default)(_useState1, 2),
      travelVehicleType = _useState10[0],
      setTravelVehicleType = _useState10[1];
    var _useState11 = (0, _react.useState)(false),
      _useState12 = (0, _slicedToArray2.default)(_useState11, 2),
      isVehicleDropdownOpen = _useState12[0],
      setIsVehicleDropdownOpen = _useState12[1];
    var _useState13 = (0, _react.useState)(false),
      _useState14 = (0, _slicedToArray2.default)(_useState13, 2),
      hasSearchedTravel = _useState14[0],
      setHasSearchedTravel = _useState14[1];
    var _useState15 = (0, _react.useState)(() => new Date()),
      _useState16 = (0, _slicedToArray2.default)(_useState15, 2),
      travelDate = _useState16[0],
      setTravelDate = _useState16[1];
    var _useState17 = (0, _react.useState)(false),
      _useState18 = (0, _slicedToArray2.default)(_useState17, 2),
      isDatePickerOpen = _useState18[0],
      setIsDatePickerOpen = _useState18[1];
    var _useState19 = (0, _react.useState)(() => new Date()),
      _useState20 = (0, _slicedToArray2.default)(_useState19, 2),
      calendarMonth = _useState20[0],
      setCalendarMonth = _useState20[1];
    var isSameDay = (0, _react.useCallback)((d1, d2) => {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }, []);
    var isTodaySelected = (0, _react.useMemo)(() => isSameDay(travelDate, new Date()), [travelDate, isSameDay]);
    var isTomorrowSelected = (0, _react.useMemo)(() => {
      var tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      return isSameDay(travelDate, tmr);
    }, [travelDate, isSameDay]);
    var formattedTravelDate = (0, _react.useMemo)(() => {
      var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var dayName = dayNames[travelDate.getDay()];
      var dateNum = String(travelDate.getDate()).padStart(2, '0');
      var month = monthNames[travelDate.getMonth()];
      var year = travelDate.getFullYear();
      var tag = isTodaySelected ? ' (Today)' : isTomorrowSelected ? ' (Tomorrow)' : '';
      return `${dayName}, ${dateNum} ${month} ${year}${tag}`;
    }, [travelDate, isTodaySelected, isTomorrowSelected]);
    var calendarDays = (0, _react.useMemo)(() => {
      var year = calendarMonth.getFullYear();
      var month = calendarMonth.getMonth();
      var firstDay = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var days = [];
      for (var i = 0; i < firstDay; i++) {
        days.push(null);
      }
      for (var d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d));
      }
      return days;
    }, [calendarMonth]);
    var calendarMonthLabel = (0, _react.useMemo)(() => {
      var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
    }, [calendarMonth]);

    // Dedicated Stay Hotel Booking States (Screenshot 1 & 2 flow)
    var _useState21 = (0, _react.useState)(false),
      _useState22 = (0, _slicedToArray2.default)(_useState21, 2),
      staySearchSubmitted = _useState22[0],
      setStaySearchSubmitted = _useState22[1];
    var _useState23 = (0, _react.useState)('Near me'),
      _useState24 = (0, _slicedToArray2.default)(_useState23, 2),
      stayDestination = _useState24[0],
      setStayDestination = _useState24[1];
    var _useState25 = (0, _react.useState)(''),
      _useState26 = (0, _slicedToArray2.default)(_useState25, 2),
      stayDestSearchQuery = _useState26[0],
      setStayDestSearchQuery = _useState26[1];
    var _useState27 = (0, _react.useState)(false),
      _useState28 = (0, _slicedToArray2.default)(_useState27, 2),
      isStayDestModalOpen = _useState28[0],
      setIsStayDestModalOpen = _useState28[1];
    var _useState29 = (0, _react.useState)(() => new Date(2026, 9, 6)),
      _useState30 = (0, _slicedToArray2.default)(_useState29, 2),
      stayCheckInDate = _useState30[0],
      setStayCheckInDate = _useState30[1]; // 06 Oct 2026
    var _useState31 = (0, _react.useState)(() => new Date(2026, 9, 7)),
      _useState32 = (0, _slicedToArray2.default)(_useState31, 2),
      stayCheckOutDate = _useState32[0],
      setStayCheckOutDate = _useState32[1]; // 07 Oct 2026
    var _useState33 = (0, _react.useState)(() => new Date(2026, 9, 6)),
      _useState34 = (0, _slicedToArray2.default)(_useState33, 2),
      tempStayCheckInDate = _useState34[0],
      setTempStayCheckInDate = _useState34[1];
    var _useState35 = (0, _react.useState)(() => new Date(2026, 9, 9)),
      _useState36 = (0, _slicedToArray2.default)(_useState35, 2),
      tempStayCheckOutDate = _useState36[0],
      setTempStayCheckOutDate = _useState36[1];
    var _useState37 = (0, _react.useState)(2026),
      _useState38 = (0, _slicedToArray2.default)(_useState37, 2),
      stayCalendarYear = _useState38[0],
      setStayCalendarYear = _useState38[1];
    var _useState39 = (0, _react.useState)(9),
      _useState40 = (0, _slicedToArray2.default)(_useState39, 2),
      stayCalendarMonth = _useState40[0],
      setStayCalendarMonth = _useState40[1]; // Oct 2026
    var _useState41 = (0, _react.useState)(false),
      _useState42 = (0, _slicedToArray2.default)(_useState41, 2),
      isStayCalendarModalOpen = _useState42[0],
      setIsStayCalendarModalOpen = _useState42[1];
    var _useState43 = (0, _react.useState)(1),
      _useState44 = (0, _slicedToArray2.default)(_useState43, 2),
      stayRooms = _useState44[0],
      setStayRooms = _useState44[1];
    var _useState45 = (0, _react.useState)(1),
      _useState46 = (0, _slicedToArray2.default)(_useState45, 2),
      stayAdults = _useState46[0],
      setStayAdults = _useState46[1];
    var _useState47 = (0, _react.useState)(0),
      _useState48 = (0, _slicedToArray2.default)(_useState47, 2),
      stayChildren = _useState48[0],
      setStayChildren = _useState48[1];
    var _useState49 = (0, _react.useState)(1),
      _useState50 = (0, _slicedToArray2.default)(_useState49, 2),
      tempStayRooms = _useState50[0],
      setTempStayRooms = _useState50[1];
    var _useState51 = (0, _react.useState)(1),
      _useState52 = (0, _slicedToArray2.default)(_useState51, 2),
      tempStayAdults = _useState52[0],
      setTempStayAdults = _useState52[1];
    var _useState53 = (0, _react.useState)(0),
      _useState54 = (0, _slicedToArray2.default)(_useState53, 2),
      tempStayChildren = _useState54[0],
      setTempStayChildren = _useState54[1];
    var _useState55 = (0, _react.useState)(false),
      _useState56 = (0, _slicedToArray2.default)(_useState55, 2),
      isStayGuestModalOpen = _useState56[0],
      setIsStayGuestModalOpen = _useState56[1];

    // Helper date formatters for Stay
    var formatStayDateDisplay = (0, _react.useCallback)(date => {
      if (!date) return '';
      var d = new Date(date);
      var day = String(d.getDate()).padStart(2, '0');
      var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${day} ${monthNames[d.getMonth()]}, ${dayNames[d.getDay()]}`;
    }, []);
    var formatStayDateShort = (0, _react.useCallback)(date => {
      if (!date) return '';
      var d = new Date(date);
      var day = String(d.getDate()).padStart(2, '0');
      var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[d.getMonth()]}`;
    }, []);
    var tempCalculatedStayNights = (0, _react.useMemo)(() => {
      if (!tempStayCheckInDate || !tempStayCheckOutDate) return 1;
      var diff = tempStayCheckOutDate.getTime() - tempStayCheckInDate.getTime();
      var nights = Math.round(diff / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 1;
    }, [tempStayCheckInDate, tempStayCheckOutDate]);
    var stayCalculatedNights = (0, _react.useMemo)(() => {
      if (!stayCheckInDate || !stayCheckOutDate) return 1;
      var diff = stayCheckOutDate.getTime() - stayCheckInDate.getTime();
      var nights = Math.round(diff / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 1;
    }, [stayCheckInDate, stayCheckOutDate]);
    var lastProcessedParamsRef = (0, _react.useRef)(null);

    // Sync category state ONLY when new navigation params are explicitly passed from outside (e.g. from HomeDashboard)
    (0, _react.useEffect)(() => {
      var targetCat = route.params?.category || route.params?.categoryName;
      if (targetCat && route.params !== lastProcessedParamsRef.current) {
        lastProcessedParamsRef.current = route.params;
        var mappedCat = targetCat === 'Products' ? 'Product' : targetCat === 'Jobs' ? 'Job' : targetCat;
        setSelectedMainCategory(mappedCat);
        if (mappedCat === 'Stay') {
          setStaySearchSubmitted(false);
        }
        if (route.params?.subCategoryName) {
          setSelectedSubcategory(route.params.subCategoryName);
        }
        setFilters(prev => ({
          ...prev,
          categoryType: mappedCat
        }));
      }
    }, [route.params]);

    // Applied Filters State & Draft Filter State
    var _useState57 = (0, _react.useState)(DEFAULT_FILTERS),
      _useState58 = (0, _slicedToArray2.default)(_useState57, 2),
      filters = _useState58[0],
      setFilters = _useState58[1];
    var _useState59 = (0, _react.useState)(DEFAULT_FILTERS),
      _useState60 = (0, _slicedToArray2.default)(_useState59, 2),
      draftFilters = _useState60[0],
      setDraftFilters = _useState60[1];
    var _useState61 = (0, _react.useState)(false),
      _useState62 = (0, _slicedToArray2.default)(_useState61, 2),
      isFilterModalOpen = _useState62[0],
      setIsFilterModalOpen = _useState62[1];

    // Dynamic Vendor Products/Items State (hydrated from ProductStore if available)
    var _useState63 = (0, _react.useState)(function() {
      try {
        var ps = require('../../store/productStore');
        var prods = ps.useProductStore.getState().products;
        return (prods && prods.length > 0) ? prods : [];
      } catch (_e) {
        return [];
      }
    }),
      _useState64 = (0, _slicedToArray2.default)(_useState63, 2),
      apiProducts = _useState64[0],
      setApiProducts = _useState64[1];

    // Filtered Results for Dynamic Stay Destination Search Modal
    var filteredStayDestResults = (0, _react.useMemo)(() => {
      var q = stayDestSearchQuery.trim().toLowerCase();
      if (!q) return [];
      var results = [];
      var catalog = ['Bangalore', 'Mumbai', 'Chennai', 'Goa', 'Ooty', 'Hyderabad', 'Delhi', 'Jaipur', 'Coimbatore', 'Kodaikanal', 'Jntu, Hyderabad', 'Whitefield, Bangalore', 'Indiranagar, Bangalore', 'Koramangala, Bangalore', 'T Nagar, Chennai', 'Hitec City, Hyderabad', 'Banjara Hills, Hyderabad', 'Calangute, Goa', 'Baga, Goa', 'Panjim, Goa'];
      catalog.forEach(item => {
        if (item.toLowerCase().includes(q)) {
          results.push({
            title: item,
            subtitle: item.includes(',') ? 'Area / Landmark' : 'Popular City',
            type: item.includes(',') ? 'area' : 'city'
          });
        }
      });
      apiProducts.forEach(p => {
        var pCat = String(p.category || p.vendorType || '').toLowerCase();
        if (pCat.includes('stay') || pCat.includes('hotel')) {
          var hName = p.name || p.hotelName || p.businessName;
          var hCity = p.city || p.location;
          if (hName && hName.toLowerCase().includes(q) && !results.some(r => r.title.toLowerCase() === hName.toLowerCase())) {
            results.push({
              title: hName,
              subtitle: hCity ? `${hCity} • Verified Property` : 'Verified Hotel Property',
              type: 'hotel'
            });
          }
        }
      });
      return results;
    }, [stayDestSearchQuery, apiProducts]);

    // Search Results for Travel Portal
    var travelSearchResults = (0, _react.useMemo)(() => {
      var list: any[] = [];

      // dynamically map vendor products with category === 'Travel'
      apiProducts.forEach(p => {
        if (p.category === 'Travel' || p.categoryName === 'Travel' || p.categoryKey === 'Travel' || p.busSchedule || p.boardingPoints || p.droppingPoints) {
          var rawType = (p.vehicleType || p.subCategory || 'Bus').toLowerCase();
          var vType = rawType.includes('bike') ? 'Bike' : rawType.includes('cab') || rawType.includes('car') || rawType.includes('taxi') ? 'Cab' : 'Bus';
          var bps = Array.isArray(p.boardingPoints) ? p.boardingPoints.map(bp => typeof bp === 'string' ? bp : `${bp.point || bp.city || 'Pickup'}${bp.time ? ` (${bp.time})` : ''}`) : ['Central Hub'];
          var dps = Array.isArray(p.droppingPoints) ? p.droppingPoints.map(dp => typeof dp === 'string' ? dp : `${dp.point || dp.city || 'Drop'}${dp.time ? ` (${dp.time})` : ''}`) : ['Destination Hub'];
          var origin = p.from || p.origin || (typeof p.boardingPoints?.[0] === 'string' ? p.boardingPoints[0].split('(')[0].trim() : p.boardingPoints?.[0]?.city || p.boardingPoints?.[0]?.point) || 'Bangalore';
          var destination = p.to || p.destination || (typeof p.droppingPoints?.[0] === 'string' ? p.droppingPoints[0].split('(')[0].trim() : p.droppingPoints?.[0]?.city || p.droppingPoints?.[0]?.point) || 'Chennai';
          list.push({
            id: p._id || p.id || String(Math.random()),
            name: p.name || `${p.businessName || 'Express'} ${vType}`,
            operator: p.operator || p.operatorName || p.businessName || p.vendorName || 'Verified Operator',
            type: vType,
            vehicleNumber: p.vehicleNumber || p.vehicleRegNo || p.busNumber || '',
            subType: p.subType || p.busType || p.vehicleModel || (vType === 'Bus' ? 'AC Sleeper' : vType === 'Cab' ? 'Sedan Cab' : 'Rental Bike'),
            from: origin,
            to: destination,
            departureTime: p.departureTime || p.boardingTime || p.busSchedule?.departureTime || '21:30',
            arrivalTime: p.arrivalTime || p.busSchedule?.arrivalTime || '05:30',
            duration: p.duration || p.busSchedule?.duration || (typeof p.busSchedule === 'string' ? p.busSchedule : '8h 00m'),
            price: Number(p.price || 799),
            originalPrice: Number(p.originalPrice || Math.round((Number(p.price) || 799) * 1.25)),
            rating: Number(p.rating || 4.8),
            reviewsCount: Number(p.reviewsCount || 42),
            seatsLeft: Number(p.stock || p.availableSeats || p.seatsLeft || 12),
            capacity: p.capacity || (vType === 'Cab' ? '4 Seats' : vType === 'Bike' ? '2 Riders' : `${p.stock || 12} Sleeper Berths`),
            boardingPoints: bps,
            droppingPoints: dps,
            amenities: Array.isArray(p.amenities) && p.amenities.length > 0 ? p.amenities : Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0 ? p.selectedAmenities : ['AC Sleeper', 'Live GPS Tracking', 'Charging Point'],
            badge: p.badge || 'Vendor Verified',
            image: p.image || p.imageUrl || p.images?.[0] || (vType === 'Bus' ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=70' : vType === 'Cab' ? 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&auto=format&fit=crop&q=70' : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&auto=format&fit=crop&q=70'),
            rawProduct: p
          });
        }
      });
      var cleanFrom = travelFrom.trim().toLowerCase();
      var cleanTo = travelTo.trim().toLowerCase();
      var currentType = travelVehicleType;
      return list.filter(item => {
        // 1. Vehicle Type Match
        if (item.type !== currentType) return false;

        // 2. Query search filter (if search bar is typed)
        if (searchQuery.trim()) {
          var q = searchQuery.trim().toLowerCase();
          var matchesQuery = item.name.toLowerCase().includes(q) || item.operator.toLowerCase().includes(q) || item.from.toLowerCase().includes(q) || item.to.toLowerCase().includes(q);
          if (!matchesQuery) return false;
        }

        // 3. From filter (if entered)
        if (cleanFrom) {
          var fromMatches = item.from.toLowerCase().includes(cleanFrom) || item.name.toLowerCase().includes(cleanFrom) || item.boardingPoints.some(bp => bp.toLowerCase().includes(cleanFrom));
          if (!fromMatches) return false;
        }

        // 4. To filter (if entered)
        if (cleanTo) {
          var toMatches = item.to.toLowerCase().includes(cleanTo) || item.name.toLowerCase().includes(cleanTo) || item.droppingPoints.some(dp => dp.toLowerCase().includes(cleanTo));
          if (!toMatches) return false;
        }
        return true;
      });
    }, [travelFrom, travelTo, travelVehicleType, apiProducts, searchQuery]);
    var handleBookTravelItem = item => {
      if (item.rawProduct) {
        navigation.navigate('ProductDetails', {
          productId: item.rawProduct.id || item.rawProduct._id,
          product: item.rawProduct,
          item: item.rawProduct
        });
      } else {
        navigation.navigate('CategoryDetails', {
          categoryName: 'Travel',
          subCategoryName: item.subType || 'All',
          from: item.from,
          to: item.to,
          routeInfo: `${item.from} to ${item.to}`,
          travelItem: item
        });
      }
    };
    (0, _react.useEffect)(() => {
      var isMounted = true;
      var loadDynamicProducts = /*#__PURE__*/function () {
        var _ref = (0, _asyncToGenerator2.default)(function* () {
          try {
            // skipCache:true ensures vendor-added products appear immediately
            var res = yield (0, ApiModule.apiFetch)('/products', {
              skipCache: true
            }).catch(() => null);
            var list = [];
            if (res) {
              if (Array.isArray(res.data) && res.data.length > 0) list = res.data;else if (Array.isArray(res.products) && res.products.length > 0) list = res.products;else if (Array.isArray(res.items) && res.items.length > 0) list = res.items;else if (Array.isArray(res) && res.length > 0) list = res;
            }
            if (list.length === 0) {
              var vRes = yield (0, ApiModule.apiFetch)('/vendor/products', {
                skipCache: true
              }).catch(() => null);
              if (vRes) {
                if (Array.isArray(vRes.data) && vRes.data.length > 0) list = vRes.data;else if (Array.isArray(vRes.products) && vRes.products.length > 0) list = vRes.products;else if (Array.isArray(vRes) && vRes.length > 0) list = vRes;
              }
            }
            if (isMounted && list && list.length > 0) {
              setApiProducts(list);
            }
            try {
              var ps = require('../../store/productStore');
              var hier = yield ps.useProductStore.getState().loadCategoryHierarchy(false);
              if (hier && SidebarDataModule.updateSidebarData) {
                SidebarDataModule.updateSidebarData(hier);
              }
            } catch (_he) {}
          } catch (err) {
            console.warn('[Categories] Error loading dynamic products:', err);
          }
        });
        return function loadDynamicProducts() {
          return _ref.apply(this, arguments);
        };
      }();

      // Re-fetch every time screen is focused so vendor-added items show immediately
      if (isFocused) {
        loadDynamicProducts();
      }
      return () => {
        isMounted = false;
      };
    }, [isFocused]);

    // Accordion expansion state in Filter Modal
    var _useState65 = (0, _react.useState)('sort'),
      _useState66 = (0, _slicedToArray2.default)(_useState65, 2),
      expandedSection = _useState66[0],
      setExpandedSection = _useState66[1];

    // Voice Search States
    var _useState67 = (0, _react.useState)(false),
      _useState68 = (0, _slicedToArray2.default)(_useState67, 2),
      isVoiceListening = _useState68[0],
      setIsVoiceListening = _useState68[1];
    var voiceTimeoutRef = (0, _react.useRef)(null);
    var searchInputRef = (0, _react.useRef)(null);
    var showToast = (0, ToastStore.useToastStore)(state => state.showToast);
    var wave1 = (0, _react.useRef)(new _reactNative.Animated.Value(6)).current;
    var wave2 = (0, _react.useRef)(new _reactNative.Animated.Value(14)).current;
    var wave3 = (0, _react.useRef)(new _reactNative.Animated.Value(10)).current;
    var wave4 = (0, _react.useRef)(new _reactNative.Animated.Value(18)).current;

    // Cart & Notification Store
    var _useState69 = (0, _react.useState)(false),
      _useState70 = (0, _slicedToArray2.default)(_useState69, 2),
      isCartVisible = _useState70[0],
      setIsCartVisible = _useState70[1];
    var cartItems = (0, CartStore.useCartStore)(state => state.cartItems);
    var totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    var unreadNotifCount = (0, NotificationStore.useNotificationStore)(state => state.unreadCount);

    // Helper to toggle accordion sections smoothly
    var toggleAccordion = sectionKey => {
      _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSection(prev => prev === sectionKey ? null : sectionKey);
    };

    // Helper to calculate total active filter count
    var activeFilterCount = (0, _react.useMemo)(() => {
      var count = 0;
      if (filters.categoryType !== 'All') count++;

      // Subcategories & Child Categories
      var nonAllSubs = (filters.subCategories || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllSubs.length > 0) count += nonAllSubs.length;else if (filters.subCategory && filters.subCategory.toLowerCase() !== 'all') count++;
      var nonAllChildren = (filters.childCategories || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllChildren.length > 0) count += nonAllChildren.length;else if (filters.childCategory && filters.childCategory.toLowerCase() !== 'all') count++;
      if (filters.sortBy !== 'recommended') count++;
      if (filters.priceRange !== 'all') count++;
      if (filters.rating !== 'all') count++;
      if (filters.availability.length > 0) count += filters.availability.length;
      if (filters.distance !== 'all') count++;
      if (filters.offers.length > 0) count += filters.offers.length;

      // Food
      var nonAllDiet = (filters.foodDietaries || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllDiet.length > 0) count += nonAllDiet.length;else if (filters.foodDietary && filters.foodDietary !== 'all') count++;
      var nonAllCuisines = (filters.foodCuisines || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllCuisines.length > 0) count += nonAllCuisines.length;else if (filters.foodCuisine && filters.foodCuisine !== 'all') count++;
      if (filters.foodDeliverySpeed && filters.foodDeliverySpeed !== 'all') count++;

      // Stay
      var nonAllStayProps = (filters.stayPropertyTypes || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllStayProps.length > 0) count += nonAllStayProps.length;else if (filters.stayPropertyType && filters.stayPropertyType !== 'all') count++;
      var nonAllStayClasses = (filters.stayRoomClasses || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllStayClasses.length > 0) count += nonAllStayClasses.length;else if (filters.stayRoomClass && filters.stayRoomClass !== 'all') count++;
      if (filters.stayGuests && filters.stayGuests !== 'all') count++;
      if (filters.stayAmenities && filters.stayAmenities.length > 0) count += filters.stayAmenities.length;

      // Travel
      var nonAllBusClasses = (filters.travelBusClasses || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllBusClasses.length > 0) count += nonAllBusClasses.length;else if (filters.travelBusClass && filters.travelBusClass !== 'all') count++;
      var nonAllSlots = (filters.travelDepartureSlots || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllSlots.length > 0) count += nonAllSlots.length;else if (filters.travelDepartureSlot && filters.travelDepartureSlot !== 'all') count++;
      if (filters.travelAmenities && filters.travelAmenities.length > 0) count += filters.travelAmenities.length;

      // Job
      var nonAllJobTypes = (filters.jobTypes || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllJobTypes.length > 0) count += nonAllJobTypes.length;else if (filters.jobTypeFilter && filters.jobTypeFilter !== 'all') count++;
      var nonAllJobExps = (filters.jobExperiences || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllJobExps.length > 0) count += nonAllJobExps.length;else if (filters.jobExperience && filters.jobExperience !== 'all') count++;
      if (filters.jobSalary && filters.jobSalary !== 'all') count++;
      var nonAllJobModes = (filters.jobWorkModes || []).filter(x => x.toLowerCase() !== 'all');
      if (nonAllJobModes.length > 0) count += nonAllJobModes.length;else if (filters.jobWorkMode && filters.jobWorkMode !== 'all') count++;

      // Services
      if (filters.serviceTypeFilter && filters.serviceTypeFilter !== 'all') count++;
      if (filters.serviceBookingType && filters.serviceBookingType !== 'all') count++;

      // Products
      if (filters.productDepartment && filters.productDepartment !== 'all') count++;
      if (filters.productStockOnly) count++;

      // Daily Needs
      if (filters.dailyNeedsSection && filters.dailyNeedsSection !== 'all') count++;
      if (filters.dailyNeedsFreshness && filters.dailyNeedsFreshness !== 'all') count++;
      return count;
    }, [filters]);

    // Voice waveform animation
    (0, _react.useEffect)(() => {
      var animLoop = null;
      if (isVoiceListening) {
        animLoop = _reactNative.Animated.loop(_reactNative.Animated.parallel([_reactNative.Animated.sequence([_reactNative.Animated.timing(wave1, {
          toValue: 18,
          duration: 260,
          useNativeDriver: false
        }), _reactNative.Animated.timing(wave1, {
          toValue: 6,
          duration: 260,
          useNativeDriver: false
        })]), _reactNative.Animated.sequence([_reactNative.Animated.timing(wave2, {
          toValue: 8,
          duration: 220,
          useNativeDriver: false
        }), _reactNative.Animated.timing(wave2, {
          toValue: 22,
          duration: 220,
          useNativeDriver: false
        })]), _reactNative.Animated.sequence([_reactNative.Animated.timing(wave3, {
          toValue: 20,
          duration: 280,
          useNativeDriver: false
        }), _reactNative.Animated.timing(wave3, {
          toValue: 6,
          duration: 280,
          useNativeDriver: false
        })]), _reactNative.Animated.sequence([_reactNative.Animated.timing(wave4, {
          toValue: 8,
          duration: 200,
          useNativeDriver: false
        }), _reactNative.Animated.timing(wave4, {
          toValue: 18,
          duration: 200,
          useNativeDriver: false
        })])]));
        animLoop.start();
      } else {
        wave1.setValue(6);
        wave2.setValue(14);
        wave3.setValue(10);
        wave4.setValue(18);
      }
      return () => {
        if (animLoop) animLoop.stop();
      };
    }, [isVoiceListening, wave1, wave2, wave3, wave4]);

    // Register real Android Speech Recognition Listeners
    (0, _react.useEffect)(() => {
      function onSpeechPartialResults(e) {
        var partialText = Array.isArray(e?.value) ? e.value[0] : typeof e?.value === 'string' ? e.value : '';
        if (partialText) {
          setSearchQuery(partialText);
        }
      }
      function onSpeechResults(e) {
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        var text = Array.isArray(e?.value) ? e.value[0] : typeof e?.value === 'string' ? e.value : e?.results?.[0] || '';
        if (text) {
          setSearchQuery(text);
          setIsVoiceListening(false);
          showToast(`Voice search: "${text}"`);
        }
      }
      function onSpeechError(e) {
        console.warn('[Categories Voice] Speech error:', e.error);
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setIsVoiceListening(false);
        showToast("Couldn't hear clearly. Type to search.");
        setTimeout(() => searchInputRef.current?.focus(), 200);
      }
      function onSpeechEnd() {
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setIsVoiceListening(false);
      }
      (0, SafeVoiceModule.setupVoiceListeners)({
        onSpeechPartialResults,
        onSpeechResults,
        onSpeechError,
        onSpeechEnd
      });
      return () => {
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
        }
        (0, SafeVoiceModule.cleanupVoiceListeners)();
      };
    }, [showToast]);
    var stopVoiceListening = /*#__PURE__*/function () {
      var _ref2 = (0, _asyncToGenerator2.default)(function* () {
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        try {
          yield (0, SafeVoiceModule.stopVoiceRecording)();
        } catch (e) {
          console.warn('Voice stop error:', e);
        } finally {
          setIsVoiceListening(false);
        }
      });
      return function stopVoiceListening() {
        return _ref2.apply(this, arguments);
      };
    }();
    var handleMicPress = /*#__PURE__*/function () {
      var _ref3 = (0, _asyncToGenerator2.default)(function* () {
        if (isVoiceListening) {
          stopVoiceListening();
          return;
        }
        try {
          var isGranted = true;
          if ("android" === 'android') {
            var granted = yield _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
              title: 'Microphone Permission',
              message: 'Connect Mobile needs microphone access for voice search.',
              buttonNeutral: 'Ask Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow'
            });
            isGranted = granted === _reactNative.PermissionsAndroid.RESULTS.GRANTED;
          }
          if (isGranted) {
            setIsVoiceListening(true);
            setSearchQuery('');
            showToast('Listening... Speak now 🎙️');
            if (voiceTimeoutRef.current) {
              clearTimeout(voiceTimeoutRef.current);
            }
            voiceTimeoutRef.current = setTimeout(() => {
              (0, SafeVoiceModule.stopVoiceRecording)().catch(() => {});
              setIsVoiceListening(false);
              showToast('Voice timeout. Type your search below.');
              setTimeout(() => searchInputRef.current?.focus(), 200);
            }, 7000);
            try {
              yield (0, SafeVoiceModule.startVoiceRecording)('en-IN');
            } catch (vErr) {
              console.warn('Voice start error:', vErr);
              if (voiceTimeoutRef.current) {
                clearTimeout(voiceTimeoutRef.current);
                voiceTimeoutRef.current = null;
              }
              setIsVoiceListening(false);
              showToast('Voice search unavailable on this device. Type to search.', 'Focus Input', () => {
                searchInputRef.current?.focus();
              });
              setTimeout(() => searchInputRef.current?.focus(), 200);
            }
          } else {
            _reactNative.Alert.alert('Microphone Permission Required', 'Please enable microphone access in device settings to use voice search.', [{
              text: 'Cancel',
              style: 'cancel'
            }, {
              text: 'Open Settings',
              onPress: () => _reactNative.Linking.openSettings()
            }]);
          }
        } catch {
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
          }
          setIsVoiceListening(false);
          showToast("Couldn't start microphone. Type to search.");
          setTimeout(() => searchInputRef.current?.focus(), 200);
        }
      });
      return function handleMicPress() {
        return _ref3.apply(this, arguments);
      };
    }();

    // Helper to map Sidebar keys to user-facing category route name
    var getMappedCategoryRoute = key => {
      if (key === 'Product') return 'Products';
      if (key === 'Job') return 'Jobs';
      return key;
    };

    // Helper to retrieve all available subcategories for any selected category based on Vendor App hierarchy
    var getAvailableSubcategoriesForCategory = catKey => {
      var set = new Set();
      var targetMain = catKey === 'Products' ? 'Product' : catKey === 'Jobs' ? 'Job' : catKey;
      if (targetMain === 'Job') {
        // 1:1 with Vendor App Jobs hierarchy
        Object.keys(VENDOR_HIERARCHY.Job).forEach(s => set.add(s));
      } else if (targetMain === 'Product') {
        Object.keys(VENDOR_HIERARCHY.Product).forEach(s => set.add(s));
      } else if (targetMain === 'Services') {
        Object.keys(VENDOR_HIERARCHY.Services).forEach(s => set.add(s));
      } else if (targetMain === 'Daily Needs') {
        Object.keys(VENDOR_HIERARCHY['Daily Needs']).forEach(s => set.add(s));
      } else if (targetMain === 'All') {
        Object.values(VENDOR_HIERARCHY).forEach(group => {
          Object.keys(group).forEach(s => set.add(s));
        });
      }

      // Also collect dynamic subcategories from apiProducts
      apiProducts.forEach(p => {
        var rawCat = p.category || p.vendorType || '';
        var mappedCat = rawCat === 'Products' ? 'Product' : rawCat === 'Jobs' ? 'Job' : rawCat;
        var normalize = s => String(s || '').trim().toLowerCase().replace(/s$/, '');
        if (targetMain === 'All' || normalize(mappedCat) === normalize(targetMain)) {
          var sub = p.subCategory || p.subcategory;
          if (sub && typeof sub === 'string' && sub.trim()) {
            set.add(sub.trim());
          }
        }
      });
      return ['All', ...Array.from(set)];
    };

    // Helper to retrieve all available child categories / roles based on Vendor App hierarchy
    var getAvailableChildCategories = (catKey, subCatInput) => {
      var set = new Set();
      var targetMain = catKey === 'Products' ? 'Product' : catKey === 'Jobs' ? 'Job' : catKey;
      var selectedSubs = Array.isArray(subCatInput) ? subCatInput : [subCatInput || 'All'];
      var isAllSubs = selectedSubs.includes('All') || selectedSubs.length === 0;
      var vData = VENDOR_HIERARCHY[targetMain];
      if (vData) {
        if (!isAllSubs) {
          selectedSubs.forEach(subKey => {
            var matchKey = Object.keys(vData).find(k => k.toLowerCase() === subKey.toLowerCase() || k.toLowerCase().includes(subKey.toLowerCase()) || subKey.toLowerCase().includes(k.toLowerCase()));
            if (matchKey && vData[matchKey]) {
              vData[matchKey].forEach(role => set.add(role));
            }
          });
        } else {
          Object.values(vData).forEach(roles => {
            roles.forEach(role => set.add(role));
          });
        }
      }

      // Also collect dynamic childCategory / itemType from apiProducts
      apiProducts.forEach(p => {
        var rawCat = p.category || p.vendorType || '';
        var mappedCat = rawCat === 'Products' ? 'Product' : rawCat === 'Jobs' ? 'Job' : rawCat;
        var normalize = s => String(s || '').trim().toLowerCase().replace(/s$/, '');
        if (targetMain === 'All' || normalize(mappedCat) === normalize(targetMain)) {
          var pSub = p.subCategory || p.subcategory || '';
          var matchSub = isAllSubs || selectedSubs.some(s => {
            var cleanS = normalize(s);
            var cleanP = normalize(pSub);
            return cleanP === cleanS || cleanP.includes(cleanS) || cleanS.includes(cleanP);
          });
          if (matchSub) {
            var cCat = p.itemType || p.childCategory || p.role;
            if (cCat && typeof cCat === 'string' && cCat.trim()) {
              set.add(cCat.trim());
            }
          }
        }
      });
      return ['All', ...Array.from(set)];
    };

    // Sidebar items list (memoized to prevent redundant iterations on every render)
    var leftSidebarItems = (0, _react.useMemo)(() => {
      var items = [{
        name: 'All Categories',
        key: 'All'
      }];
      var targetMainCat = filters.categoryType !== 'All' ? filters.categoryType : selectedMainCategory;
      if (targetMainCat === 'All') {
        Object.keys(SidebarDataModule.SIDEBAR_DATA).forEach(catKey => {
          var catData = SidebarDataModule.SIDEBAR_DATA[catKey];
          if (catData && catData.subcategories) {
            Object.keys(catData.subcategories).forEach(subName => {
              var displayName = subName === 'IT' ? 'IT Jobs' : subName;
              if (!items.some(x => x.key === subName)) {
                items.push({
                  name: displayName,
                  key: subName
                });
              }
            });
          }
        });
      } else {
        var catData = SidebarDataModule.SIDEBAR_DATA[targetMainCat];
        if (catData && catData.subcategories) {
          Object.keys(catData.subcategories).forEach(subName => {
            items.push({
              name: subName,
              key: subName
            });
          });
        }
      }
      return items;
    }, [filters.categoryType, selectedMainCategory]);
    var getLeftSidebarItems = () => leftSidebarItems;

    // Compile items for the right grid based on searchQuery, category selection, and active filters
    var getFilteredItems = filterState => {
      var query = searchQuery.toLowerCase().trim();
      var targetMainCat = filterState.categoryType !== 'All' ? filterState.categoryType : selectedMainCategory;
      var effectiveSubs = filterState.subCategories && filterState.subCategories.length > 0 ? filterState.subCategories : filterState.subCategory && filterState.subCategory !== 'All' ? [filterState.subCategory] : selectedSubcategory !== 'All' ? [selectedSubcategory] : ['All'];
      var isAllSubs = effectiveSubs.length === 0 || effectiveSubs.some(s => s.toLowerCase() === 'all');
      var effectiveChildren = filterState.childCategories && filterState.childCategories.length > 0 ? filterState.childCategories : filterState.childCategory && filterState.childCategory !== 'All' ? [filterState.childCategory] : ['All'];
      var isAllChildren = effectiveChildren.length === 0 || effectiveChildren.some(c => c.toLowerCase() === 'all');
      var list = [];
      var normalizeSub = s => String(s || '').replace(/(?:[\u2600-\u26FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDEFF])/g, '').replace(/[^\w\s]/gi, '').trim().toLowerCase();

      // Only map real dynamic products on Categories screen if an active search query is entered
      if (query) {
        apiProducts.forEach(p => {
          var pCatRaw = String(p.category || p.vendorType || 'Products').trim();
          var pCatMapped = getMappedCategoryRoute(pCatRaw);
          var normalizeCat = c => String(c || '').trim().toLowerCase().replace(/s$/, '');
          var matchCat = targetMainCat === 'All' || normalizeCat(pCatMapped) === normalizeCat(targetMainCat) || normalizeCat(pCatRaw) === normalizeCat(targetMainCat) || normalizeCat(targetMainCat) === 'product' && (normalizeCat(pCatRaw) === 'product' || normalizeCat(pCatRaw) === 'electronic');
          if (!matchCat) return;
          var pName = p.name || p.product_details || 'Vendor Product';
          var pSubName = p.subCategory || p.subcategory || p.itemType || 'General';
          var pNameLow = pName.toLowerCase();
          var pSubLow = pSubName.toLowerCase();
          var cleanSub = normalizeSub(pSubName);
          var matchSub = isAllSubs || effectiveSubs.some(selSub => {
            var cleanSelected = normalizeSub(selSub);
            return cleanSub === cleanSelected || cleanSub.includes(cleanSelected) || cleanSelected.includes(cleanSub) || cleanSelected.includes('snack') && (cleanSub.includes('snack') || pNameLow.includes('lay')) || cleanSelected === 'electronics' && (cleanSub.includes('electronic') || cleanSub.includes('laptop') || cleanSub.includes('mobile') || cleanSub.includes('phone') || cleanSub.includes('charger') || cleanSub.includes('watch'));
          });
          if (!matchSub) return;
          if (!isAllChildren) {
            var pChild = p.itemType || p.childCategory || p.role || '';
            var cleanChild = normalizeSub(pChild);
            var matchChild = effectiveChildren.some(selChild => {
              var cleanTargetChild = normalizeSub(selChild);
              return cleanChild === cleanTargetChild || cleanChild.includes(cleanTargetChild) || cleanTargetChild.includes(cleanChild) || normalizeSub(pName).includes(cleanTargetChild);
            });
            if (!matchChild) return;
          }
          var matchesQuery = !query || pNameLow.includes(query) || pSubLow.includes(query) || pCatMapped.toLowerCase().includes(query);
          if (!matchesQuery) return;
          var rawImg = p.image || p.imageUrl || DEFAULT_IMAGE;
          var imgUri = (0, ApiModule.resolveImageUrl)(rawImg) || DEFAULT_IMAGE;
          var rating = Number(p.rating) || 0;
          var priceNum = typeof p.price === 'number' ? p.price : Number(String(p.price || 0).replace(/[^\d]/g, ''));
          var distanceKm = 1.0;
          var isInstant = true;

          // Common Rating Filter
          if (filterState.rating === '4.5' && rating < 4.5) return;
          if (filterState.rating === '4.0' && rating < 4.0) return;
          if (filterState.rating === '3.5' && rating < 3.5) return;
          if (filterState.rating === '3.0' && rating < 3.0) return;

          // Common Price Filter
          if (filterState.priceRange === 'under_500' && priceNum >= 500) return;
          if (filterState.priceRange === '500_2000' && (priceNum < 500 || priceNum > 2000)) return;
          if (filterState.priceRange === '2000_10000' && (priceNum < 2000 || priceNum > 10000)) return;
          if (filterState.priceRange === 'above_10000' && priceNum < 10000) return;

          // Common Availability Filter
          if (filterState.availability.includes('in_stock') && p.stock === '0') return;
          if (filterState.availability.includes('instant_booking') && !isInstant) return;

          // ==========================================
          // Category-Specific Filtering (apiProducts)
          // ==========================================

          // 1. FOOD Filters
          if (targetMainCat === 'Food' || pCatMapped === 'Food') {
            var effectiveDietaries = (filterState.foodDietaries || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveDietaries.length > 0) {
              var isNonVeg = p.veg === false || p.foodType && p.foodType.toLowerCase().includes('non') || pNameLow.includes('chicken') || pNameLow.includes('mutton') || pNameLow.includes('fish') || pNameLow.includes('meat');
              var matchesAnyDiet = effectiveDietaries.some(d => {
                if (d === 'veg' && !isNonVeg) return true;
                if (d === 'non_veg' && isNonVeg) return true;
                if (d === 'egg' && pNameLow.includes('egg')) return true;
                if (d === 'vegan' && !isNonVeg && !pNameLow.includes('milk') && !pNameLow.includes('paneer') && !pNameLow.includes('butter') && !pNameLow.includes('cheese') && !pNameLow.includes('ghee')) return true;
                if (d === 'beverages' && (pSubLow.includes('beverage') || pNameLow.includes('juice') || pNameLow.includes('tea') || pNameLow.includes('coffee') || pNameLow.includes('shake'))) return true;
                if (d === 'desserts' && (pSubLow.includes('dessert') || pNameLow.includes('cake') || pNameLow.includes('sweet') || pNameLow.includes('ice cream'))) return true;
                return false;
              });
              if (!matchesAnyDiet) return;
            } else if (filterState.foodDietary && filterState.foodDietary !== 'all') {
              var _isNonVeg = p.veg === false || p.foodType && p.foodType.toLowerCase().includes('non') || pNameLow.includes('chicken') || pNameLow.includes('mutton') || pNameLow.includes('fish') || pNameLow.includes('meat');
              if (filterState.foodDietary === 'veg' && _isNonVeg) return;
              if (filterState.foodDietary === 'non_veg' && !_isNonVeg) return;
              if (filterState.foodDietary === 'egg' && !pNameLow.includes('egg')) return;
              if (filterState.foodDietary === 'beverages' && !pSubLow.includes('beverage') && !pNameLow.includes('juice') && !pNameLow.includes('tea') && !pNameLow.includes('coffee') && !pNameLow.includes('shake')) return;
              if (filterState.foodDietary === 'desserts' && !pSubLow.includes('dessert') && !pNameLow.includes('cake') && !pNameLow.includes('sweet') && !pNameLow.includes('ice cream')) return;
            }
            var effectiveCuisines = (filterState.foodCuisines || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveCuisines.length > 0) {
              var matchesAnyCuisine = effectiveCuisines.some(c => {
                if (c === 'fast_food' && (pSubLow.includes('fast') || pNameLow.includes('burger') || pNameLow.includes('pizza') || pNameLow.includes('sandwich'))) return true;
                if (c === 'south_indian' && (pSubLow.includes('south') || pNameLow.includes('dosa') || pNameLow.includes('idli') || pNameLow.includes('vada'))) return true;
                if (c === 'north_indian' && (pSubLow.includes('north') || pNameLow.includes('roti') || pNameLow.includes('paneer') || pNameLow.includes('naan'))) return true;
                if (c === 'biryani' && (pNameLow.includes('biryani') || pSubLow.includes('biryani'))) return true;
                if (c === 'chinese' && (pSubLow.includes('chinese') || pNameLow.includes('noodle') || pNameLow.includes('fried rice'))) return true;
                if (c === 'pizza' && pNameLow.includes('pizza')) return true;
                if (c === 'bakery' && (pSubLow.includes('bakery') || pNameLow.includes('bread') || pNameLow.includes('cake'))) return true;
                return false;
              });
              if (!matchesAnyCuisine) return;
            } else if (filterState.foodCuisine && filterState.foodCuisine !== 'all') {
              var c = filterState.foodCuisine;
              if (c === 'fast_food' && !pSubLow.includes('fast') && !pNameLow.includes('burger') && !pNameLow.includes('pizza') && !pNameLow.includes('sandwich')) return;
              if (c === 'south_indian' && !pSubLow.includes('south') && !pNameLow.includes('dosa') && !pNameLow.includes('idli') && !pNameLow.includes('vada')) return;
              if (c === 'north_indian' && !pSubLow.includes('north') && !pNameLow.includes('roti') && !pNameLow.includes('paneer') && !pNameLow.includes('naan')) return;
              if (c === 'biryani' && !pNameLow.includes('biryani') && !pSubLow.includes('biryani')) return;
              if (c === 'chinese' && !pSubLow.includes('chinese') && !pNameLow.includes('noodle') && !pNameLow.includes('fried rice')) return;
              if (c === 'pizza' && !pNameLow.includes('pizza')) return;
              if (c === 'bakery' && !pSubLow.includes('bakery') && !pNameLow.includes('bread') && !pNameLow.includes('cake')) return;
            }
            if (filterState.foodDeliverySpeed === 'fast' && !isInstant) return;
          }

          // 2. STAY Filters
          if (targetMainCat === 'Stay' || pCatMapped === 'Stay') {
            var effectiveProps = (filterState.stayPropertyTypes || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveProps.length > 0) {
              var matchesAnyProp = effectiveProps.some(pt => {
                if (pt === 'hotel' && (pSubLow.includes('hotel') || pNameLow.includes('hotel'))) return true;
                if (pt === 'resort' && (pSubLow.includes('resort') || pNameLow.includes('resort'))) return true;
                if (pt === 'homestay' && (pSubLow.includes('home') || pNameLow.includes('home'))) return true;
                if (pt === 'villa' && (pSubLow.includes('villa') || pNameLow.includes('villa'))) return true;
                return false;
              });
              if (!matchesAnyProp) return;
            } else if (filterState.stayPropertyType && filterState.stayPropertyType !== 'all') {
              var pt = filterState.stayPropertyType;
              if (pt === 'hotel' && !pSubLow.includes('hotel') && !pNameLow.includes('hotel')) return;
              if (pt === 'resort' && !pSubLow.includes('resort') && !pNameLow.includes('resort')) return;
              if (pt === 'homestay' && !pSubLow.includes('home') && !pNameLow.includes('home')) return;
              if (pt === 'villa' && !pSubLow.includes('villa') && !pNameLow.includes('villa')) return;
            }
            var effectiveRoomClasses = (filterState.stayRoomClasses || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveRoomClasses.length > 0) {
              var rc = (p.roomClass || pName).toLowerCase();
              var matchesAnyClass = effectiveRoomClasses.some(cl => rc.includes(cl.toLowerCase()));
              if (!matchesAnyClass) return;
            } else if (filterState.stayRoomClass && filterState.stayRoomClass !== 'all') {
              var _rc = (p.roomClass || pName).toLowerCase();
              if (!_rc.includes(filterState.stayRoomClass.toLowerCase())) return;
            }
            if (filterState.stayGuests && filterState.stayGuests !== 'all') {
              var g = Number(p.numberOfGuests || '2');
              if (filterState.stayGuests === '1' && g !== 1) return;
              if (filterState.stayGuests === '2' && g !== 2) return;
              if (filterState.stayGuests === '3_4' && (g < 3 || g > 4)) return;
              if (filterState.stayGuests === '5_plus' && g < 5) return;
            }
            if (filterState.stayAmenities && filterState.stayAmenities.length > 0) {
              var pAmens = (p.selectedAmenities || p.amenities || []).map(a => a.toLowerCase());
              var hasAll = filterState.stayAmenities.every(req => pAmens.some(a => a.includes(req.toLowerCase())));
              if (!hasAll && pAmens.length > 0) return;
            }
          }

          // 3. TRAVEL Filters
          if (targetMainCat === 'Travel' || pCatMapped === 'Travel') {
            var effectiveBusClasses = (filterState.travelBusClasses || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveBusClasses.length > 0) {
              var bc = (p.busClass || p.subCategory || pName).toLowerCase();
              var matchesAnyBus = effectiveBusClasses.some(cl => {
                if (cl === 'ac_sleeper' && (bc.includes('ac sleeper') || bc.includes('sleeper'))) return true;
                if (cl === 'non_ac_sleeper' && (bc.includes('non-ac') || bc.includes('non ac'))) return true;
                if (cl === 'ac_seater' && bc.includes('seater')) return true;
                if (cl === 'volvo' && (bc.includes('volvo') || bc.includes('multi'))) return true;
                if (cl === 'luxury' && (bc.includes('luxury') || bc.includes('coach') || bc.includes('volvo'))) return true;
                return false;
              });
              if (!matchesAnyBus) return;
            } else if (filterState.travelBusClass && filterState.travelBusClass !== 'all') {
              var _bc = (p.busClass || p.subCategory || pName).toLowerCase();
              if (filterState.travelBusClass === 'ac_sleeper' && !_bc.includes('ac sleeper') && !_bc.includes('sleeper')) return;
              if (filterState.travelBusClass === 'non_ac_sleeper' && !_bc.includes('non-ac') && !_bc.includes('non ac')) return;
              if (filterState.travelBusClass === 'ac_seater' && !_bc.includes('seater')) return;
              if (filterState.travelBusClass === 'volvo' && !_bc.includes('volvo') && !_bc.includes('multi')) return;
            }
          }

          // 4. JOBS Filters
          if (targetMainCat === 'Job' || pCatMapped === 'Jobs') {
            var effectiveJobTypes = (filterState.jobTypes || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveJobTypes.length > 0) {
              var jt = String(p.jobType || '').trim().toLowerCase();
              var matchesAnyType = effectiveJobTypes.some(t => jt === t.toLowerCase() || jt.includes(t.toLowerCase()) || t.toLowerCase().includes(jt));
              if (!matchesAnyType && jt.length > 0) return;
            } else if (filterState.jobTypeFilter && filterState.jobTypeFilter !== 'all') {
              var _jt = String(p.jobType || '').trim().toLowerCase();
              if (_jt !== filterState.jobTypeFilter.toLowerCase() && _jt.length > 0) return;
            }
            var effectiveExps = (filterState.jobExperiences || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveExps.length > 0) {
              var exp = String(p.experienceRequired || '').toLowerCase();
              var matchesAnyExp = effectiveExps.some(item => {
                if (item === 'fresher' && (exp.includes('fresher') || exp.includes('0'))) return true;
                if (item === '1_2' && (exp.includes('1') || exp.includes('2'))) return true;
                if (item === '2_5' && (exp.includes('2') || exp.includes('3') || exp.includes('4') || exp.includes('5'))) return true;
                if (item === '5_plus' && (exp.includes('5') || exp.includes('6') || exp.includes('7') || exp.includes('8') || exp.includes('10'))) return true;
                return false;
              });
              if (!matchesAnyExp) return;
            } else if (filterState.jobExperience && filterState.jobExperience !== 'all') {
              var _exp = String(p.experienceRequired || '').toLowerCase();
              if (filterState.jobExperience === 'fresher' && !_exp.includes('fresher') && !_exp.includes('0')) return;
              if (filterState.jobExperience === '1_2' && !_exp.includes('1') && !_exp.includes('2')) return;
              if (filterState.jobExperience === '2_5' && !_exp.includes('2') && !_exp.includes('3') && !_exp.includes('4') && !_exp.includes('5')) return;
              if (filterState.jobExperience === '5_plus' && !_exp.includes('5') && !_exp.includes('6') && !_exp.includes('7')) return;
            }
            var effectiveModes = (filterState.jobWorkModes || []).filter(x => x.toLowerCase() !== 'all');
            if (effectiveModes.length > 0) {
              var loc = String(p.jobLocation || p.jobType || '').toLowerCase();
              var matchesAnyMode = effectiveModes.some(m => {
                if (m === 'remote' && (loc.includes('remote') || loc.includes('wfh'))) return true;
                if (m === 'in_office' && !loc.includes('remote')) return true;
                if (m === 'hybrid' && loc.includes('hybrid')) return true;
                return false;
              });
              if (!matchesAnyMode) return;
            } else if (filterState.jobWorkMode && filterState.jobWorkMode !== 'all') {
              var _loc = String(p.jobLocation || p.jobType || '').toLowerCase();
              if (filterState.jobWorkMode === 'remote' && !_loc.includes('remote') && !_loc.includes('wfh')) return;
              if (filterState.jobWorkMode === 'in_office' && _loc.includes('remote')) return;
              if (filterState.jobWorkMode === 'hybrid' && !_loc.includes('hybrid')) return;
            }
          }

          // 5. SERVICES Filters
          if (targetMainCat === 'Services' || pCatMapped === 'Services') {
            if (filterState.serviceTypeFilter && filterState.serviceTypeFilter !== 'all') {
              var st = filterState.serviceTypeFilter.replace('_', ' ').toLowerCase();
              if (!pSubLow.includes(st) && !pNameLow.includes(st)) return;
            }
            if (filterState.serviceBookingType === 'instant' && !isInstant) return;
          }

          // 6. PRODUCTS Filters
          if (targetMainCat === 'Product' || pCatMapped === 'Products') {
            if (filterState.productDepartment && filterState.productDepartment !== 'all') {
              var dept = filterState.productDepartment.toLowerCase();
              if (!pSubLow.includes(dept) && !pNameLow.includes(dept)) return;
            }
            if (filterState.productStockOnly && (p.stock === '0' || p.isActive === false)) return;
          }

          // 7. DAILY NEEDS Filters
          if (targetMainCat === 'Daily Needs' || pCatMapped === 'Daily Needs') {
            if (filterState.dailyNeedsSection && filterState.dailyNeedsSection !== 'all') {
              var sec = filterState.dailyNeedsSection.replace('_', ' ').toLowerCase();
              if (!pSubLow.includes(sec) && !pNameLow.includes(sec)) return;
            }
          }
          list.push({
            type: 'subcategory',
            categoryKey: pCatRaw,
            categoryName: pCatMapped,
            name: pName,
            count: p.price ? typeof p.price === 'number' ? `₹${p.price.toLocaleString('en-IN')}` : String(p.price) : 'In Stock',
            image: imgUri,
            rating,
            priceNum,
            distanceKm,
            isInstant,
            rawProduct: p
          });
        });
      }
      var seenSubKeys = new Set();
      Object.keys(SidebarDataModule.SIDEBAR_DATA).forEach(catKey => {
        if (targetMainCat !== 'All' && catKey !== targetMainCat && getMappedCategoryRoute(catKey) !== getMappedCategoryRoute(targetMainCat)) return;
        if (targetMainCat === 'All' && (catKey === 'Product' || catKey === 'Job' || catKey === 'Service')) return;
        if (targetMainCat !== 'All' && (catKey === 'Product' || catKey === 'Job' || catKey === 'Service') && targetMainCat !== catKey && SidebarDataModule.SIDEBAR_DATA[targetMainCat]) return;
        var catData = SidebarDataModule.SIDEBAR_DATA[catKey];
        var categoryName = getMappedCategoryRoute(catKey);
        if (catData.subcategories) {
          Object.keys(catData.subcategories).forEach((subName, sIdx) => {
            var matchSub = isAllSubs || effectiveSubs.some(s => s.toLowerCase() === subName.toLowerCase());
            if (!matchSub) return;
            var subData = catData.subcategories[subName];
            if (!isAllChildren && subData.items) {
              var hasChild = effectiveChildren.some(selChild => {
                var cleanTargetChild = normalizeSub(selChild);
                return subData.items.some(it => {
                  var cleanIt = normalizeSub(it);
                  return cleanIt.includes(cleanTargetChild) || cleanTargetChild.includes(cleanIt);
                }) || normalizeSub(subName) === cleanTargetChild;
              });
              if (!hasChild) return;
            }
            var subLow = subName.toLowerCase();
            var matchesQuery = !query || subLow.includes(query) || categoryName.toLowerCase().includes(query) || subData.items && subData.items.some(it => it.toLowerCase().includes(query));
            if (matchesQuery) {
              var imgUri = SUBCAT_IMAGES[subName] || DEFAULT_IMAGE;
              var rating = 0;
              var priceNum = 0;
              var distanceKm = 0;
              var isInstant = false;

              // Subcategory navigation tiles do not match product-specific filters
              if (filterState.rating && filterState.rating !== 'all') return;
              if (filterState.priceRange && filterState.priceRange !== 'all') return;
              if (filterState.distance && filterState.distance !== 'all') return;
              if (filterState.availability && filterState.availability.length > 0) return;

              // Category Specific Checks on Subcategories
              if (targetMainCat === 'Food' || categoryName === 'Food') {
                var effectiveCuisines = (filterState.foodCuisines || []).filter(x => x.toLowerCase() !== 'all');
                if (effectiveCuisines.length > 0) {
                  var matchesAny = effectiveCuisines.some(fc => {
                    if (fc === 'fast_food' && (subLow.includes('fast') || subLow.includes('cafe'))) return true;
                    if (fc === 'bakery' && (subLow.includes('bakery') || subLow.includes('dessert'))) return true;
                    return false;
                  });
                  if (!matchesAny) return;
                } else if (filterState.foodCuisine && filterState.foodCuisine !== 'all') {
                  var fc = filterState.foodCuisine;
                  if (fc === 'fast_food' && !subLow.includes('fast') && !subLow.includes('cafe')) return;
                  if (fc === 'bakery' && !subLow.includes('bakery') && !subLow.includes('dessert')) return;
                }
              } else if (targetMainCat === 'Stay' || categoryName === 'Stay') {
                var effectiveProps = (filterState.stayPropertyTypes || []).filter(x => x.toLowerCase() !== 'all');
                if (effectiveProps.length > 0) {
                  var _matchesAny = effectiveProps.some(pt => {
                    if (pt === 'hotel' && subLow.includes('hotel')) return true;
                    if (pt === 'resort' && subLow.includes('resort')) return true;
                    if (pt === 'homestay' && subLow.includes('home')) return true;
                    return false;
                  });
                  if (!_matchesAny) return;
                } else if (filterState.stayPropertyType && filterState.stayPropertyType !== 'all') {
                  var pt = filterState.stayPropertyType;
                  if (pt === 'hotel' && !subLow.includes('hotel')) return;
                  if (pt === 'resort' && !subLow.includes('resort')) return;
                  if (pt === 'homestay' && !subLow.includes('home')) return;
                }
              } else if (targetMainCat === 'Travel' || categoryName === 'Travel') {
                var effectiveBusClasses = (filterState.travelBusClasses || []).filter(x => x.toLowerCase() !== 'all');
                if (effectiveBusClasses.length > 0) {
                  var _matchesAny2 = effectiveBusClasses.some(cl => {
                    if (cl === 'ac_sleeper' && subLow.includes('sleeper')) return true;
                    if (cl === 'volvo' && subLow.includes('volvo')) return true;
                    return false;
                  });
                  if (!_matchesAny2) return;
                } else if (filterState.travelBusClass && filterState.travelBusClass !== 'all') {
                  if (filterState.travelBusClass === 'ac_sleeper' && !subLow.includes('sleeper')) return;
                  if (filterState.travelBusClass === 'volvo' && !subLow.includes('volvo')) return;
                }
              } else if (targetMainCat === 'Services' || categoryName === 'Services') {
                if (filterState.serviceTypeFilter && filterState.serviceTypeFilter !== 'all') {
                  var st = filterState.serviceTypeFilter.replace('_', ' ').toLowerCase();
                  if (!subLow.includes(st)) return;
                }
              } else if (targetMainCat === 'Product' || categoryName === 'Products') {
                if (filterState.productDepartment && filterState.productDepartment !== 'all') {
                  var dept = filterState.productDepartment.toLowerCase();
                  if (!subLow.includes(dept)) return;
                }
              } else if (targetMainCat === 'Daily Needs' || categoryName === 'Daily Needs') {
                if (filterState.dailyNeedsSection && filterState.dailyNeedsSection !== 'all') {
                  var sec = filterState.dailyNeedsSection.replace('_', ' ').toLowerCase();
                  if (!subLow.includes(sec)) return;
                }
              }
              var subUniqueKey = `${categoryName}_${subName}`;
              if (seenSubKeys.has(subUniqueKey)) return;
              seenSubKeys.add(subUniqueKey);
              var isJobCat = catKey === 'Job' || targetMainCat === 'Job' || categoryName === 'Jobs';
              var displayName = isJobCat ? subName === 'IT' ? 'IT Jobs' : subName.endsWith('Jobs') ? subName : `${subName} Jobs` : subName;
              var subItemCount = subData.items?.length || 0;
              var countLabel = isJobCat
                ? (subItemCount > 0 ? `${subItemCount} Roles` : 'Explore')
                : (subItemCount > 0 ? `${subItemCount} Types` : 'Explore');
              list.push({
                type: 'subcategory',
                categoryKey: catKey,
                categoryName,
                name: displayName,
                subKey: subName,
                count: countLabel,
                image: subData.banner || SUBCAT_IMAGES[displayName] || SUBCAT_IMAGES[subName] || imgUri,
                rating,
                priceNum,
                distanceKm,
                isInstant
              });
            }
          });
        }
      });

      // Sorting Logic
      if (filterState.sortBy === 'asc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filterState.sortBy === 'desc') {
        list.sort((a, b) => b.name.localeCompare(a.name));
      } else if (filterState.sortBy === 'rating_desc') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (filterState.sortBy === 'price_asc') {
        list.sort((a, b) => a.priceNum - b.priceNum);
      } else if (filterState.sortBy === 'price_desc') {
        list.sort((a, b) => b.priceNum - a.priceNum);
      } else if (filterState.sortBy === 'distance') {
        list.sort((a, b) => a.distanceKm - b.distanceKm);
      } else if (filterState.sortBy === 'popularity') {
        list.reverse();
      }
      return list;
    };
    var rightItems = (0, _react.useMemo)(() => getFilteredItems(filters), [filters, searchQuery, selectedMainCategory, selectedSubcategory, apiProducts]);
    var draftResultCount = (0, _react.useMemo)(() => getFilteredItems(draftFilters).length, [draftFilters, searchQuery, selectedMainCategory, selectedSubcategory, apiProducts]);
    var handleOpenFilterModal = () => {
      var activeCat = selectedMainCategory || 'All';
      var activeSub = filters.subCategory && filters.subCategory !== 'All' ? filters.subCategory : selectedSubcategory !== 'All' ? selectedSubcategory : 'All';
      var activeSubs = filters.subCategories && filters.subCategories.length > 0 ? filters.subCategories : activeSub !== 'All' ? [activeSub] : ['All'];
      var activeChildren = filters.childCategories && filters.childCategories.length > 0 ? filters.childCategories : filters.childCategory && filters.childCategory !== 'All' ? [filters.childCategory] : ['All'];
      setDraftFilters({
        ...filters,
        categoryType: activeCat,
        subCategory: activeSub,
        subCategories: activeSubs,
        childCategory: filters.childCategory || 'All',
        childCategories: activeChildren
      });
      var defaultExpanded = activeCat === 'Job' ? 'job_cat' : activeCat === 'Services' ? 'service_cat' : activeCat === 'Product' || activeCat === 'Products' ? 'product_dept' : activeCat === 'Daily Needs' ? 'daily_section' : activeCat === 'Food' ? 'food_dietary' : activeCat === 'Stay' ? 'stay_type' : activeCat === 'Travel' ? 'travel_class' : 'sub_category';
      setExpandedSection(defaultExpanded);
      setIsFilterModalOpen(true);
    };
    var handleApplyFilters = () => {
      setFilters({
        ...draftFilters
      });
      if (draftFilters.subCategories && draftFilters.subCategories.length > 0 && !draftFilters.subCategories.includes('All')) {
        setSelectedSubcategory(draftFilters.subCategories[0]);
      } else if (draftFilters.subCategory) {
        setSelectedSubcategory(draftFilters.subCategory);
      }
      if (draftFilters.categoryType && draftFilters.categoryType !== selectedMainCategory) {
        setSelectedMainCategory(draftFilters.categoryType);
      }
      setIsFilterModalOpen(false);
    };
    var handleResetFilters = () => {
      var targetCat = selectedMainCategory || 'All';
      var resetState = {
        ...DEFAULT_FILTERS,
        categoryType: targetCat,
        subCategory: 'All',
        subCategories: ['All'],
        childCategory: 'All',
        childCategories: ['All']
      };
      setDraftFilters(resetState);
      setFilters(resetState);
      setSelectedSubcategory('All');
      setIsFilterModalOpen(false);
    };
    var handleRemoveFilterChip = (filterKey, value) => {
      _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
      if (filterKey === 'childCategories') {
        var updated = (filters.childCategories || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          childCategories: updated.length > 0 ? updated : ['All'],
          childCategory: updated.length > 0 ? updated[0] : 'All'
        }));
      } else if (filterKey === 'subCategories') {
        var _updated = (filters.subCategories || []).filter(x => x !== value);
        var nextSubs = _updated.length > 0 ? _updated : ['All'];
        if (nextSubs.includes('All')) {
          setSelectedSubcategory('All');
        } else {
          setSelectedSubcategory(nextSubs[0]);
        }
        setFilters(prev => ({
          ...prev,
          subCategories: nextSubs,
          subCategory: nextSubs[0],
          childCategories: ['All'],
          childCategory: 'All'
        }));
      } else if (filterKey === 'jobTypes') {
        var _updated2 = (filters.jobTypes || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          jobTypes: _updated2.length > 0 ? _updated2 : ['all'],
          jobTypeFilter: 'all'
        }));
      } else if (filterKey === 'jobExperiences') {
        var _updated3 = (filters.jobExperiences || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          jobExperiences: _updated3.length > 0 ? _updated3 : ['all'],
          jobExperience: 'all'
        }));
      } else if (filterKey === 'jobWorkModes') {
        var _updated4 = (filters.jobWorkModes || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          jobWorkModes: _updated4.length > 0 ? _updated4 : ['all'],
          jobWorkMode: 'all'
        }));
      } else if (filterKey === 'foodDietaries') {
        var _updated5 = (filters.foodDietaries || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          foodDietaries: _updated5.length > 0 ? _updated5 : ['all'],
          foodDietary: 'all'
        }));
      } else if (filterKey === 'foodCuisines') {
        var _updated6 = (filters.foodCuisines || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          foodCuisines: _updated6.length > 0 ? _updated6 : ['all'],
          foodCuisine: 'all'
        }));
      } else if (filterKey === 'stayPropertyTypes') {
        var _updated7 = (filters.stayPropertyTypes || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          stayPropertyTypes: _updated7.length > 0 ? _updated7 : ['all'],
          stayPropertyType: 'all'
        }));
      } else if (filterKey === 'stayRoomClasses') {
        var _updated8 = (filters.stayRoomClasses || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          stayRoomClasses: _updated8.length > 0 ? _updated8 : ['all'],
          stayRoomClass: 'all'
        }));
      } else if (filterKey === 'travelBusClasses') {
        var _updated9 = (filters.travelBusClasses || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          travelBusClasses: _updated9.length > 0 ? _updated9 : ['all'],
          travelBusClass: 'all'
        }));
      } else if (filterKey === 'travelDepartureSlots') {
        var _updated0 = (filters.travelDepartureSlots || []).filter(x => x !== value);
        setFilters(prev => ({
          ...prev,
          travelDepartureSlots: _updated0.length > 0 ? _updated0 : ['all'],
          travelDepartureSlot: 'all'
        }));
      } else if (filterKey === 'childCategory') {
        setFilters(prev => ({
          ...prev,
          childCategory: 'All',
          childCategories: ['All']
        }));
      } else if (filterKey === 'subCategory') {
        setSelectedSubcategory('All');
        setFilters(prev => ({
          ...prev,
          subCategory: 'All',
          subCategories: ['All'],
          childCategory: 'All',
          childCategories: ['All']
        }));
      } else if (filterKey === 'categoryType') {
        setSelectedMainCategory('All');
        setSelectedSubcategory('All');
        setFilters(prev => ({
          ...prev,
          categoryType: 'All',
          subCategory: 'All',
          subCategories: ['All'],
          childCategory: 'All',
          childCategories: ['All']
        }));
      } else if (filterKey === 'availability') {
        setFilters(prev => ({
          ...prev,
          availability: prev.availability.filter(x => x !== value)
        }));
      } else if (filterKey === 'offers') {
        setFilters(prev => ({
          ...prev,
          offers: prev.offers.filter(x => x !== value)
        }));
      } else if (filterKey === 'stayAmenities') {
        setFilters(prev => ({
          ...prev,
          stayAmenities: prev.stayAmenities.filter(x => x !== value)
        }));
      } else if (filterKey === 'travelAmenities') {
        setFilters(prev => ({
          ...prev,
          travelAmenities: prev.travelAmenities.filter(x => x !== value)
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          [filterKey]: DEFAULT_FILTERS[filterKey]
        }));
      }
    };
    var handleTopCategoryPress = key => {
      setSelectedMainCategory(key);
      setSelectedSubcategory('All');
      if (key === 'Stay') {
        setStaySearchSubmitted(false);
      }
      setFilters(prev => ({
        ...prev,
        categoryType: key,
        subCategory: 'All',
        subCategories: ['All'],
        childCategory: 'All',
        childCategories: ['All']
      }));
    };
    var renderSubcatIcon = (subKey, color) => {
      var iconMap = {
        All: 'LayoutGrid',
        Plumbing: 'Wrench',
        'AC Repair & Service': 'Wind',
        Electrical: 'Zap',
        'Washing Machine Repair': 'RotateCw',
        'Refrigerator Repair': 'Box',
        'TV Repair': 'Tv',
        'RO / Water Purifier': 'Droplet',
        'Microwave Repair': 'Flame',
        'Geyser Repair': 'Thermometer',
        Carpentry: 'Hammer',
        'CCTV Installation': 'Camera',
        'Solar Service': 'Sun',
        'Appliance Repair': 'Settings',
        Painting: 'Paintbrush',
        Cleaning: 'Sparkles',
        'Pest Control': 'Bug',
        Electronics: 'Tv',
        'IT & Office': 'Laptop',
        'Home Appliances': 'WashingMachine',
        Furniture: 'Armchair',
        Fashion: 'Shirt',
        Beauty: 'Sparkles',
        'Baby Care': 'Baby',
        'Sports & Fitness': 'Trophy',
        Books: 'BookOpen',
        Gaming: 'Gamepad2',
        Grocery: 'ShoppingBag',
        'Fruits & Vegetables': 'Apple',
        Dairy: 'Milk',
        Bakery: 'Croissant',
        Beverages: 'CupSoda',
        Restaurants: 'UtensilsCrossed',
        'Fast Food': 'Pizza',
        Cafes: 'Coffee',
        Desserts: 'Cake',
        Hotels: 'Hotel',
        Resorts: 'Palmtree',
        Homestays: 'Home'
      };
      var iconName = iconMap[subKey] || 'Grid';
      var IconComp = Icons[iconName] || Icons.Grid;
      return /*#__PURE__*/(0, _jsxRuntime.jsx)(IconComp, {
        color: color,
        size: 14
      });
    };
    var renderTopIcon = (iconName, color = '#0F172A') => {
      var IconComp = Icons[iconName] || Icons.HelpCircle;
      return /*#__PURE__*/(0, _jsxRuntime.jsx)(IconComp, {
        color: color,
        size: 18
      });
    };
    var handleCardPress = card => {
      if (card.rawProduct) {
        var isJobProduct = card.categoryName === 'Jobs' || card.categoryKey === 'Jobs' || card.rawProduct.category === 'Jobs';
        if (isJobProduct) {
          navigation.navigate('JobDetails', {
            job: {
              id: card.rawProduct.id || card.rawProduct._id,
              title: card.rawProduct.name || card.name,
              company: card.rawProduct.vendorName || card.rawProduct.businessName || 'Verified Employer',
              logo: card.image,
              isVerified: true,
              location: card.rawProduct.jobLocation || 'On-site',
              workMode: card.rawProduct.jobLocation?.toLowerCase().includes('remote') ? 'Remote' : card.rawProduct.jobLocation?.toLowerCase().includes('hybrid') ? 'Hybrid' : 'On-site',
              experience: card.rawProduct.experienceRequired || '1-3 yrs',
              salary: card.rawProduct.salaryPackage ? card.rawProduct.salaryPackage.startsWith('₹') ? card.rawProduct.salaryPackage : `₹${card.rawProduct.salaryPackage}` : card.count || 'Competitive',
              employmentType: card.rawProduct.jobType || 'Full-time',
              department: card.rawProduct.subCategory || 'General',
              skills: Array.isArray(card.rawProduct.skillsRequirement) ? card.rawProduct.skillsRequirement : typeof card.rawProduct.skillsRequirement === 'string' ? card.rawProduct.skillsRequirement.split(',').map(s => s.trim()) : [card.name],
              postedDate: 'Today',
              deadline: card.rawProduct.deadlineDate || 'Open',
              openings: Number(card.rawProduct.vacancies || card.rawProduct.stock || 1),
              description: card.rawProduct.jobDescription || card.rawProduct.detail || 'Job opening posted by verified company.',
              keyResponsibilities: card.rawProduct.keyResponsibilities || card.rawProduct.responsibilities || ''
            }
          });
        } else if (card.categoryName === 'Stay' || card.categoryKey === 'Stay' || card.rawProduct.category === 'Stay') {
          var p = card.rawProduct;
          var numPrice = typeof p.price === 'number' ? p.price : parseInt(String(p.price || '0').replace(/[^\d]/g, ''), 10) || 2499;
          var origNum = p.originalPrice ? typeof p.originalPrice === 'number' ? p.originalPrice : parseInt(String(p.originalPrice || '0').replace(/[^\d]/g, ''), 10) || Math.round(numPrice * 1.35) : Math.round(numPrice * 1.35);
          var resolvedCity = p.stayCity || p.locationCity || p.city || 'Bangalore';
          var resolvedAddress = p.stayAddress || p.location || `${resolvedCity}, India`;
          var resolvedName = p.hotelName || p.businessName || p.name || 'Boutique Stay';
          navigation.navigate('StayDetails', {
            stay: {
              id: p.id || p._id,
              name: resolvedName,
              hotelName: resolvedName,
              roomName: p.name,
              location: resolvedAddress,
              locationCity: resolvedCity,
              stayCity: resolvedCity,
              stayAddress: resolvedAddress,
              type: p.subCategory || p.subcategory || 'Hotels',
              rating: String(p.rating || '4.8'),
              reviews: String(p.reviewsCount || p.ratingCount || '320'),
              price: `₹${numPrice.toLocaleString('en-IN')} / night`,
              priceNum: numPrice,
              originalPrice: `₹${origNum.toLocaleString('en-IN')}`,
              discount: p.discount || '20% OFF',
              desc: p.detail || p.description || p.desc || 'Premium comfortable stay with world class hospitality.',
              image: (0, ApiModule.resolveImageUrl)(p.image || p.imageUrl) || card.image,
              amenities: Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0 ? p.selectedAmenities : Array.isArray(p.amenities) && p.amenities.length > 0 ? p.amenities : ['Free Wi-Fi', 'AC', 'Room Service'],
              freeCancellation: p.freeCancellation !== undefined ? p.freeCancellation : true,
              freeBreakfast: p.freeBreakfast !== undefined ? p.freeBreakfast : true,
              coupleFriendly: p.coupleFriendly !== undefined ? p.coupleFriendly : true,
              payAtHotel: p.payAtHotel !== undefined ? p.payAtHotel : true,
              roomClass: p.roomClass || 'Deluxe Room',
              bedType: p.bedType || '1 King Bed',
              numberOfGuests: p.numberOfGuests || '2 Guests',
              roomSize: p.roomSize || '280 sq.ft',
              roomView: p.roomView || 'City View',
              checkInTime: p.checkInTime || '12:00 PM',
              checkOutTime: p.checkOutTime || '11:00 AM',
              rawProduct: p
            }
          });
        } else {
          navigation.navigate('ProductDetails', {
            productId: card.rawProduct.id || card.rawProduct._id,
            product: card.rawProduct,
            item: card.rawProduct
          });
        }
      } else {
        var resolvedSub = card.subKey || (card.name === 'IT Jobs' ? 'IT' : card.name === 'Non-IT Jobs' ? 'Non-IT' : card.name === 'Delivery & Field Jobs' ? 'Delivery & Field' : card.name);
        navigation.navigate('CategoryDetails', {
          categoryName: card.categoryName,
          subCategoryName: resolvedSub,
          childCategoryName: filters.childCategory !== 'All' ? filters.childCategory : undefined,
          destination: stayDestination,
          checkInDate: stayCheckInDate.toISOString(),
          checkOutDate: stayCheckOutDate.toISOString(),
          rooms: stayRooms,
          adults: stayAdults,
          children: stayChildren
        });
      }
    };
    return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
      style: [styles.container, {
        backgroundColor: colors.background
      }],
      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.StatusBar, {
        barStyle: colors.statusBarStyle,
        backgroundColor: isLight ? '#FFF1C7' : colors.background,
        translucent: false
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(SafeAreaContext.SafeAreaView, {
        edges: ['top'],
        style: {
          backgroundColor: isLight ? '#FFF1C7' : colors.background,
          borderBottomWidth: 1,
          borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          zIndex: 100
        },
        children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
          style: styles.headerWrapper,
          children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.topHeaderRow,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.headerTitle, {
                color: colors.text
              }],
              numberOfLines: 1,
              children: t('categories')
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.headerActions,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                style: styles.headerBtn,
                activeOpacity: 0.7,
                onPress: () => setIsCartVisible(true),
                hitSlop: {
                  top: 8,
                  bottom: 8,
                  left: 4,
                  right: 4
                },
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ShoppingCart, {
                  color: colors.text,
                  size: 20
                }), totalCartCount > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: styles.badge,
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: styles.badgeText,
                    children: totalCartCount
                  })
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                style: styles.headerBtn,
                activeOpacity: 0.7,
                onPress: () => navigation.navigate('Notifications'),
                hitSlop: {
                  top: 8,
                  bottom: 8,
                  left: 4,
                  right: 4
                },
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bell, {
                  color: colors.text,
                  size: 20
                }), unreadNotifCount > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: styles.badge,
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: styles.badgeText,
                    children: unreadNotifCount
                  })
                })]
              })]
            })]
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.searchAndFilterRow,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: [styles.searchInputWrapper, {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.07)',
                borderColor: isVoiceListening ? '#F5B800' : isLight ? '#FCD34D' : colors.cardBorder
              }],
              children: [isVoiceListening ? /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.waveformContainer, {
                  marginRight: 6
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Animated.View, {
                  style: [styles.waveBar, {
                    height: wave1
                  }]
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Animated.View, {
                  style: [styles.waveBar, {
                    height: wave2
                  }]
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Animated.View, {
                  style: [styles.waveBar, {
                    height: wave3
                  }]
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Animated.View, {
                  style: [styles.waveBar, {
                    height: wave4
                  }]
                })]
              }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Search, {
                color: "#F5B800",
                size: 17
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TextInput, {
                ref: searchInputRef,
                style: [styles.searchInput, {
                  color: colors.text,
                  flex: 1
                }],
                placeholder: isVoiceListening ? "Listening... Speak now 🎙️" : "Search categories, services...",
                placeholderTextColor: isVoiceListening ? "#D97706" : isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)',
                value: searchQuery,
                onChangeText: setSearchQuery,
                autoCorrect: false
              }), searchQuery.length > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => setSearchQuery(''),
                hitSlop: {
                  top: 8,
                  bottom: 8,
                  left: 6,
                  right: 6
                },
                style: {
                  marginRight: 4
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)',
                  size: 15
                })
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: handleMicPress,
                style: styles.micBtn,
                activeOpacity: 0.7,
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Mic, {
                  color: isVoiceListening ? "#F59E0B" : colors.text,
                  size: 17
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
              style: [styles.filterBtn, {
                backgroundColor: activeFilterCount > 0 ? isLight ? '#FEF9E7' : 'rgba(245, 184, 0, 0.15)' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.07)',
                borderColor: activeFilterCount > 0 ? '#F5B800' : isLight ? '#FCD34D' : colors.cardBorder
              }],
              activeOpacity: 0.8,
              onPress: handleOpenFilterModal,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.SlidersHorizontal, {
                color: activeFilterCount > 0 ? '#F5B800' : colors.text,
                size: 14
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: [styles.filterBtnText, {
                  color: activeFilterCount > 0 ? '#D97706' : colors.text
                }],
                children: selectedMainCategory !== 'All' ? `Filter • ${getMappedCategoryRoute(selectedMainCategory)}` : 'Filter'
              }), activeFilterCount > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                style: styles.filterCountBadge,
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: styles.filterCountText,
                  children: activeFilterCount
                })
              })]
            })]
          }), activeFilterCount > 0 && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.ScrollView, {
            horizontal: true,
            showsHorizontalScrollIndicator: false,
            contentContainerStyle: styles.activeChipsContainer,
            children: [filters.categoryType !== 'All' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: getMappedCategoryRoute(filters.categoryType)
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('categoryType'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), (filters.subCategories || []).filter(x => x.toLowerCase() !== 'all').map(sub => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: sub
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('subCategories', sub),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-sub-${sub}`)), (filters.childCategories || []).filter(x => x.toLowerCase() !== 'all').map(role => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: role
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('childCategories', role),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-role-${role}`)), (filters.foodDietaries || []).filter(x => x.toLowerCase() !== 'all').map(d => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: d
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('foodDietaries', d),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-diet-${d}`)), (filters.foodCuisines || []).filter(x => x.toLowerCase() !== 'all').map(c => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: c.replace('_', ' ')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('foodCuisines', c),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-cui-${c}`)), (filters.stayPropertyTypes || []).filter(x => x.toLowerCase() !== 'all').map(pt => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: pt
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('stayPropertyTypes', pt),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-prop-${pt}`)), (filters.stayRoomClasses || []).filter(x => x.toLowerCase() !== 'all').map(rc => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: rc
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('stayRoomClasses', rc),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-rc-${rc}`)), (filters.travelBusClasses || []).filter(x => x.toLowerCase() !== 'all').map(bc => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: bc.replace('_', ' ')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('travelBusClasses', bc),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-bc-${bc}`)), (filters.travelDepartureSlots || []).filter(x => x.toLowerCase() !== 'all').map(slot => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: slot
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('travelDepartureSlots', slot),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-slot-${slot}`)), (filters.jobTypes || []).filter(x => x.toLowerCase() !== 'all').map(jt => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: jt
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('jobTypes', jt),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-jt-${jt}`)), (filters.jobExperiences || []).filter(x => x.toLowerCase() !== 'all').map(exp => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: exp.replace('_', ' ')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('jobExperiences', exp),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-exp-${exp}`)), (filters.jobWorkModes || []).filter(x => x.toLowerCase() !== 'all').map(wm => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: wm
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('jobWorkModes', wm),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, `chip-wm-${wm}`)), filters.jobSalary !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Salary: ", filters.jobSalary.replace('_', ' ')]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('jobSalary'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.serviceTypeFilter !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Service: ", filters.serviceTypeFilter.replace('_', ' ')]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('serviceTypeFilter'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.productDepartment !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Dept: ", filters.productDepartment]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('productDepartment'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.dailyNeedsSection !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Section: ", filters.dailyNeedsSection.replace('_', ' ')]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('dailyNeedsSection'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.sortBy !== 'recommended' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Sort: ", filters.sortBy.replace('_', ' ')]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('sortBy'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.rating !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: [filters.rating, "+ \u2605 Rating"]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('rating'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.priceRange !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: filters.priceRange.replace('_', ' ')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('priceRange'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.distance !== 'all' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: ["Within ", filters.distance]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('distance'),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }), filters.availability.map(avail => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.activeFilterChip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.activeFilterChipText,
                children: avail.replace('_', ' ')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => handleRemoveFilterChip('availability', avail),
                hitSlop: {
                  top: 6,
                  bottom: 6,
                  left: 6,
                  right: 6
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: "#0F172A",
                  size: 12
                })
              })]
            }, avail)), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
              style: styles.clearAllChip,
              onPress: handleResetFilters,
              children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.clearAllChipText,
                children: "Clear All"
              })
            })]
          })]
        })
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
        style: [styles.topSliderWrapper, {
          backgroundColor: colors.background,
          borderBottomColor: isLight ? '#F1EAD8' : colors.cardBorder
        }],
        children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.ScrollView, {
          horizontal: true,
          showsHorizontalScrollIndicator: false,
          removeClippedSubviews: true,
          scrollEventThrottle: 16,
          contentContainerStyle: styles.topSliderContent,
          children: TOP_SLIDER_CATEGORIES.map(item => {
            var isActive = selectedMainCategory === item.key;
            return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
              style: styles.topSliderBtn,
              activeOpacity: 0.85,
              onPress: () => handleTopCategoryPress(item.key),
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                style: [styles.topIconCircle, {
                  backgroundColor: isActive ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isActive ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                }],
                children: renderTopIcon(item.icon, isActive ? '#0F172A' : isLight ? '#0F172A' : '#FFFFFF')
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: [styles.topLabel, {
                  color: isActive ? '#D97706' : colors.text
                }, isActive && styles.topLabelActive],
                children: t(item.name)
              })]
            }, item.key);
          })
        })
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.ScrollView, {
        showsVerticalScrollIndicator: false,
        scrollEnabled: true,
        removeClippedSubviews: true,
        scrollEventThrottle: 16,
        contentContainerStyle: {
          paddingHorizontal: 14,
          paddingTop: selectedMainCategory === 'Travel' ? 2 : 14,
          paddingBottom: selectedMainCategory === 'Travel' ? 28 : Math.max(insets.bottom, 16) + 80
        },
        children: selectedMainCategory === 'Travel' ?
        /*#__PURE__*/
        /* =========================================================
           DEDICATED TRAVEL BOOKING PORTAL (BUS, CAB, BIKE)
           ========================================================= */
        (0, _jsxRuntime.jsxs)(_reactNative.View, {
          style: styles.travelPortalContainer,
          children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.travelHeroCenter,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelHeaderBadge,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bus, {
                size: 13,
                color: "#D97706"
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.travelHeaderBadgeText,
                children: "BUS & TRAVEL RESERVATION"
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.travelHeroTitle, {
                color: colors.text
              }],
              children: "Book Tickets"
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.travelHeroSubtitle, {
                color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)'
              }],
              children: "Instant confirmation \u2022 Live seat layout \u2022 GPS bus tracking"
            })]
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: [styles.travelBookingCard, {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder
            }],
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelFieldBlock,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: styles.travelFieldLabelRow,
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.MapPin, {
                  size: 14,
                  color: "#10B981"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.travelFieldLabel, {
                    color: colors.text
                  }],
                  children: "From"
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelTextInputWrapper, {
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isLight ? '#E2E8F0' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TextInput, {
                  style: [styles.travelTextInput, {
                    color: colors.text
                  }],
                  placeholder: "Enter starting point (e.g. Bangalore)",
                  placeholderTextColor: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.35)',
                  value: travelFrom,
                  onChangeText: setTravelFrom
                }), travelFrom.length > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                  onPress: () => setTravelFrom(''),
                  hitSlop: {
                    top: 6,
                    bottom: 6,
                    left: 6,
                    right: 6
                  },
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                    size: 14,
                    color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.45)'
                  })
                })]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelSwapRow,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                style: [styles.travelSwapLine, {
                  backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'
                }]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: styles.travelSwapButton,
                activeOpacity: 0.8,
                onPress: () => {
                  var temp = travelFrom;
                  setTravelFrom(travelTo);
                  setTravelTo(temp);
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ArrowUpDown, {
                  size: 15,
                  color: "#0F172A"
                })
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                style: [styles.travelSwapLine, {
                  backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'
                }]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelFieldBlock,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: styles.travelFieldLabelRow,
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.MapPin, {
                  size: 14,
                  color: "#EF4444"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.travelFieldLabel, {
                    color: colors.text
                  }],
                  children: "To"
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelTextInputWrapper, {
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isLight ? '#E2E8F0' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TextInput, {
                  style: [styles.travelTextInput, {
                    color: colors.text
                  }],
                  placeholder: "Enter destination (e.g. Chennai)",
                  placeholderTextColor: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.35)',
                  value: travelTo,
                  onChangeText: setTravelTo
                }), travelTo.length > 0 && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                  onPress: () => setTravelTo(''),
                  hitSlop: {
                    top: 6,
                    bottom: 6,
                    left: 6,
                    right: 6
                  },
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                    size: 14,
                    color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.45)'
                  })
                })]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelFieldBlock,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: styles.travelFieldLabelRow,
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Compass, {
                  size: 14,
                  color: "#D97706"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.travelFieldLabel, {
                    color: colors.text
                  }],
                  children: "Vehicle Type"
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                style: [styles.travelDropdownTrigger, {
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isVehicleDropdownOpen ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder
                }],
                activeOpacity: 0.8,
                onPress: () => setIsVehicleDropdownOpen(!isVehicleDropdownOpen),
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: styles.travelDropdownValueRow,
                  children: [travelVehicleType === 'Bus' && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bus, {
                    size: 18,
                    color: "#D97706"
                  }), travelVehicleType === 'Cab' && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Car, {
                    size: 18,
                    color: "#D97706"
                  }), travelVehicleType === 'Bike' && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bike, {
                    size: 18,
                    color: "#D97706"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelDropdownValueText, {
                      color: colors.text
                    }],
                    children: travelVehicleType === 'Bus' ? 'Bus (Sleeper, Semi-Sleeper, Volvo)' : travelVehicleType === 'Cab' ? 'Cab (Sedan, SUV, Hatchback)' : 'Bike (Rentals, Cruisers, Scooters)'
                  })]
                }), isVehicleDropdownOpen ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                  size: 18,
                  color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)'
                }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                  size: 18,
                  color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)'
                })]
              }), isVehicleDropdownOpen && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                style: [styles.travelDropdownMenu, {
                  backgroundColor: isLight ? '#FFFFFF' : '#0B1530',
                  borderColor: isLight ? '#FDE68A' : colors.cardBorder
                }],
                children: [{
                  type: 'Bus',
                  label: 'Bus',
                  sub: 'Intercity AC Sleeper, Semi-Sleeper & Multi-Axle Volvo',
                  icon: 'Bus'
                }, {
                  type: 'Cab',
                  label: 'Cab',
                  sub: 'Outstation & City Cabs (Sedan, Innova SUV, Mini)',
                  icon: 'Car'
                }, {
                  type: 'Bike',
                  label: 'Bike',
                  sub: 'Daily Bike Rentals, Royal Enfield, Activa & Touring',
                  icon: 'Bike'
                }].map(opt => {
                  var isSelected = travelVehicleType === opt.type;
                  var IconComp = Icons[opt.icon] || Icons.Circle;
                  return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: [styles.travelDropdownMenuItem, isSelected && {
                      backgroundColor: isLight ? 'rgba(245, 184, 0, 0.12)' : 'rgba(245, 184, 0, 0.2)'
                    }],
                    activeOpacity: 0.7,
                    onPress: () => {
                      setTravelVehicleType(opt.type);
                      setIsVehicleDropdownOpen(false);
                    },
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: [styles.travelDropdownMenuIconCircle, {
                        backgroundColor: isSelected ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)'
                      }],
                      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(IconComp, {
                        size: 16,
                        color: isSelected ? '#0F172A' : isLight ? '#475569' : '#CBD5E1'
                      })
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: {
                        flex: 1
                      },
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.travelDropdownMenuTitle, {
                          color: isSelected ? '#D97706' : colors.text
                        }],
                        children: opt.label
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.travelDropdownMenuSub, {
                          color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)'
                        }],
                        children: opt.sub
                      })]
                    }), isSelected && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Check, {
                      size: 18,
                      color: "#D97706"
                    })]
                  }, opt.type);
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelFieldBlock,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: styles.travelFieldLabelRow,
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Calendar, {
                  size: 14,
                  color: "#D97706"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.travelFieldLabel, {
                    color: colors.text
                  }],
                  children: "Date of Journey"
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                style: [styles.travelDropdownTrigger, {
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isDatePickerOpen ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder
                }],
                activeOpacity: 0.85,
                onPress: () => setIsDatePickerOpen(true),
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: styles.travelDropdownValueRow,
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Calendar, {
                    size: 18,
                    color: "#D97706"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelDropdownValueText, {
                      color: colors.text
                    }],
                    numberOfLines: 1,
                    children: formattedTravelDate
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  },
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                    style: {
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isTodaySelected ? '#F5B800' : isLight ? '#EDF2F7' : 'rgba(255,255,255,0.08)'
                    },
                    onPress: e => {
                      e.stopPropagation();
                      setTravelDate(new Date());
                    },
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                      style: {
                        fontSize: 11,
                        fontWeight: '700',
                        color: isTodaySelected ? '#0F172A' : isLight ? '#475569' : '#CBD5E1'
                      },
                      children: "Today"
                    })
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                    style: {
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isTomorrowSelected ? '#F5B800' : isLight ? '#EDF2F7' : 'rgba(255,255,255,0.08)'
                    },
                    onPress: e => {
                      e.stopPropagation();
                      var tmr = new Date();
                      tmr.setDate(tmr.getDate() + 1);
                      setTravelDate(tmr);
                    },
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                      style: {
                        fontSize: 11,
                        fontWeight: '700',
                        color: isTomorrowSelected ? '#0F172A' : isLight ? '#475569' : '#CBD5E1'
                      },
                      children: "Tomorrow"
                    })
                  })]
                })]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelPresetStrip,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: [styles.travelPresetLabel, {
                  color: isLight ? '#64748B' : 'rgba(255,255,255,0.55)'
                }],
                children: "Popular Routes:"
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.ScrollView, {
                horizontal: true,
                showsHorizontalScrollIndicator: false,
                contentContainerStyle: styles.travelPresetScroll,
                children: [{
                  from: 'Bangalore',
                  to: 'Chennai'
                }, {
                  from: 'Chennai',
                  to: 'Bangalore'
                }, {
                  from: 'Bangalore',
                  to: 'Hyderabad'
                }, {
                  from: 'Bangalore',
                  to: 'Coimbatore'
                }, {
                  from: 'Bangalore',
                  to: 'Goa'
                }, {
                  from: 'Bangalore',
                  to: 'Mysore'
                }].map((preset, idx) => {
                  var isMatched = travelFrom.toLowerCase() === preset.from.toLowerCase() && travelTo.toLowerCase() === preset.to.toLowerCase();
                  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                    style: [styles.travelPresetChip, {
                      backgroundColor: isMatched ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isMatched ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder
                    }],
                    activeOpacity: 0.8,
                    onPress: () => {
                      setTravelFrom(preset.from);
                      setTravelTo(preset.to);
                    },
                    children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                      style: [styles.travelPresetChipText, {
                        color: isMatched ? '#0F172A' : colors.text,
                        fontWeight: isMatched ? '700' : '500'
                      }],
                      children: [preset.from, " \u2794 ", preset.to]
                    })
                  }, idx);
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
              style: styles.travelSearchButton,
              activeOpacity: 0.85,
              onPress: () => {
                navigation.navigate('CategoryDetails', {
                  categoryName: 'Travel',
                  subCategoryName: 'All',
                  from: travelFrom,
                  to: travelTo,
                  vehicleType: travelVehicleType,
                  journeyDate: formattedTravelDate
                });
              },
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Search, {
                size: 18,
                color: "#0F172A"
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.travelSearchButtonText,
                children: "Search Travel"
              })]
            })]
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.travelHighlightsContainer,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelHighlightsRow,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelHighlightCard, {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: [styles.travelHighlightIconBox, {
                    backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)'
                  }],
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Zap, {
                    size: 16,
                    color: "#3B82F6"
                  })
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: {
                    flex: 1
                  },
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightTitle, {
                      color: colors.text
                    }],
                    children: "Instant Confirmation"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightDesc, {
                      color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.55)'
                    }],
                    children: "Confirmed seats with verified operators"
                  })]
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelHighlightCard, {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: [styles.travelHighlightIconBox, {
                    backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)'
                  }],
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ShieldCheck, {
                    size: 16,
                    color: "#10B981"
                  })
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: {
                    flex: 1
                  },
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightTitle, {
                      color: colors.text
                    }],
                    children: "Live GPS Tracking"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightDesc, {
                      color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.55)'
                    }],
                    children: "Real-time live location of your bus on map"
                  })]
                })]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: styles.travelHighlightsRow,
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelHighlightCard, {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: [styles.travelHighlightIconBox, {
                    backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'
                  }],
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Sparkles, {
                    size: 16,
                    color: "#D97706"
                  })
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: {
                    flex: 1
                  },
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightTitle, {
                      color: colors.text
                    }],
                    children: "Zero Booking Fee"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightDesc, {
                      color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.55)'
                    }],
                    children: "Best fare guarantee with no hidden charges"
                  })]
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: [styles.travelHighlightCard, {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder
                }],
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                  style: [styles.travelHighlightIconBox, {
                    backgroundColor: isLight ? '#F5F3FF' : 'rgba(139, 92, 246, 0.15)'
                  }],
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Headphones, {
                    size: 16,
                    color: "#8B5CF6"
                  })
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: {
                    flex: 1
                  },
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightTitle, {
                      color: colors.text
                    }],
                    children: "24x7 Assistance"
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.travelHighlightDesc, {
                      color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.55)'
                    }],
                    children: "Instant support for trip delays & changes"
                  })]
                })]
              })]
            })]
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.popularTravelRoutesSection,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: styles.popularRoutesHeaderRow,
              children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.popularRoutesTitle, {
                    color: colors.text
                  }],
                  children: "Top Travel Routes"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.popularRoutesSubtitle, {
                    color: isLight ? '#64748B' : 'rgba(255,255,255,0.55)'
                  }],
                  children: "Tap any route to search available buses instantly"
                })]
              })
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: styles.popularRoutesList,
              children: [{
                from: 'Bangalore',
                to: 'Chennai',
                fare: '₹550',
                duration: '5h 30m',
                buses: '14+ Buses'
              }, {
                from: 'Chennai',
                to: 'Bangalore',
                fare: '₹550',
                duration: '5h 30m',
                buses: '14+ Buses'
              }, {
                from: 'Bangalore',
                to: 'Hyderabad',
                fare: '₹850',
                duration: '9h 15m',
                buses: '10+ Buses'
              }, {
                from: 'Bangalore',
                to: 'Coimbatore',
                fare: '₹650',
                duration: '6h 45m',
                buses: '8+ Buses'
              }].map((item, idx) => /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: [styles.popularRouteCard, {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder
                }],
                activeOpacity: 0.85,
                onPress: () => {
                  setTravelFrom(item.from);
                  setTravelTo(item.to);
                  navigation.navigate('CategoryDetails', {
                    categoryName: 'Travel',
                    subCategoryName: 'All',
                    from: item.from,
                    to: item.to,
                    vehicleType: travelVehicleType,
                    journeyDate: formattedTravelDate
                  });
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: styles.popularRouteCityRow,
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                    style: {
                      flex: 1
                    },
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                      style: [styles.popularRouteCityName, {
                        color: colors.text
                      }],
                      children: [item.from, " \u2794 ", item.to]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                      style: [styles.popularRouteMetaText, {
                        color: isLight ? '#64748B' : 'rgba(255,255,255,0.55)'
                      }],
                      children: [item.duration, " \u2022 ", item.buses]
                    })]
                  }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                    style: styles.popularRouteFareCol,
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                      style: styles.popularRouteFareText,
                      children: item.fare
                    }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                      style: [styles.popularRouteOnwardsText, {
                        color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.45)'
                      }],
                      children: "onwards"
                    })]
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.popularRouteArrowBtn,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronRight, {
                      size: 16,
                      color: "#0F172A"
                    })
                  })]
                })
              }, idx))
            })]
          })]
        })  : /* Clean 2-Column Native Mobile Grid for other categories / Stay Results (Screenshot 2) */
        (0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
          children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: {
              backgroundColor: '#0F172A',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: '#1E293B',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            },
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: { flex: 1, paddingRight: 12 },
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Sparkles, { color: '#F59E0B', size: 14 }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: { color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
                  children: 'MARKETPLACE'
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
                children: 'Explore All Categories'
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: { color: '#94A3B8', fontSize: 11.5, lineHeight: 16 },
                children: 'Browse 1,000+ verified products, stays, services & daily essentials'
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: {
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 106, 0, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 106, 0, 0.3)'
              },
              children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Grid, { color: '#FF6A00', size: 24 })
            })]
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.rightHeaderRow,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.sectionHeaderTitle, {
                color: colors.text
              }],
              children: selectedMainCategory === 'All' ? 'ALL CATEGORIES' : selectedMainCategory.toUpperCase()
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
              style: [styles.resultCountText, {
                color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.45)'
              }],
              children: [rightItems.length, " ", rightItems.length === 1 ? 'category' : 'categories']
            })]
          }), rightItems.length > 0 ? /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
            style: styles.subcatGrid,
            children: rightItems.map((card, idx) => /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
              style: [styles.subcatCard, {
                width: (width - 28 - 12) / 2,
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder
              }],
              activeOpacity: 0.85,
              onPress: () => handleCardPress(card),
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Image, {
                source: {
                  uri: card.image
                },
                style: styles.subcatCardImage,
                resizeMode: "cover"
              }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                style: styles.subcatCardDetails,
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.subcatCardTitle, {
                    color: colors.text
                  }],
                  numberOfLines: 1,
                  children: card.name
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: styles.cardMetaRow,
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                    style: [styles.subcatCardCount, {
                      color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)'
                    }],
                    numberOfLines: 1,
                    children: card.count ? card.count.replace(' Options', '') : 'Explore'
                  }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: {
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isLight ? '#FFF3E8' : 'rgba(255, 106, 0, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronRight, {
                      color: '#FF6A00',
                      size: 13,
                      strokeWidth: 2.5
                    })
                  })]
                })]
              })]
            }, `${card.categoryKey}_${card.name}_${idx}`))
          }) : /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: styles.emptyGrid,
            children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.SearchX, {
              color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.35)',
              size: 36
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.emptyTitle, {
                color: colors.text
              }],
              children: "No categories match your filters"
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
              style: [styles.emptySub, {
                color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)'
              }],
              children: "Try adjusting or resetting your filter criteria."
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
              style: styles.emptyResetBtn,
              onPress: () => setFilters(DEFAULT_FILTERS),
              children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: styles.emptyResetBtnText,
                children: "Reset All Filters"
              })
            })]
          })]
        })
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(CartModal, {
        visible: isCartVisible,
        onClose: () => setIsCartVisible(false),
        navigation: navigation
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Modal, {
        visible: isDatePickerOpen,
        animationType: "fade",
        transparent: true,
        onRequestClose: () => setIsDatePickerOpen(false),
        children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
          style: styles.modalBackdrop,
          children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
            style: _reactNative.StyleSheet.absoluteFill,
            activeOpacity: 1,
            onPress: () => setIsDatePickerOpen(false)
          }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: [styles.modalCard, {
              backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
              borderColor: isLight ? '#FDE68A' : colors.cardBorder
            }],
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: [styles.modalHeader, {
                borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)'
              }],
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.modalHeaderTitle, {
                    color: colors.text
                  }],
                  children: "Select Date of Journey"
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.modalHeaderSub, {
                    color: '#D97706',
                    fontWeight: '700'
                  }],
                  children: formattedTravelDate
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => setIsDatePickerOpen(false),
                style: styles.modalCloseBtn,
                hitSlop: {
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: colors.text,
                  size: 20
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: {
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 16,
                paddingTop: 14
              },
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: {
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isTodaySelected ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: isTodaySelected ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder
                },
                onPress: () => {
                  setTravelDate(new Date());
                  setIsDatePickerOpen(false);
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: {
                    fontSize: 13,
                    fontWeight: '700',
                    color: isTodaySelected ? '#0F172A' : colors.text
                  },
                  children: "Today"
                })
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: {
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isTomorrowSelected ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: isTomorrowSelected ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder
                },
                onPress: () => {
                  var tmr = new Date();
                  tmr.setDate(tmr.getDate() + 1);
                  setTravelDate(tmr);
                  setIsDatePickerOpen(false);
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: {
                    fontSize: 13,
                    fontWeight: '700',
                    color: isTomorrowSelected ? '#0F172A' : colors.text
                  },
                  children: "Tomorrow"
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12
              },
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => {
                  var prev = new Date(calendarMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  var now = new Date();
                  if (prev.getFullYear() >= now.getFullYear() && (prev.getMonth() >= now.getMonth() || prev.getFullYear() > now.getFullYear())) {
                    setCalendarMonth(prev);
                  }
                },
                style: {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronLeft, {
                  size: 18,
                  color: colors.text
                })
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: {
                  fontSize: 15,
                  fontWeight: '800',
                  color: colors.text
                },
                children: calendarMonthLabel
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => {
                  var next = new Date(calendarMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarMonth(next);
                },
                style: {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronRight, {
                  size: 18,
                  color: colors.text
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: {
                flexDirection: 'row',
                paddingHorizontal: 12,
                marginBottom: 6
              },
              children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                style: {
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: '700',
                  color: isLight ? '#64748B' : 'rgba(255,255,255,0.45)'
                },
                children: day
              }, idx))
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: {
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: 12
              },
              children: calendarDays.map((d, idx) => {
                if (!d) {
                  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: {
                      width: '14.28%',
                      height: 38
                    }
                  }, `empty_${idx}`);
                }
                var now = new Date();
                var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                var isPast = d < startOfToday;
                var isSelected = isSameDay(d, travelDate);
                var isToday = isSameDay(d, now);
                return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                  disabled: isPast,
                  style: {
                    width: '14.28%',
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center'
                  },
                  onPress: () => {
                    setTravelDate(d);
                    setIsDatePickerOpen(false);
                  },
                  children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: {
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: isSelected ? '#F5B800' : isToday ? isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.15)' : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: '#F5B800',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isPast ? 0.25 : 1
                    },
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                      style: {
                        fontSize: 12.5,
                        fontWeight: isSelected || isToday ? '800' : '600',
                        color: isSelected ? '#0F172A' : isPast ? isLight ? '#94A3B8' : 'rgba(255,255,255,0.3)' : colors.text
                      },
                      children: d.getDate()
                    })
                  })
                }, `day_${idx}`);
              })
            }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
              style: {
                padding: 16
              },
              children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: {
                  height: 44,
                  backgroundColor: '#F5B800',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                onPress: () => setIsDatePickerOpen(false),
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: {
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#0F172A'
                  },
                  children: "Confirm Date of Journey"
                })
              })
            })]
          })]
        })
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Modal, {
        visible: isFilterModalOpen,
        animationType: "slide",
        transparent: true,
        onRequestClose: () => setIsFilterModalOpen(false),
        children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
          style: styles.modalBackdrop,
          children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
            style: [styles.modalCard, {
              backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
              borderColor: isLight ? '#FDE68A' : colors.cardBorder
            }],
            children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: [styles.modalHeader, {
                borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)'
              }],
              children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.modalHeaderTitle, {
                    color: colors.text
                  }],
                  children: draftFilters.categoryType === 'All' ? 'Marketplace Filters' : `${getMappedCategoryRoute(draftFilters.categoryType)} Filters`
                }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.modalHeaderSub, {
                    color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)'
                  }],
                  children: draftFilters.categoryType === 'All' ? 'Refine across all categories, items & services' : `Filtered options specifically tailored for ${getMappedCategoryRoute(draftFilters.categoryType)}`
                })]
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                onPress: () => setIsFilterModalOpen(false),
                style: styles.modalCloseBtn,
                hitSlop: {
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8
                },
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.X, {
                  color: colors.text,
                  size: 20
                })
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.ScrollView, {
              showsVerticalScrollIndicator: false,
              style: styles.modalScroll,
              children: [draftFilters.categoryType === 'All' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('sub_category'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Layers, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Sub Category"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.subCategories)
                      }), expandedSection === 'sub_category' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'sub_category' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableSubcategoriesForCategory('All').map(subName => {
                        var isSelected = isMultiSelected(draftFilters.subCategories, subName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              subCategories: toggleMultiFilter(prev.subCategories, subName),
                              childCategories: ['All']
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: subName
                          })
                        }, subName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('sort'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ArrowUpDown, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Sort By"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.sortBy.replace('_', ' ')
                      }), expandedSection === 'sort' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'sort' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: [{
                      key: 'recommended',
                      label: 'Recommended'
                    }, {
                      key: 'popularity',
                      label: 'Popularity'
                    }, {
                      key: 'rating_desc',
                      label: 'Rating: High to Low'
                    }, {
                      key: 'price_asc',
                      label: 'Price: Low to High'
                    }, {
                      key: 'price_desc',
                      label: 'Price: High to Low'
                    }, {
                      key: 'distance',
                      label: 'Distance: Near to Far'
                    }, {
                      key: 'asc',
                      label: 'Alphabetical: A → Z'
                    }].map(opt => {
                      var isSelected = draftFilters.sortBy === opt.key;
                      return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                        style: [styles.radioItem, isSelected && styles.radioItemSelected],
                        onPress: () => setDraftFilters(prev => ({
                          ...prev,
                          sortBy: opt.key
                        })),
                        children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                          style: [styles.radioCircle, isSelected && styles.radioCircleActive],
                          children: isSelected && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                            style: styles.radioDot
                          })
                        }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                          style: [styles.radioText, {
                            color: isSelected ? '#D97706' : colors.text
                          }, isSelected && {
                            fontWeight: '700'
                          }],
                          children: opt.label
                        })]
                      }, opt.key);
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Price Range"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Prices'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹500'
                      }, {
                        key: '500_2000',
                        label: '₹500 - ₹2,000'
                      }, {
                        key: '2000_10000',
                        label: '₹2,000 - ₹10,000'
                      }, {
                        key: 'above_10000',
                        label: '₹10,000+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('rating'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Star, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Customer Rating"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.rating === 'all' ? 'Any' : `${draftFilters.rating}+ ★`
                      }), expandedSection === 'rating' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'rating' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Rating'
                      }, {
                        key: '4.5',
                        label: '4.5+ ★ (Top Rated)'
                      }, {
                        key: '4.0',
                        label: '4.0+ ★ (Very Good)'
                      }, {
                        key: '3.0',
                        label: '3.0+ ★ (Good)'
                      }].map(rt => {
                        var isSelected = draftFilters.rating === rt.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            rating: rt.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: rt.label
                          })
                        }, rt.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('avail'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Zap, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Availability & Delivery"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.availability.length > 0 ? `${draftFilters.availability.length} selected` : 'All'
                      }), expandedSection === 'avail' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'avail' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: [{
                      key: 'available_now',
                      label: 'Available Now / Open'
                    }, {
                      key: 'in_stock',
                      label: 'In Stock'
                    }, {
                      key: 'instant_booking',
                      label: 'Instant Booking'
                    }, {
                      key: 'fast_delivery',
                      label: 'Express Delivery (<30 mins)'
                    }, {
                      key: 'pickup_available',
                      label: 'Store Pickup Available'
                    }].map(av => {
                      var isChecked = draftFilters.availability.includes(av.key);
                      return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                        style: styles.checkboxItem,
                        onPress: () => setDraftFilters(prev => ({
                          ...prev,
                          availability: isChecked ? prev.availability.filter(x => x !== av.key) : [...prev.availability, av.key]
                        })),
                        children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                          style: [styles.checkboxBox, isChecked && styles.checkboxBoxActive],
                          children: isChecked && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Check, {
                            color: "#0F172A",
                            size: 12
                          })
                        }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                          style: [styles.checkboxText, {
                            color: colors.text
                          }],
                          children: av.label
                        })]
                      }, av.key);
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('distance'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Navigation, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Distance / Proximity"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.distance === 'all' ? 'Any' : draftFilters.distance
                      }), expandedSection === 'distance' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'distance' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Distance'
                      }, {
                        key: '1km',
                        label: 'Within 1 km'
                      }, {
                        key: '3km',
                        label: 'Within 3 km'
                      }, {
                        key: '5km',
                        label: 'Within 5 km'
                      }, {
                        key: '10km',
                        label: 'Within 10 km'
                      }].map(dist => {
                        var isSelected = draftFilters.distance === dist.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            distance: dist.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: dist.label
                          })
                        }, dist.key);
                      })
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Food' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('food_dietary'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Utensils, {
                        color: "#16A34A",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Dietary Preference"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.foodDietaries, 'All Food')
                      }), expandedSection === 'food_dietary' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'food_dietary' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Food'
                      }, {
                        key: 'veg',
                        label: 'Pure Veg 🟢'
                      }, {
                        key: 'non_veg',
                        label: 'Non-Veg 🔴'
                      }, {
                        key: 'egg',
                        label: 'Eggitarian 🥚'
                      }, {
                        key: 'vegan',
                        label: 'Vegan 🌱'
                      }, {
                        key: 'beverages',
                        label: 'Beverages 🥤'
                      }, {
                        key: 'desserts',
                        label: 'Desserts & Bakery 🍰'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.foodDietaries, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              foodDietaries: toggleMultiFilter(prev.foodDietaries, item.key, 'all'),
                              foodDietary: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('food_cuisine'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Flame, {
                        color: "#EA580C",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Cuisine & Style"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.foodCuisines, 'All Cuisines')
                      }), expandedSection === 'food_cuisine' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'food_cuisine' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Cuisines'
                      }, {
                        key: 'fast_food',
                        label: 'Fast Food 🍔'
                      }, {
                        key: 'south_indian',
                        label: 'South Indian 🍛'
                      }, {
                        key: 'north_indian',
                        label: 'North Indian 🍲'
                      }, {
                        key: 'biryani',
                        label: 'Biryani 🍗'
                      }, {
                        key: 'chinese',
                        label: 'Chinese 🍜'
                      }, {
                        key: 'pizza',
                        label: 'Pizza & Pasta 🍕'
                      }, {
                        key: 'bakery',
                        label: 'Bakery 🥐'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.foodCuisines, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              foodCuisines: toggleMultiFilter(prev.foodCuisines, item.key, 'all'),
                              foodCuisine: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Meal Budget"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Budget'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹150'
                      }, {
                        key: '500_2000',
                        label: '₹150 - ₹400'
                      }, {
                        key: '2000_10000',
                        label: '₹400+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('food_speed'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Zap, {
                        color: "#EAB308",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Delivery Options"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.foodDeliverySpeed
                      }), expandedSection === 'food_speed' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'food_speed' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Standard Delivery'
                      }, {
                        key: 'fast',
                        label: 'Express Delivery (<30 mins) ⚡'
                      }, {
                        key: 'pickup',
                        label: 'Self Pickup 🏬'
                      }].map(sp => {
                        var isSelected = draftFilters.foodDeliverySpeed === sp.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            foodDeliverySpeed: sp.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: sp.label
                          })
                        }, sp.key);
                      })
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Stay' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('stay_prop'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bed, {
                        color: "#6366F1",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Property Type"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.stayPropertyTypes, 'All Properties')
                      }), expandedSection === 'stay_prop' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'stay_prop' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Properties'
                      }, {
                        key: 'hotel',
                        label: 'Hotels 🏨'
                      }, {
                        key: 'resort',
                        label: 'Resorts 🌴'
                      }, {
                        key: 'homestay',
                        label: 'Homestays 🏡'
                      }, {
                        key: 'villa',
                        label: 'Villas 🏰'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.stayPropertyTypes, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              stayPropertyTypes: toggleMultiFilter(prev.stayPropertyTypes, item.key, 'all'),
                              stayPropertyType: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('stay_class'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Award, {
                        color: "#8B5CF6",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Room Class"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.stayRoomClasses, 'Any Room Class')
                      }), expandedSection === 'stay_class' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'stay_class' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Room Class'
                      }, {
                        key: 'standard',
                        label: 'Standard Room'
                      }, {
                        key: 'deluxe',
                        label: 'Deluxe Room'
                      }, {
                        key: 'suite',
                        label: 'Luxury Suite'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.stayRoomClasses, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              stayRoomClasses: toggleMultiFilter(prev.stayRoomClasses, item.key, 'all'),
                              stayRoomClass: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Price Per Night"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Price'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹1,500'
                      }, {
                        key: '500_2000',
                        label: '₹1,500 - ₹3,500'
                      }, {
                        key: '2000_10000',
                        label: '₹3,500 - ₹7,000'
                      }, {
                        key: 'above_10000',
                        label: '₹7,000+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('stay_amens'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Sparkles, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Amenities"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.stayAmenities.length > 0 ? `${draftFilters.stayAmenities.length} selected` : 'All'
                      }), expandedSection === 'stay_amens' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'stay_amens' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: [{
                      key: 'wifi',
                      label: 'Free High-Speed WiFi 📶'
                    }, {
                      key: 'ac',
                      label: 'Air Conditioning ❄️'
                    }, {
                      key: 'pool',
                      label: 'Swimming Pool 🏊'
                    }, {
                      key: 'breakfast',
                      label: 'Complimentary Breakfast 🍳'
                    }, {
                      key: 'parking',
                      label: 'Free Parking 🚗'
                    }, {
                      key: 'power_backup',
                      label: 'Power Backup ⚡'
                    }].map(am => {
                      var isChecked = draftFilters.stayAmenities.includes(am.key);
                      return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                        style: styles.checkboxItem,
                        onPress: () => setDraftFilters(prev => ({
                          ...prev,
                          stayAmenities: isChecked ? prev.stayAmenities.filter(x => x !== am.key) : [...prev.stayAmenities, am.key]
                        })),
                        children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                          style: [styles.checkboxBox, isChecked && styles.checkboxBoxActive],
                          children: isChecked && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Check, {
                            color: "#0F172A",
                            size: 12
                          })
                        }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                          style: [styles.checkboxText, {
                            color: colors.text
                          }],
                          children: am.label
                        })]
                      }, am.key);
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Travel' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('travel_bus'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Bus, {
                        color: "#0284C7",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Bus & Coach Class"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.travelBusClasses, 'All Classes')
                      }), expandedSection === 'travel_bus' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'travel_bus' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Classes'
                      }, {
                        key: 'ac_sleeper',
                        label: 'AC Sleeper 🛏️'
                      }, {
                        key: 'non_ac_sleeper',
                        label: 'Non-AC Sleeper'
                      }, {
                        key: 'ac_seater',
                        label: 'AC Seater 💺'
                      }, {
                        key: 'volvo',
                        label: 'Volvo Multi-Axle 🚍'
                      }, {
                        key: 'luxury',
                        label: 'Luxury Coach ✨'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.travelBusClasses, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              travelBusClasses: toggleMultiFilter(prev.travelBusClasses, item.key, 'all'),
                              travelBusClass: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('travel_time'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Clock, {
                        color: "#0284C7",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Departure Slot"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.travelDepartureSlots, 'Any Departure Time')
                      }), expandedSection === 'travel_time' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'travel_time' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Departure Time'
                      }, {
                        key: 'morning',
                        label: 'Morning (6 AM - 12 PM) 🌅'
                      }, {
                        key: 'afternoon',
                        label: 'Afternoon (12 PM - 6 PM) ☀️'
                      }, {
                        key: 'evening',
                        label: 'Evening (6 PM - 11 PM) 🌆'
                      }, {
                        key: 'night',
                        label: 'Night (11 PM - 6 AM) 🌙'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.travelDepartureSlots, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              travelDepartureSlots: toggleMultiFilter(prev.travelDepartureSlots, item.key, 'all'),
                              travelDepartureSlot: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Ticket Fare"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Fare'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹500'
                      }, {
                        key: '500_2000',
                        label: '₹500 - ₹1,200'
                      }, {
                        key: '2000_10000',
                        label: '₹1,200+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Job' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_cat'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Briefcase, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Job Category"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.subCategories, 'All Categories')
                      }), expandedSection === 'job_cat' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_cat' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableSubcategoriesForCategory('Job').map(subName => {
                        var isSelected = isMultiSelected(draftFilters.subCategories, subName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextSubs = toggleMultiFilter(prev.subCategories, subName);
                              return {
                                ...prev,
                                subCategories: nextSubs,
                                subCategory: nextSubs[0] || 'All',
                                childCategories: ['All'],
                                childCategory: 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: subName
                          })
                        }, subName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_role'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.UserCheck, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Role / Specialization"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.childCategories, 'All Roles')
                      }), expandedSection === 'job_role' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_role' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableChildCategories('Job', draftFilters.subCategories).map(roleName => {
                        var isSelected = isMultiSelected(draftFilters.childCategories, roleName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextChildren = toggleMultiFilter(prev.childCategories, roleName);
                              return {
                                ...prev,
                                childCategories: nextChildren,
                                childCategory: nextChildren[0] || 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: roleName
                          })
                        }, roleName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_type'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Briefcase, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Job Type"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.jobTypes, 'All Types')
                      }), expandedSection === 'job_type' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_type' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Types'
                      }, {
                        key: 'Full-time',
                        label: 'Full-time 💼'
                      }, {
                        key: 'Part-time',
                        label: 'Part-time ⏱️'
                      }, {
                        key: 'Remote',
                        label: 'Remote / WFH 🏠'
                      }, {
                        key: 'Internship',
                        label: 'Internship 🎓'
                      }, {
                        key: 'Hybrid',
                        label: 'Hybrid 🏢'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.jobTypes, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              jobTypes: toggleMultiFilter(prev.jobTypes, item.key, 'all'),
                              jobTypeFilter: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_exp'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.GraduationCap, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Experience Required"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.jobExperiences, 'Any Experience')
                      }), expandedSection === 'job_exp' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_exp' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Experience'
                      }, {
                        key: 'fresher',
                        label: 'Fresher / 0-1 yr 🌟'
                      }, {
                        key: '1_2',
                        label: '1 - 2 Years'
                      }, {
                        key: '2_5',
                        label: '2 - 5 Years'
                      }, {
                        key: '5_plus',
                        label: '5+ Years Senior'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.jobExperiences, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              jobExperiences: toggleMultiFilter(prev.jobExperiences, item.key, 'all'),
                              jobExperience: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_salary'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Salary / Package (LPA)"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.jobSalary.replace('_', ' ')
                      }), expandedSection === 'job_salary' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_salary' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Package'
                      }, {
                        key: 'under_3',
                        label: 'Under ₹3 LPA'
                      }, {
                        key: '3_6',
                        label: '₹3 - ₹6 LPA'
                      }, {
                        key: '6_12',
                        label: '₹6 - ₹12 LPA'
                      }, {
                        key: '12_plus',
                        label: '₹12 LPA+'
                      }].map(item => {
                        var isSelected = draftFilters.jobSalary === item.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            jobSalary: item.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('job_mode'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.MapPin, {
                        color: "#4F46E5",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Work Mode / Location"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.jobWorkModes, 'Any Mode')
                      }), expandedSection === 'job_mode' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'job_mode' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Mode'
                      }, {
                        key: 'remote',
                        label: 'Remote / WFH 🌐'
                      }, {
                        key: 'in_office',
                        label: 'In-Office / On-Site 🏢'
                      }, {
                        key: 'hybrid',
                        label: 'Hybrid 💻'
                      }].map(item => {
                        var isSelected = isMultiSelected(draftFilters.jobWorkModes, item.key, 'all');
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => ({
                              ...prev,
                              jobWorkModes: toggleMultiFilter(prev.jobWorkModes, item.key, 'all'),
                              jobWorkMode: item.key
                            }));
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: item.label
                          })
                        }, item.key);
                      })
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Services' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('service_cat'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Wrench, {
                        color: "#0D9488",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Service Category"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.subCategories, 'All Services')
                      }), expandedSection === 'service_cat' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'service_cat' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableSubcategoriesForCategory('Services').map(subName => {
                        var isSelected = isMultiSelected(draftFilters.subCategories, subName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextSubs = toggleMultiFilter(prev.subCategories, subName);
                              return {
                                ...prev,
                                subCategories: nextSubs,
                                subCategory: nextSubs[0] || 'All',
                                childCategories: ['All'],
                                childCategory: 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: subName
                          })
                        }, subName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('service_type'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.CheckSquare, {
                        color: "#0D9488",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Service Type"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.childCategories, 'All Types')
                      }), expandedSection === 'service_type' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'service_type' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableChildCategories('Services', draftFilters.subCategories).map(roleName => {
                        var isSelected = isMultiSelected(draftFilters.childCategories, roleName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextChildren = toggleMultiFilter(prev.childCategories, roleName);
                              return {
                                ...prev,
                                childCategories: nextChildren,
                                childCategory: nextChildren[0] || 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: roleName
                          })
                        }, roleName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Service Charge"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Any Price'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹300'
                      }, {
                        key: '500_2000',
                        label: '₹300 - ₹800'
                      }, {
                        key: '2000_10000',
                        label: '₹800+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('service_book'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ShieldCheck, {
                        color: "#16A34A",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Booking & Trust"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.serviceBookingType
                      }), expandedSection === 'service_book' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'service_book' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'Standard Booking'
                      }, {
                        key: 'instant',
                        label: 'Instant Booking ⚡'
                      }, {
                        key: 'same_day',
                        label: 'Same Day Service 🕒'
                      }, {
                        key: 'verified',
                        label: 'Verified Pros ✔️'
                      }].map(bk => {
                        var isSelected = draftFilters.serviceBookingType === bk.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            serviceBookingType: bk.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: bk.label
                          })
                        }, bk.key);
                      })
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Product' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('product_dept'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Layers, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Department"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.subCategories, 'All Departments')
                      }), expandedSection === 'product_dept' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'product_dept' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableSubcategoriesForCategory('Product').map(subName => {
                        var isSelected = isMultiSelected(draftFilters.subCategories, subName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextSubs = toggleMultiFilter(prev.subCategories, subName);
                              return {
                                ...prev,
                                subCategories: nextSubs,
                                subCategory: nextSubs[0] || 'All',
                                childCategories: ['All'],
                                childCategory: 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: subName
                          })
                        }, subName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('product_type'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Tag, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Product Type"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.childCategories, 'All Types')
                      }), expandedSection === 'product_type' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'product_type' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableChildCategories('Product', draftFilters.subCategories).map(roleName => {
                        var isSelected = isMultiSelected(draftFilters.childCategories, roleName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextChildren = toggleMultiFilter(prev.childCategories, roleName);
                              return {
                                ...prev,
                                childCategories: nextChildren,
                                childCategory: nextChildren[0] || 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: roleName
                          })
                        }, roleName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Price Range"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Prices'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹500'
                      }, {
                        key: '500_2000',
                        label: '₹500 - ₹2,000'
                      }, {
                        key: '2000_10000',
                        label: '₹2,000 - ₹10,000'
                      }, {
                        key: 'above_10000',
                        label: '₹10,000+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('prod_stock'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.PackageCheck, {
                        color: "#16A34A",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Stock & Delivery"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.productStockOnly ? 'In Stock' : 'All'
                      }), expandedSection === 'prod_stock' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'prod_stock' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                      style: styles.checkboxItem,
                      onPress: () => setDraftFilters(prev => ({
                        ...prev,
                        productStockOnly: !prev.productStockOnly
                      })),
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                        style: [styles.checkboxBox, draftFilters.productStockOnly && styles.checkboxBoxActive],
                        children: draftFilters.productStockOnly && /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Check, {
                          color: "#0F172A",
                          size: 12
                        })
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.checkboxText, {
                          color: colors.text
                        }],
                        children: "In Stock Items Only \uD83D\uDCE6"
                      })]
                    })
                  })]
                })]
              }), draftFilters.categoryType === 'Daily Needs' && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
                children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('daily_section'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.Layers, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Section"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.subCategories, 'All Sections')
                      }), expandedSection === 'daily_section' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'daily_section' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableSubcategoriesForCategory('Daily Needs').map(subName => {
                        var isSelected = isMultiSelected(draftFilters.subCategories, subName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextSubs = toggleMultiFilter(prev.subCategories, subName);
                              return {
                                ...prev,
                                subCategories: nextSubs,
                                subCategory: nextSubs[0] || 'All',
                                childCategories: ['All'],
                                childCategory: 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: subName
                          })
                        }, subName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('daily_type'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.CheckSquare, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Item Type"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: getMultiPreviewText(draftFilters.childCategories, 'All Types')
                      }), expandedSection === 'daily_type' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'daily_type' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: getAvailableChildCategories('Daily Needs', draftFilters.subCategories).map(roleName => {
                        var isSelected = isMultiSelected(draftFilters.childCategories, roleName);
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => {
                            _reactNative.LayoutAnimation.configureNext(_reactNative.LayoutAnimation.Presets.easeInEaseOut);
                            setDraftFilters(prev => {
                              var nextChildren = toggleMultiFilter(prev.childCategories, roleName);
                              return {
                                ...prev,
                                childCategories: nextChildren,
                                childCategory: nextChildren[0] || 'All'
                              };
                            });
                          },
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: roleName
                          })
                        }, roleName);
                      })
                    })
                  })]
                }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                  style: [styles.accordionSection, {
                    borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)'
                  }],
                  children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
                    style: styles.accordionHeader,
                    onPress: () => toggleAccordion('price'),
                    children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionTitleRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.BadgeIndianRupee, {
                        color: "#F5B800",
                        size: 16
                      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: [styles.accordionTitle, {
                          color: colors.text
                        }],
                        children: "Budget Range"
                      })]
                    }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
                      style: styles.accordionRightRow,
                      children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                        style: styles.accordionPreviewText,
                        children: draftFilters.priceRange.replace('_', ' ')
                      }), expandedSection === 'price' ? /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronUp, {
                        color: colors.text,
                        size: 16
                      }) : /*#__PURE__*/(0, _jsxRuntime.jsx)(Icons.ChevronDown, {
                        color: colors.text,
                        size: 16
                      })]
                    })]
                  }), expandedSection === 'price' && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                    style: styles.accordionContent,
                    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
                      style: styles.filterPillsRow,
                      children: [{
                        key: 'all',
                        label: 'All Budgets'
                      }, {
                        key: 'under_500',
                        label: 'Under ₹200'
                      }, {
                        key: '500_2000',
                        label: '₹200 - ₹500'
                      }, {
                        key: '2000_10000',
                        label: '₹500+'
                      }].map(pr => {
                        var isSelected = draftFilters.priceRange === pr.key;
                        return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                          style: [styles.filterPill, {
                            backgroundColor: isSelected ? '#F5B800' : isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#F1EAD8' : colors.cardBorder
                          }],
                          onPress: () => setDraftFilters(prev => ({
                            ...prev,
                            priceRange: pr.key
                          })),
                          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                            style: [styles.filterPillText, {
                              color: isSelected ? '#0F172A' : colors.text
                            }],
                            children: pr.label
                          })
                        }, pr.key);
                      })
                    })
                  })]
                })]
              })]
            }), /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
              style: [styles.modalFooterRow, {
                borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)'
              }],
              children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: [styles.resetBtn, {
                  borderColor: isLight ? '#CBD5E1' : colors.cardBorder
                }],
                onPress: handleResetFilters,
                children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
                  style: [styles.resetBtnText, {
                    color: colors.text
                  }],
                  children: "Reset"
                })
              }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.TouchableOpacity, {
                style: styles.applyBtn,
                onPress: handleApplyFilters,
                children: /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.Text, {
                  style: styles.applyBtnText,
                  children: ["Apply Filters \u2022 ", draftResultCount, " ", draftResultCount === 1 ? 'Result' : 'Results']
                })
              })]
            })]
          })
        })
      })]
    });
  }
  var styles = _reactNative.StyleSheet.create({
    container: {
      flex: 1
    },
    headerWrapper: {
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 8
    },
    topHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 38,
      marginBottom: 6,
      gap: 6
    },
    locationSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
      maxWidth: 135,
      height: 30
    },
    locationText: {
      fontSize: 10.5,
      fontWeight: '700',
      flexShrink: 1
    },
    headerTitle: {
      fontSize: 14.5,
      fontWeight: '900',
      letterSpacing: 0.5,
      textAlign: 'center',
      flex: 1,
      marginHorizontal: 4
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2
    },
    headerBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    },
    badge: {
      position: 'absolute',
      top: -1,
      right: -1,
      backgroundColor: '#EF4444',
      borderRadius: 6,
      minWidth: 12,
      height: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 7.5,
      fontWeight: 'bold'
    },
    searchAndFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingLeft: 10,
      paddingRight: 4,
      height: 38,
      borderWidth: 1.2,
      gap: 6
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      paddingVertical: 0
    },
    micBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center'
    },
    inlineListeningRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4
    },
    waveformContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 24,
      paddingLeft: 2,
      paddingRight: 6
    },
    waveBar: {
      width: 3.5,
      backgroundColor: '#F5B800',
      borderRadius: 2
    },
    listeningText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: '#F5B800',
      letterSpacing: 0.3
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
      borderWidth: 1.2,
      gap: 5,
      position: 'relative'
    },
    filterBtnText: {
      fontSize: 11.5,
      fontWeight: '700'
    },
    filterCountBadge: {
      backgroundColor: '#F5B800',
      width: 14,
      height: 14,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center'
    },
    filterCountText: {
      color: '#0F172A',
      fontSize: 8.5,
      fontWeight: 'bold'
    },
    activeChipsContainer: {
      paddingTop: 6,
      gap: 6,
      alignItems: 'center'
    },
    activeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FEF9E7',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 4
    },
    activeFilterChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0F172A',
      textTransform: 'capitalize'
    },
    clearAllChip: {
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    clearAllChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#EF4444'
    },
    voiceErrorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 184, 0, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 6,
      gap: 6
    },
    voiceErrorText: {
      flex: 1,
      fontSize: 11.5,
      color: '#F5B800',
      fontWeight: '600'
    },
    voiceRetryBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: '#F5B800',
      borderRadius: 4
    },
    voiceRetryBtnText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#0F172A'
    },
    topSliderWrapper: {
      borderBottomWidth: 1,
      paddingVertical: 6
    },
    topSliderContent: {
      paddingHorizontal: 12,
      gap: 8
    },
    topSliderBtn: {
      alignItems: 'center',
      width: 58
    },
    topIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: 3
    },
    topLabel: {
      fontSize: 9.5,
      fontWeight: '600',
      textAlign: 'center'
    },
    topLabelActive: {
      fontWeight: '800'
    },
    mainLayout: {
      flex: 1,
      flexDirection: 'row'
    },
    leftSidebar: {
      width: 80,
      borderRightWidth: 1
    },
    leftSidebarItem: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      position: 'relative',
      marginVertical: 2,
      borderRadius: 8,
      marginHorizontal: 4
    },
    leftSidebarIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4
    },
    activeSidebarIndicator: {
      position: 'absolute',
      left: -4,
      top: 6,
      bottom: 6,
      width: 3,
      borderRadius: 2
    },
    leftSidebarText: {
      fontSize: 9.5,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 12
    },
    rightContent: {
      flex: 1
    },
    rightHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 2
    },
    sectionHeaderTitle: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5
    },
    resultCountText: {
      fontSize: 11.5,
      fontWeight: '600'
    },
    subcatGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12
    },
    subcatCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 8,
      marginBottom: 4,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2
    },
    subcatCardImage: {
      width: '100%',
      height: 95,
      borderRadius: 10,
      backgroundColor: '#E2E8F0',
      marginBottom: 6
    },
    subcatCardDetails: {
      width: '100%',
      paddingHorizontal: 2,
      paddingBottom: 2
    },
    subcatCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 17,
      marginBottom: 4
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2
    },
    subcatCardCount: {
      fontSize: 10.5,
      fontWeight: '600'
    },
    ratingBadgeMini: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(245, 184, 0, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6
    },
    ratingBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#D97706'
    },
    emptyGrid: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 8
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginTop: 8
    },
    emptySub: {
      fontSize: 11.5,
      textAlign: 'center',
      paddingHorizontal: 20
    },
    emptyResetBtn: {
      backgroundColor: '#F5B800',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 8
    },
    emptyResetBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A'
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(5, 11, 30, 0.65)',
      justifyContent: 'flex-end'
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      paddingTop: 18,
      paddingBottom: 28,
      maxHeight: '85%'
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1
    },
    modalHeaderTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 0.3
    },
    modalHeaderSub: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 2
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center'
    },
    modalScroll: {
      paddingHorizontal: 16,
      paddingVertical: 8
    },
    accordionSection: {
      borderBottomWidth: 1,
      paddingVertical: 12
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4
    },
    accordionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    accordionTitle: {
      fontSize: 13.5,
      fontWeight: '700'
    },
    accordionRightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    accordionPreviewText: {
      fontSize: 11.5,
      color: '#D97706',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    accordionContent: {
      paddingTop: 12,
      paddingBottom: 4
    },
    filterPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600'
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 8
    },
    radioItemSelected: {
      backgroundColor: 'rgba(245, 184, 0, 0.08)'
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: '#94A3B8',
      alignItems: 'center',
      justifyContent: 'center'
    },
    radioCircleActive: {
      borderColor: '#F5B800'
    },
    radioDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: '#F5B800'
    },
    radioText: {
      fontSize: 13,
      fontWeight: '500'
    },
    checkboxItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 6
    },
    checkboxBox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: '#94A3B8',
      alignItems: 'center',
      justifyContent: 'center'
    },
    checkboxBoxActive: {
      backgroundColor: '#F5B800',
      borderColor: '#F5B800'
    },
    checkboxText: {
      fontSize: 12.5,
      fontWeight: '500'
    },
    modalFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 14,
      borderTopWidth: 1
    },
    resetBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    resetBtnText: {
      fontSize: 13,
      fontWeight: '700'
    },
    applyBtn: {
      flex: 2,
      height: 46,
      borderRadius: 12,
      backgroundColor: '#F5B800',
      alignItems: 'center',
      justifyContent: 'center'
    },
    applyBtnText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#0F172A'
    },
    // ==========================================
    // DEDICATED TRAVEL PORTAL STYLES
    // ==========================================
    travelPortalContainer: {
      width: '100%',
      paddingBottom: 24
    },
    travelHeroCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      marginBottom: 14,
      paddingHorizontal: 8
    },
    travelHeaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(245, 184, 0, 0.15)',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      marginBottom: 8
    },
    travelHeaderBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#D97706',
      letterSpacing: 0.8
    },
    travelHeroTitle: {
      fontSize: 23,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.4
    },
    travelHeroSubtitle: {
      fontSize: 12.5,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 12
    },
    travelBookingCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 3
      },
      shadowOpacity: 0.08,
      shadowRadius: 8
    },
    travelFieldBlock: {
      marginBottom: 10
    },
    travelFieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4
    },
    travelFieldLabel: {
      fontSize: 12.5,
      fontWeight: '700'
    },
    travelTextInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 42,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12
    },
    travelTextInput: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: '500',
      paddingVertical: 0
    },
    travelSwapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: -2,
      marginBottom: 6,
      zIndex: 10
    },
    travelSwapLine: {
      flex: 1,
      height: 1
    },
    travelSwapButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
      backgroundColor: '#F5B800',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1
      },
      shadowOpacity: 0.15,
      shadowRadius: 2
    },
    travelDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 42,
      borderWidth: 1.2,
      borderRadius: 10,
      paddingHorizontal: 12
    },
    travelDropdownValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1
    },
    travelDropdownValueText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1
    },
    travelDropdownMenu: {
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 4,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.15,
      shadowRadius: 6
    },
    travelDropdownMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(150, 150, 150, 0.15)'
    },
    travelDropdownMenuIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center'
    },
    travelDropdownMenuTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 1
    },
    travelDropdownMenuSub: {
      fontSize: 10.5
    },
    travelQuickPillsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 6
    },
    travelQuickPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      height: 28,
      borderRadius: 8,
      borderWidth: 1
    },
    travelQuickPillText: {
      fontSize: 11
    },
    travelPresetStrip: {
      marginBottom: 10
    },
    travelPresetLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 4
    },
    travelPresetScroll: {
      gap: 6,
      paddingVertical: 1
    },
    travelPresetChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      borderWidth: 1
    },
    travelPresetChipText: {
      fontSize: 11
    },
    travelSearchButton: {
      height: 48,
      borderRadius: 12,
      backgroundColor: '#F5B800',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
      elevation: 3,
      shadowColor: '#F5B800',
      shadowOffset: {
        width: 0,
        height: 3
      },
      shadowOpacity: 0.28,
      shadowRadius: 5
    },
    travelSearchButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0F172A',
      letterSpacing: 0.3
    },
    travelHighlightsContainer: {
      marginBottom: 16
    },
    travelHighlightsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10
    },
    travelHighlightCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1
    },
    travelHighlightIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center'
    },
    travelHighlightTitle: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 2
    },
    travelHighlightDesc: {
      fontSize: 10.5,
      lineHeight: 14
    },
    popularTravelRoutesSection: {
      marginTop: 2,
      marginBottom: 20
    },
    popularRoutesHeaderRow: {
      marginBottom: 10
    },
    popularRoutesTitle: {
      fontSize: 16,
      fontWeight: '800'
    },
    popularRoutesSubtitle: {
      fontSize: 12,
      marginTop: 2
    },
    popularRoutesList: {
      gap: 8
    },
    popularRouteCard: {
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14
    },
    popularRouteCityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    popularRouteCityName: {
      fontSize: 13.5,
      fontWeight: '700',
      marginBottom: 2
    },
    popularRouteMetaText: {
      fontSize: 11
    },
    popularRouteFareCol: {
      alignItems: 'flex-end',
      marginRight: 10
    },
    popularRouteFareText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#D97706'
    },
    popularRouteOnwardsText: {
      fontSize: 9.5
    },
    popularRouteArrowBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#F5B800',
      alignItems: 'center',
      justifyContent: 'center'
    },
    ratingCountText: {
      fontSize: 9.5,
      color: '#D97706',
      fontWeight: '500',
      marginLeft: 2
    },
    // ==========================================
    // DEDICATED STAY PORTAL STYLES (SCREENSHOT 1)
    // ==========================================
    stayPortalContainer: {
      paddingHorizontal: 2,
      paddingTop: 4,
      paddingBottom: 24
    },
    stayPortalTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4
    },
    stayPortalBackBtn: {
      padding: 6,
      marginRight: 8
    },
    stayPortalTitleLarge: {
      fontSize: 27,
      fontWeight: '900',
      flex: 1,
      letterSpacing: -0.5
    },
    stayHotelDealRow: {
      paddingHorizontal: 4,
      marginTop: 2,
      marginBottom: 10,
      alignItems: 'flex-start'
    },
    staySingleHotelDealBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF1F2',
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: '#E11D48'
    },
    staySwitcherTabTitleActive: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#E11D48'
    },
    staySwitcherTabOfferActive: {
      fontSize: 10,
      fontWeight: '800',
      color: '#059669'
    },
    stayHeroSection: {
      paddingHorizontal: 6,
      marginTop: 8,
      marginBottom: 14
    },
    stayHeroTextCol: {
      flex: 1
    },
    stayHeroTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#0F172A',
      lineHeight: 30,
      letterSpacing: -0.5
    },
    staySearchCardContainer: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      elevation: 4,
      shadowColor: '#0F172A',
      shadowOffset: {
        width: 0,
        height: 3
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      marginBottom: 14
    },
    stayVerifiedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1D4ED8',
      paddingVertical: 7,
      gap: 6
    },
    stayVerifiedBannerText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '800',
      letterSpacing: 0.2
    },
    stayWhiteCardBody: {
      backgroundColor: '#FFFFFF'
    },
    stayCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    stayCardRowIconBox: {
      width: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    stayCardRowLabel: {
      fontSize: 11.5,
      fontWeight: '600',
      color: '#64748B',
      marginBottom: 2
    },
    stayCardRowValue: {
      fontSize: 15.5,
      fontWeight: '800',
      color: '#0F172A'
    },
    stayCardRowDivider: {
      height: 1,
      backgroundColor: '#F1F5F9',
      marginHorizontal: 14
    },
    stayCardVerticalDivider: {
      width: 1,
      backgroundColor: '#E2E8F0',
      marginVertical: 2
    },
    staySearchRedBtn: {
      backgroundColor: '#E11D48',
      paddingVertical: 15,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 3,
      shadowColor: '#E11D48',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      marginTop: 4
    },
    staySearchRedBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.3
    },
    stayActiveSearchSummaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF1F2',
      borderWidth: 1.5,
      borderColor: '#FECDD3',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14
    },
    stayActiveSummaryDest: {
      fontSize: 14,
      fontWeight: '800'
    },
    stayActiveSummaryDates: {
      fontSize: 11.5,
      color: '#64748B',
      marginTop: 1,
      fontWeight: '600'
    },
    stayModifySearchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FDA4AF',
      gap: 4
    },
    stayModifySearchBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#E11D48'
    },
    // ==========================================
    // STAY DESTINATION MODAL STYLES (SCREENSHOT 2)
    // ==========================================
    destModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      gap: 10
    },
    destModalBackBtn: {
      padding: 6
    },
    destInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 8
    },
    destTextInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: 0
    },
    destSectionHeaderTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.8,
      marginTop: 18,
      marginBottom: 8
    },
    destResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      gap: 12
    },
    destFeaturedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12
    },
    destIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center'
    },
    destIconBoxRound: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center'
    },
    destResultTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      color: '#0F172A'
    },
    destResultSub: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 2,
      fontWeight: '500'
    },
    destDropPointBadge: {
      backgroundColor: '#ECFDF5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#A7F3D0'
    },
    destDropPointBadgeText: {
      fontSize: 10,
      color: '#059669',
      fontWeight: '800'
    },
    // ==========================================
    // STAY CALENDAR RANGE PICKER STYLES (SCREENSHOT 3)
    // ==========================================
    calendarModalTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    calendarModalTopTitle: {
      fontSize: 17,
      fontWeight: '800'
    },
    calendarOfferBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3E8FF',
      paddingVertical: 8,
      marginHorizontal: 16,
      borderRadius: 10,
      gap: 6,
      marginBottom: 12
    },
    calendarOfferBannerText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#6D28D9'
    },
    calendarWeekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
      marginBottom: 10
    },
    calendarWeekdayLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#64748B',
      width: 42,
      textAlign: 'center'
    },
    calendarMonthHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10
    },
    calendarMonthTitle: {
      fontSize: 17,
      fontWeight: '800'
    },
    calendarHolidaysSub: {
      fontSize: 11.5,
      fontWeight: '600',
      color: '#64748B',
      marginTop: 2
    },
    calendarLongWeekendPill: {
      alignSelf: 'flex-start',
      backgroundColor: '#CCFBF1',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: '#99F6E4'
    },
    calendarLongWeekendText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#0F766E'
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap'
    },
    calendarDayCell: {
      width: `${100 / 7}%`,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center'
    },
    calendarDayCellInRange: {
      backgroundColor: '#1E293B'
    },
    calendarDayCellCheckIn: {
      backgroundColor: '#0F172A',
      borderTopLeftRadius: 26,
      borderBottomLeftRadius: 26
    },
    calendarDayCellCheckOut: {
      backgroundColor: '#0F172A',
      borderTopRightRadius: 26,
      borderBottomRightRadius: 26
    },
    calendarDayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center'
    },
    calendarDayCircleSelected: {
      backgroundColor: '#0F172A'
    },
    calendarDayNumber: {
      fontSize: 14,
      fontWeight: '700'
    },
    calendarDayNumberSelected: {
      color: '#FFFFFF',
      fontWeight: '800'
    },
    calendarHolidayTag: {
      fontSize: 8,
      color: '#D97706',
      fontWeight: '700',
      position: 'absolute',
      bottom: 2
    },
    calendarBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
      borderTopWidth: 1,
      elevation: 8
    },
    calendarBottomSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    },
    calendarSummaryBox: {
      flex: 1
    },
    calendarSummaryBoxLabel: {
      fontSize: 11,
      color: '#64748B',
      fontWeight: '600'
    },
    calendarSummaryBoxValue: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#0F172A',
      marginTop: 2
    },
    calendarSummaryNightsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      gap: 4,
      marginHorizontal: 8
    },
    calendarSummaryNightsText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0F172A'
    },
    calendarSelectDatesBtn: {
      backgroundColor: '#E11D48',
      paddingVertical: 14,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center'
    },
    calendarSelectDatesBtnText: {
      color: '#FFFFFF',
      fontSize: 15.5,
      fontWeight: '800'
    },
    // ==========================================
    // STAY GUESTS & ROOMS MODAL STYLES (SCREENSHOT 4)
    // ==========================================
    guestModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end'
    },
    guestModalSheet: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28
    },
    guestModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    guestModalTitle: {
      fontSize: 17,
      fontWeight: '800'
    },
    guestItemRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    guestIconBox: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    guestItemTitle: {
      fontSize: 15.5,
      fontWeight: '800'
    },
    guestItemSub: {
      fontSize: 11.5,
      color: '#64748B',
      marginTop: 2,
      fontWeight: '500'
    },
    guestStepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 12,
      overflow: 'hidden'
    },
    guestStepBtn: {
      width: 44,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F1F5F9'
    },
    guestStepBtnDisabled: {
      opacity: 0.5
    },
    guestStepBtnPlus: {
      backgroundColor: '#FFE4E6'
    },
    guestStepVal: {
      fontSize: 15.5,
      fontWeight: '800',
      minWidth: 36,
      textAlign: 'center'
    },
    guestAddChildBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFE4E6',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#FDA4AF',
      gap: 4
    },
    guestAddChildBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0F172A'
    },
    guestProceedBtn: {
      backgroundColor: '#E11D48',
      paddingVertical: 14,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10
    },
    guestProceedBtnText: {
      color: '#FFFFFF',
      fontSize: 15.5,
      fontWeight: '800'
    }
  });


export default Categories;
