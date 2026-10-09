import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { apiFetch } from '../../services/api';

const ADDRESSES_STORAGE_KEY = 'connect_app_customer_addresses';

export const DEFAULT_SAVED_ADDRESSES: CustomerAddress[] = [];

export interface CustomerAddress {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  house: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function MyAddresses() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const isGuest = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
  const storageKey = isGuest ? 'connect_guest_addresses' : `connect_user_addresses_${currentUser?.id || 'registered'}`;

  // Addresses state
  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => {
    if (isGuest) return [];
    if (currentUser?.address) {
      return [
        {
          id: `addr_reg_${currentUser.id}`,
          userId: currentUser.id,
          label: 'Home',
          name: currentUser.name,
          phone: currentUser.phone || '',
          house: currentUser.address.address || '',
          street: currentUser.address.city || 'Bengaluru',
          city: currentUser.address.city || 'Bengaluru',
          state: currentUser.address.state || 'Karnataka',
          pincode: currentUser.address.pincode || '560034',
          isDefault: true,
        },
      ];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields
  const [formLabel, setFormLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHouse, setFormHouse] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Helper to persist to AsyncStorage
  const saveToStorage = async (list: CustomerAddress[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {
      console.warn('[MyAddresses] Failed to persist addresses:', e);
    }
  };

  // Load Addresses from Local Storage & API without blocking UI
  const loadAddresses = useCallback(() => {
    if (isGuest) {
      AsyncStorage.getItem(storageKey)
        .then((cached) => {
          setAddresses(cached ? JSON.parse(cached) : []);
        })
        .catch(() => setAddresses([]))
        .finally(() => setLoading(false));
      return;
    }

    const uId = currentUser?.id || 'guest_user';

    AsyncStorage.getItem(storageKey)
      .then((cached) => {
        let hasLocal = false;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            hasLocal = true;
            setAddresses(parsed);
          }
        }
        apiFetch(`/customer/addresses?userId=${encodeURIComponent(uId)}`)
          .then((res) => {
            if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
              if (!hasLocal) {
                setAddresses(res.data);
                saveToStorage(res.data);
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, [currentUser, isGuest, storageKey]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  // Set Address as Default (Instant optimistic UI response)
  const handleSetDefault = (addrId: string) => {
    const uId = currentUser?.id || 'guest_user';
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === addrId,
    }));
    setAddresses(updated);
    saveToStorage(updated);

    apiFetch(`/customer/addresses/${addrId}/default?userId=${encodeURIComponent(uId)}`, {
      method: 'PATCH',
    }).catch(() => {});
  };

  // Delete Address (Instant optimistic UI response)
  const handleDeleteAddress = (addrId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const uId = currentUser?.id || 'guest_user';
            const updated = addresses.filter((a) => a.id !== addrId);
            setAddresses(updated);
            saveToStorage(updated);

            apiFetch(`/customer/addresses/${addrId}?userId=${encodeURIComponent(uId)}`, {
              method: 'DELETE',
            }).catch(() => {});
          },
        },
      ]
    );
  };

  // Open Modal for Adding New Address
  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setFormLabel('Home');
    setFormName(currentUser?.name || '');
    setFormPhone(currentUser?.phone || '');
    setFormHouse('');
    setFormStreet('');
    setFormLandmark('');
    setFormCity('Bengaluru');
    setFormState('Karnataka');
    setFormPincode('');
    setFormIsDefault(addresses.length === 0);
    setModalVisible(true);
  };

  // Open Modal for Editing Address
  const handleOpenEditModal = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setFormLabel(addr.label);
    setFormName(addr.name);
    setFormPhone(addr.phone);
    setFormHouse(addr.house);
    setFormStreet(addr.street);
    setFormLandmark(addr.landmark || '');
    setFormCity(addr.city);
    setFormState(addr.state);
    setFormPincode(addr.pincode);
    setFormIsDefault(addr.isDefault);
    setModalVisible(true);
  };

  // Validate & Save Address
  const handleSaveAddress = async () => {
    const cleanName = formName.trim();
    const cleanPhone = formPhone.replace(/[^\d]/g, '').slice(-10);

    if (!cleanName || cleanName.length < 2 || !/^[a-zA-Z\s'.]+$/.test(cleanName)) {
      Alert.alert('Validation Error', 'Please enter a valid recipient full name (at least 2 letters, letters only).');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (!formHouse.trim()) {
      Alert.alert('Validation Error', 'Please enter house/flat/building details.');
      return;
    }
    if (!formStreet.trim()) {
      Alert.alert('Validation Error', 'Please enter street/area/locality details.');
      return;
    }
    if (!formCity.trim()) {
      Alert.alert('Validation Error', 'Please enter city name.');
      return;
    }
    if (!formState.trim()) {
      Alert.alert('Validation Error', 'Please enter state name.');
      return;
    }
    if (!formPincode.trim() || !/^\d{6}$/.test(formPincode.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit postal pincode.');
      return;
    }

    setSubmitting(true);
    const uId = currentUser?.id || 'guest_user';
    const payload = {
      userId: uId,
      label: formLabel,
      name: formName.trim(),
      phone: formPhone.trim(),
      house: formHouse.trim(),
      street: formStreet.trim(),
      landmark: formLandmark.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      pincode: formPincode.trim(),
      isDefault: formIsDefault || addresses.length === 0,
    };

    let updatedAddresses: CustomerAddress[];
    if (editingAddressId) {
      updatedAddresses = addresses.map((addr) => {
        if (addr.id === editingAddressId) {
          return { ...addr, ...payload, id: editingAddressId };
        }
        if (payload.isDefault) {
          return { ...addr, isDefault: false };
        }
        return addr;
      });
    } else {
      const newAddr: CustomerAddress = {
        ...payload,
        id: `addr_${Date.now()}`,
      };
      if (payload.isDefault) {
        updatedAddresses = [newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))];
      } else {
        updatedAddresses = [newAddr, ...addresses];
      }
    }

    // 1. Immediate optimistic UI response
    setAddresses(updatedAddresses);
    setModalVisible(false);
    setSubmitting(false);

    // 2. Background storage & API sync
    saveToStorage(updatedAddresses);

    if (payload.isDefault || updatedAddresses.length === 1) {
      useAuthStore.getState().updateProfile({
        address: {
          address: `${payload.house ? payload.house + ', ' : ''}${payload.street}`,
          house: payload.house,
          street: payload.street,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
        },
      }).catch(() => {});
    }

    if (editingAddressId) {
      apiFetch(`/customer/addresses/${editingAddressId}?userId=${encodeURIComponent(uId)}`, {
        method: 'PATCH',
        body: payload,
      }).catch(() => {});
    } else {
      apiFetch(`/customer/addresses?userId=${encodeURIComponent(uId)}`, {
        method: 'POST',
        body: payload,
      }).catch(() => {});
    }
  };

  // Filter addresses if search query is present
  const filteredAddresses = addresses.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.label.toLowerCase().includes(q) ||
      a.street.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.pincode.includes(q)
    );
  });

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'Work':
        return <Icons.Briefcase color={isLight ? '#475569' : '#94A3B8'} size={16} />;
      case 'Other':
        return <Icons.MapPin color={isLight ? '#475569' : '#94A3B8'} size={16} />;
      default:
        return <Icons.Home color={isLight ? '#475569' : '#94A3B8'} size={16} />;
    }
  };

  const isAuthenticated = isUserAuthenticated(currentUser);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
        <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Icons.MapPin color="#F4C400" size={38} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' }}>Login Required</Text>
          <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center', marginBottom: 24, lineHeight: 19 }}>
            Please sign in to view and manage your saved delivery addresses.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#F4C400', width: '100%', maxWidth: 300, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginBottom: 12 }}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Icons.LogIn size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', borderWidth: 1.5, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
            onPress={() => navigation.navigate('JoinNow')}
            activeOpacity={0.85}
          >
            <Icons.UserPlus size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Addresses</Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          activeOpacity={0.8}
          onPress={handleOpenAddModal}
        >
          <Icons.Plus color="#0F172A" size={16} />
          <Text style={styles.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#F4C400" size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading saved addresses...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icons.AlertTriangle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load addresses</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAddresses}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isLight ? '#FEFCE8' : '#1E293B', borderColor: isLight ? '#FEF08A' : '#334155' }]}>
            <Icons.MapPin color="#F4C400" size={36} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved addresses yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add your delivery addresses for quick and hassle-free checkout.
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddModal}>
            <Icons.Plus color="#0F172A" size={18} />
            <Text style={styles.emptyAddBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Addresses List */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Optional Search bar if many addresses exist */}
          {addresses.length >= 5 ? (
            <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
              <Icons.Search color={colors.textSecondary} size={18} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search addresses..."
                placeholderTextColor={colors.textSecondary}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icons.X color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={styles.listHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Saved Addresses</Text>
            <Text style={[styles.addressCountBadge, { color: colors.textSecondary }]}>{addresses.length} Saved</Text>
          </View>

          {filteredAddresses.map((addr) => (
            <View
              key={addr.id}
              style={[
                styles.addressCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
                addr.isDefault && styles.defaultCardBorder,
              ]}
            >
              {/* Card Header: Label, Default Tag & Radio Selector */}
              <View style={styles.cardHeader}>
                <View style={styles.labelBadgeRow}>
                  <View style={[styles.labelIconPill, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}>
                    {getLabelIcon(addr.label)}
                  </View>
                  <Text style={[styles.addressLabel, { color: colors.text }]}>{addr.label}</Text>
                  {addr.isDefault ? (
                    <View style={[styles.defaultBadge, { backgroundColor: isLight ? '#FEFCE8' : '#1E293B', borderColor: isLight ? '#FEF08A' : '#334155' }]}>
                      <Text style={[styles.defaultBadgeText, { color: isLight ? '#854D0E' : '#F4C400' }]}>Default</Text>
                    </View>
                  ) : null}
                </View>

                {/* Default Radio Selector */}
                <TouchableOpacity
                  style={styles.radioSelector}
                  activeOpacity={0.7}
                  onPress={() => handleSetDefault(addr.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {addr.isDefault ? (
                    <Icons.CheckCircle2 color="#059669" size={22} />
                  ) : (
                    <Icons.Circle color={colors.border} size={22} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Recipient Details */}
              <Text style={[styles.recipientName, { color: colors.text }]}>{addr.name}</Text>
              <Text style={[styles.recipientPhone, { color: colors.textSecondary }]}>{addr.phone}</Text>

              {/* Formatted Address */}
              <Text style={[styles.addressBody, { color: isLight ? '#334155' : '#CBD5E1' }]}>
                {addr.house ? `${addr.house}, ` : ''}
                {addr.street}
                {addr.landmark ? `, Near ${addr.landmark}` : ''}
                {'\n'}
                {addr.city}, {addr.state} - {addr.pincode}
              </Text>

              {/* Actions Divider */}
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              {/* Card Actions: Edit & Delete */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                  onPress={() => handleOpenEditModal(addr)}
                >
                  <Icons.Pencil color={isLight ? '#475569' : '#94A3B8'} size={15} />
                  <Text style={[styles.actionBtnText, { color: isLight ? '#475569' : '#94A3B8' }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  activeOpacity={0.7}
                  onPress={() => handleDeleteAddress(addr.id)}
                >
                  <Icons.Trash2 color="#EF4444" size={15} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Address Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.cardBackground }]}>
            {/* Sheet Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAddressId ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Address Label Selector */}
              <Text style={[styles.formSectionLabel, { color: colors.textSecondary }]}>Address Type</Text>
              <View style={styles.labelSelectorRow}>
                {(['Home', 'Work', 'Other'] as const).map((type) => {
                  const selected = formLabel === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.labelChoiceBtn,
                        { borderColor: colors.border, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' },
                        selected && { backgroundColor: isLight ? '#FEFCE8' : 'rgba(244, 196, 0, 0.15)', borderColor: '#F4C400' },
                      ]}
                      onPress={() => setFormLabel(type)}
                    >
                      {type === 'Home' ? (
                        <Icons.Home color={selected ? (isLight ? '#0F172A' : '#F4C400') : colors.textSecondary} size={16} />
                      ) : type === 'Work' ? (
                        <Icons.Briefcase color={selected ? (isLight ? '#0F172A' : '#F4C400') : colors.textSecondary} size={16} />
                      ) : (
                        <Icons.MapPin color={selected ? (isLight ? '#0F172A' : '#F4C400') : colors.textSecondary} size={16} />
                      )}
                      <Text
                        style={[
                          styles.labelChoiceText,
                          { color: colors.textSecondary },
                          selected && { color: isLight ? '#0F172A' : '#F4C400', fontWeight: 'bold' },
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Recipient Details */}
              <Text style={[styles.formSectionLabel, { color: colors.textSecondary }]}>Contact Information</Text>
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formName}
                  onChangeText={(val) => setFormName(val.replace(/[^a-zA-Z\s'.]/g, ''))}
                  placeholder="e.g. Uma"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mobile Number *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formPhone}
                  onChangeText={(val) => setFormPhone(val.replace(/[^\d]/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Address Details */}
              <Text style={[styles.formSectionLabel, { color: colors.textSecondary }]}>Address Details</Text>
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Flat, House No., Building *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formHouse}
                  onChangeText={setFormHouse}
                  placeholder="e.g. Flat 402, Sunshine Apts"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Area, Street, Sector *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formStreet}
                  onChangeText={setFormStreet}
                  placeholder="e.g. 11th Cross, 4th Block, Koramangala"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Landmark (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formLandmark}
                  onChangeText={setFormLandmark}
                  placeholder="e.g. Near Sony World Signal"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.twoColumnRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>City *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                    value={formCity}
                    onChangeText={setFormCity}
                    placeholder="Bengaluru"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pincode *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                    value={formPincode}
                    onChangeText={setFormPincode}
                    placeholder="6-digit PIN"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>State *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', borderColor: colors.border, color: colors.text }]}
                  value={formState}
                  onChangeText={setFormState}
                  placeholder="Karnataka"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Default Address Checkbox */}
              <TouchableOpacity
                style={styles.defaultToggleRow}
                activeOpacity={0.8}
                onPress={() => setFormIsDefault(!formIsDefault)}
              >
                {formIsDefault ? (
                  <Icons.CheckSquare color="#F4C400" size={20} />
                ) : (
                  <Icons.Square color={colors.textSecondary} size={20} />
                )}
                <Text style={[styles.defaultToggleText, { color: colors.text }]}>Make this my default address</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.saveAddressBtn, submitting && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={handleSaveAddress}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.saveAddressBtnText}>
                    {editingAddressId ? 'Update Address' : 'Save Address'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerBackButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4C400',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#F4C400',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4C400',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressCountBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  defaultCardBorder: {
    borderColor: '#F4C400',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelIconPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  radioSelector: {
    padding: 2,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  recipientPhone: {
    fontSize: 13,
    marginBottom: 8,
  },
  addressBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    marginBottom: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteActionBtn: {
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  labelSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  labelChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  labelChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  defaultToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveAddressBtn: {
    backgroundColor: '#F4C400',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveAddressBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});

