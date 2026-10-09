import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import * as Icons from 'lucide-react-native';
import GlassCard from '../../components/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface SavedCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cardType: 'visa' | 'mastercard' | 'rupay';
  cardColor: 'gold' | 'diamond' | 'silver';
  isDefault: boolean;
}

const SAVED_CARDS_KEY = 'connect_saved_user_cards';
const SAVED_UPI_KEY = 'connect_saved_user_upi';
const CUSTOM_UPI_KEY = 'connect_custom_upi_id';

export default function PaymentSettings() {
  const navigation = useNavigation<any>();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const insets = useSafeAreaInsets();

  const currentUser = useAuthStore((state) => state.currentUser);
  const showToast = useToastStore((state) => state.showToast);

  // Cards & UPI state (starts empty by default, loaded from customer's storage)
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedUPI, setSelectedUPI] = useState('gpay');
  const [customUPI, setCustomUPI] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [customUpiInput, setCustomUpiInput] = useState('');

  // Form States for Add Card
  const [formNumber, setFormNumber] = useState('');
  const [formHolder, setFormHolder] = useState(currentUser?.name || '');
  const [formExpiry, setFormExpiry] = useState('');
  const [formCvv, setFormCvv] = useState('');
  const [formType, setFormType] = useState<'visa' | 'mastercard' | 'rupay'>('visa');
  const [formColor, setFormColor] = useState<'gold' | 'diamond' | 'silver'>('gold');

  // Modal theme colors for guaranteed high contrast in both themes
  const modalBg = isLight ? '#FFFFFF' : '#0B132B';
  const modalBorder = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)';
  const modalTitleColor = isLight ? '#0F172A' : '#FFFFFF';
  const modalLabelColor = isLight ? '#334155' : '#F8FAFC';
  const inputBg = isLight ? '#F8FAFC' : '#16223B';
  const inputBorder = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.2)';
  const inputTextColor = isLight ? '#0F172A' : '#FFFFFF';
  const inputPlaceholderColor = '#94A3B8';
  const selectorInactiveBg = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)';
  const selectorInactiveBorder = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.25)';
  const selectorInactiveText = isLight ? '#475569' : '#F1F5F9';
  const closeBtnBg = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.12)';
  const closeBtnIcon = isLight ? '#0F172A' : '#FFFFFF';

  // Load Customer's saved cards & UPI settings from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const storedCards = await AsyncStorage.getItem(SAVED_CARDS_KEY);
        if (storedCards) {
          const parsed = JSON.parse(storedCards);
          if (Array.isArray(parsed)) {
            setCards(parsed);
          }
        }

        const storedUPI = await AsyncStorage.getItem(SAVED_UPI_KEY);
        if (storedUPI) setSelectedUPI(storedUPI);

        const storedCustomUPI = await AsyncStorage.getItem(CUSTOM_UPI_KEY);
        if (storedCustomUPI) setCustomUPI(storedCustomUPI);
      } catch (err) {
        console.warn('Failed to load saved payment settings:', err);
      }
    })();
  }, []);

  // Save Cards to Storage helper
  const persistCards = async (newCards: SavedCard[]) => {
    setCards(newCards);
    try {
      await AsyncStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(newCards));
    } catch (err) {
      console.warn('Failed to persist cards:', err);
    }
  };

  // Set Default Primary Card
  const handleSetDefaultCard = (id: string) => {
    const updated = cards.map((c) => ({
      ...c,
      isDefault: c.id === id,
    }));
    persistCards(updated);
    showToast('Primary payment card updated');
  };

  // Delete Card
  const handleDeleteCard = (id: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to remove this card from your saved payment methods?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const filtered = cards.filter((c) => c.id !== id);
            // If deleted card was default and remaining cards exist, make first remaining card default
            if (filtered.length > 0 && !filtered.some((c) => c.isDefault)) {
              filtered[0].isDefault = true;
            }
            persistCards(filtered);
            showToast('Card removed');
          },
        },
      ]
    );
  };

  // Live Card Number Formatter (adds spaces every 4 digits)
  const handleCardNumberChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '').slice(0, 16);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += digits[i];
    }
    setFormNumber(formatted);

    // Auto detect card type
    if (digits.startsWith('4')) setFormType('visa');
    else if (digits.startsWith('5')) setFormType('mastercard');
    else if (digits.startsWith('6')) setFormType('rupay');
  };

  // Live Expiry Date Formatter (MM/YY)
  const handleExpiryChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setFormExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setFormExpiry(digits);
    }
  };

  // Open Modal with prefilled customer name
  const handleOpenAddCardModal = () => {
    setFormHolder(currentUser?.name || '');
    setFormNumber('');
    setFormExpiry('');
    setFormCvv('');
    setFormType('visa');
    setFormColor('gold');
    setIsModalOpen(true);
  };

  // Add Card Form Submission
  const handleAddCard = () => {
    const cleanNumber = formNumber.replace(/\s+/g, '');
    const cleanHolder = formHolder.trim();
    const cleanExpiry = formExpiry.trim();

    if (!cleanHolder || cleanHolder.length < 2) {
      Alert.alert('Validation Error', 'Please enter a valid cardholder name (at least 2 letters).');
      return;
    }
    if (cleanNumber.length < 15) {
      Alert.alert('Validation Error', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cleanExpiry)) {
      Alert.alert('Validation Error', 'Please enter a valid expiry date in MM/YY format (e.g. 12/28).');
      return;
    }

    const obfuscated = `•••• •••• •••• ${cleanNumber.substring(cleanNumber.length - 4)}`;
    const newCard: SavedCard = {
      id: `card_${Date.now()}`,
      cardNumber: obfuscated,
      cardHolder: cleanHolder.toUpperCase(),
      expiry: cleanExpiry,
      cardType: formType,
      cardColor: formColor,
      isDefault: cards.length === 0,
    };

    const updated = [...cards, newCard];
    persistCards(updated);
    setIsModalOpen(false);
    showToast('Card saved successfully!');
  };

  // Select UPI Network
  const handleSelectUPI = (id: string) => {
    setSelectedUPI(id);
    AsyncStorage.setItem(SAVED_UPI_KEY, id).catch(() => {});
  };

  // Save Custom UPI ID
  const handleSaveCustomUPI = () => {
    const cleanUpi = customUpiInput.trim().toLowerCase();
    if (!cleanUpi || !cleanUpi.includes('@') || cleanUpi.length < 5) {
      Alert.alert('Validation Error', 'Please enter a valid UPI ID (e.g. yourname@upi or mobile@bank).');
      return;
    }
    setCustomUPI(cleanUpi);
    setSelectedUPI('custom');
    AsyncStorage.setItem(CUSTOM_UPI_KEY, cleanUpi).catch(() => {});
    AsyncStorage.setItem(SAVED_UPI_KEY, 'custom').catch(() => {});
    setIsUpiModalOpen(false);
    showToast('Custom UPI ID saved!');
  };

  const getCardGradient = (cardColor: string) => {
    switch (cardColor) {
      case 'diamond':
        return (
          <LinearGradient id="diamondCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1E3A8A" />
            <Stop offset="50%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
        );
      case 'silver':
        return (
          <LinearGradient id="silverCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#475569" />
            <Stop offset="50%" stopColor="#94A3B8" />
            <Stop offset="100%" stopColor="#334155" />
          </LinearGradient>
        );
      case 'gold':
      default:
        return (
          <LinearGradient id="goldCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#B8860B" />
            <Stop offset="50%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#8B6508" />
          </LinearGradient>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
        translucent={false}
      />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.ChevronLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Settings</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage your saved cards and payment accounts</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={handleOpenAddCardModal}>
          <Icons.Plus color="#0F172A" size={14} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>+ Add Card</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Credit / Debit Cards section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CREDIT & DEBIT CARDS</Text>
          <Text style={[styles.cardCountText, { color: colors.textSecondary }]}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} saved
          </Text>
        </View>

        {cards.length === 0 ? (
          /* Empty State when no cards exist yet */
          <GlassCard style={[styles.emptyCardsCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: colors.border }]}>
            <View style={[styles.emptyCardIconCircle, { backgroundColor: isLight ? '#FEFCE8' : 'rgba(245, 184, 0, 0.15)' }]}>
              <Icons.CreditCard color="#F5B800" size={32} />
            </View>
            <Text style={[styles.emptyCardsTitle, { color: colors.text }]}>No Saved Cards</Text>
            <Text style={[styles.emptyCardsSubtitle, { color: colors.textSecondary }]}>
              Add your personal credit or debit card for fast, secure 1-tap checkout.
            </Text>
            <TouchableOpacity
              style={styles.addFirstCardBtn}
              activeOpacity={0.85}
              onPress={handleOpenAddCardModal}
            >
              <Icons.Plus color="#0F172A" size={16} style={{ marginRight: 6 }} />
              <Text style={styles.addFirstCardBtnText}>Add New Card</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          /* Saved Cards List */
          cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.95}
              onPress={() => handleSetDefaultCard(card.id)}
              style={styles.cardContainer}
            >
              {/* Native Card Background */}
              <View style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%">
                  <Defs>{getCardGradient(card.cardColor)}</Defs>
                  <Rect width="100%" height="100%" rx="16" fill={`url(#${card.cardColor}Card)`} />
                </Svg>
              </View>

              {/* Default Status Badge */}
              {card.isDefault && (
                <View style={styles.cardDefaultBadge}>
                  <Icons.CheckCircle2 color="#050B1E" size={10} style={{ marginRight: 4 }} />
                  <Text style={styles.cardDefaultText}>Primary Mode</Text>
                </View>
              )}

              {/* Card Content Overlay */}
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardBrandName}>Connect Club</Text>
                  <Text style={styles.cardTypeName}>{card.cardType.toUpperCase()}</Text>
                </View>

                <Text style={styles.cardNumberText}>{card.cardNumber}</Text>

                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.cardLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardValue}>{card.cardHolder}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardLabel}>EXPIRES</Text>
                    <Text style={styles.cardValue}>{card.expiry}</Text>
                  </View>
                </View>
              </View>

              {/* Delete button positioned top-right */}
              <TouchableOpacity
                style={styles.deleteCardBtn}
                onPress={() => handleDeleteCard(card.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icons.Trash2 color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {/* UPI Payments section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UPI NETWORKS</Text>
          <TouchableOpacity onPress={() => setIsUpiModalOpen(true)}>
            <Text style={[styles.addCustomUpiText, { color: isLight ? '#0F172A' : '#F5B800' }]}>+ Add Custom UPI ID</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={[styles.paymentSelectorCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: colors.border }]}>
          {[
            { id: 'gpay', name: 'Google Pay', icon: 'Coins' },
            { id: 'phonepe', name: 'PhonePe', icon: 'Smartphone' },
            { id: 'paytm', name: 'Paytm Wallet / UPI', icon: 'Wallet' },
            ...(customUPI ? [{ id: 'custom', name: `Custom UPI (${customUPI})`, icon: 'QrCode' }] : []),
          ].map((upi) => (
            <TouchableOpacity
              key={upi.id}
              style={[styles.upiRow, { borderColor: colors.border }]}
              onPress={() => handleSelectUPI(upi.id)}
            >
              <View style={styles.upiLeft}>
                <View style={[styles.upiIconBox, { backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.15)' }]}>
                  <Icons.CreditCard color="#F5B800" size={16} />
                </View>
                <Text style={[styles.upiName, { color: colors.text }]}>{upi.name}</Text>
              </View>
              <View style={[styles.selectorCircle, selectedUPI === upi.id && { backgroundColor: '#F5B800', borderColor: '#F5B800' }]}>
                {selectedUPI === upi.id && <Icons.Check color="#0F172A" size={11} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Info Box */}
        <GlassCard style={[styles.safetyInfoBox, { backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.08)', borderColor: isLight ? '#FEF08A' : 'rgba(245, 184, 0, 0.2)' }]}>
          <Icons.ShieldCheck color="#F5B800" size={20} />
          <Text style={[styles.safetyText, { color: colors.text }]}>
            All payment details are encrypted end-to-end using PCI-DSS bank-grade protocols. Your security is 100% guaranteed.
          </Text>
        </GlassCard>
      </ScrollView>

      {/* Add Card Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: modalBg, borderColor: modalBorder }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: modalTitleColor }]}>Add New Card</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: closeBtnBg }]}
                onPress={() => setIsModalOpen(false)}
              >
                <Icons.X color={closeBtnIcon} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Card Provider */}
              <Text style={[styles.inputLabel, { color: modalLabelColor }]}>Card Network</Text>
              <View style={styles.labelButtonRow}>
                {['visa', 'mastercard', 'rupay'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.labelSelectorBtn,
                      { borderColor: selectorInactiveBorder, backgroundColor: selectorInactiveBg },
                      formType === t && { backgroundColor: '#F5B800', borderColor: '#F5B800' },
                    ]}
                    onPress={() => setFormType(t as any)}
                  >
                    <Text
                      style={[
                        styles.labelSelectorText,
                        { color: selectorInactiveText },
                        formType === t && { color: '#0F172A', fontWeight: 'bold' },
                      ]}
                    >
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Card Theme Color */}
              <Text style={[styles.inputLabel, { color: modalLabelColor }]}>Card Style Theme</Text>
              <View style={styles.labelButtonRow}>
                {['gold', 'diamond', 'silver'].map((col) => (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.labelSelectorBtn,
                      { borderColor: selectorInactiveBorder, backgroundColor: selectorInactiveBg },
                      formColor === col && { backgroundColor: '#F5B800', borderColor: '#F5B800' },
                    ]}
                    onPress={() => setFormColor(col as any)}
                  >
                    <Text
                      style={[
                        styles.labelSelectorText,
                        { color: selectorInactiveText },
                        formColor === col && { color: '#0F172A', fontWeight: 'bold' },
                      ]}
                    >
                      {col.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Card Holder Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: modalLabelColor }]}>Cardholder Name *</Text>
                <TextInput
                  style={[styles.textInput, { color: inputTextColor, borderColor: inputBorder, backgroundColor: inputBg }]}
                  placeholder="Enter name on card"
                  placeholderTextColor={inputPlaceholderColor}
                  value={formHolder}
                  onChangeText={(val) => setFormHolder(val.replace(/[^a-zA-Z\s'.]/g, ''))}
                />
              </View>

              {/* Card Number */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: modalLabelColor }]}>16-Digit Card Number *</Text>
                <TextInput
                  style={[styles.textInput, { color: inputTextColor, borderColor: inputBorder, backgroundColor: inputBg }]}
                  placeholder="4000 1234 5678 9010"
                  placeholderTextColor={inputPlaceholderColor}
                  keyboardType="numeric"
                  maxLength={19}
                  value={formNumber}
                  onChangeText={handleCardNumberChange}
                />
              </View>

              {/* Expiry & CVV Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: modalLabelColor }]}>Expiry (MM/YY) *</Text>
                  <TextInput
                    style={[styles.textInput, { color: inputTextColor, borderColor: inputBorder, backgroundColor: inputBg }]}
                    placeholder="12/28"
                    placeholderTextColor={inputPlaceholderColor}
                    keyboardType="numeric"
                    maxLength={5}
                    value={formExpiry}
                    onChangeText={handleExpiryChange}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: modalLabelColor }]}>CVV Code</Text>
                  <TextInput
                    style={[styles.textInput, { color: inputTextColor, borderColor: inputBorder, backgroundColor: inputBg }]}
                    placeholder="123"
                    placeholderTextColor={inputPlaceholderColor}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={formCvv}
                    onChangeText={setFormCvv}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleAddCard}>
                <Text style={styles.submitBtnText}>Save Card securely →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Custom UPI Modal */}
      <Modal
        visible={isUpiModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsUpiModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: modalBg, borderColor: modalBorder }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: modalTitleColor }]}>Add Custom UPI ID</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: closeBtnBg }]}
                onPress={() => setIsUpiModalOpen(false)}
              >
                <Icons.X color={closeBtnIcon} size={18} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14, paddingTop: 10 }}>
              <Text style={[styles.inputLabel, { color: modalLabelColor }]}>Enter your VPA / UPI ID</Text>
              <TextInput
                style={[styles.textInput, { color: inputTextColor, borderColor: inputBorder, backgroundColor: inputBg }]}
                placeholder="e.g. yourname@upi or mobile@bank"
                placeholderTextColor={inputPlaceholderColor}
                autoCapitalize="none"
                value={customUpiInput}
                onChangeText={setCustomUpiInput}
              />
              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleSaveCustomUPI}>
                <Text style={styles.submitBtnText}>Save UPI ID →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F5B800',
  },
  addBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  cardCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addCustomUpiText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyCardsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyCardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCardsTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyCardsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  addFirstCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  addFirstCardBtnText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '900',
  },
  cardContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrandName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.9,
  },
  cardTypeName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cardNumberText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginVertical: 14,
    opacity: 0.95,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#FFF',
    fontSize: 8,
    opacity: 0.6,
    letterSpacing: 1,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardDefaultBadge: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  cardDefaultText: {
    color: '#050B1E',
    fontSize: 9,
    fontWeight: 'bold',
  },
  deleteCardBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  paymentSelectorCard: {
    padding: 6,
    borderRadius: 16,
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  upiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelSelectorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  labelSelectorText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  submitBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13.5,
  },
});
