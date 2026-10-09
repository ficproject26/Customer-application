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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { prepareRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpayService';
import { apiFetch } from '../../services/api';

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'payment' | 'cashback' | 'refund';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Failed';
  referenceId: string;
}

export interface LinkedCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cardType: 'visa' | 'mastercard' | 'rupay';
  cardColor: 'gold' | 'diamond' | 'silver';
  isDefault: boolean;
}

const SAVED_CARDS_KEY = 'connect_saved_user_cards';
const WALLET_TX_KEY = 'connect_wallet_transactions_history';


export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const currentUser = useAuthStore((state) => state.currentUser);
  const addWalletBalance = useAuthStore((state) => state.addWalletBalance);
  const isGuest = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
  const walletBalance = currentUser?.walletBalance ?? 0;
  const showToast = useToastStore((state) => state.showToast);

  const cardsKey = isGuest ? 'connect_guest_saved_cards' : `connect_saved_cards_${currentUser?.id || 'registered'}`;
  const txKey = isGuest ? 'connect_guest_wallet_tx' : `connect_wallet_tx_${currentUser?.id || 'registered'}`;
  const upiKey = isGuest ? 'connect_guest_wallet_upis' : `connect_wallet_upis_${currentUser?.id || 'registered'}`;

  // Quick Add Money State
  const [topUpAmountInput, setTopUpAmountInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  // Cards & UPI State
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [linkedUPIs, setLinkedUPIs] = useState<string[]>([]);

  // Transaction History & Search
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTxTab, setActiveTxTab] = useState<'all' | 'topup' | 'payment' | 'cashback'>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // Modals
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddUpiModalOpen, setIsAddUpiModalOpen] = useState(false);
  const [newUpiInput, setNewUpiInput] = useState('');

  // Form States for Add Card
  const [formNumber, setFormNumber] = useState('');
  const [formHolder, setFormHolder] = useState(isGuest ? 'Guest User' : (currentUser?.name || 'Connect Member'));
  const [formExpiry, setFormExpiry] = useState('');
  const [formCvv, setFormCvv] = useState('');
  const [formType, setFormType] = useState<'visa' | 'mastercard' | 'rupay'>('visa');
  const [formColor, setFormColor] = useState<'gold' | 'diamond' | 'silver'>('gold');

  // Razorpay Checkout Modal
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);

  // Load Saved Cards & Transactions & UPIs
  useEffect(() => {
    (async () => {
      try {
        if (isGuest) {
          setFormHolder('Guest User');
        } else {
          setFormHolder(currentUser?.name || 'Connect Member');
        }
        const storedCards = await AsyncStorage.getItem(cardsKey);
        setLinkedCards(storedCards ? JSON.parse(storedCards) : []);
        const storedTx = await AsyncStorage.getItem(txKey);
        setTransactions(storedTx ? JSON.parse(storedTx) : []);
        const storedUPIs = await AsyncStorage.getItem(upiKey);
        setLinkedUPIs(storedUPIs ? JSON.parse(storedUPIs) : []);

        // Sync live wallet data from backend
        const custId = currentUser?.customerId || currentUser?.id || '';
        const params = new URLSearchParams();
        if (custId) params.append('customerId', custId);
        if (currentUser?.id) params.append('userId', currentUser.id);
        if (currentUser?.email) params.append('email', currentUser.email);
        if (currentUser?.phone) params.append('phone', currentUser.phone);
        const query = params.toString() ? `?${params.toString()}` : '';

        apiFetch(`/wallet/balance${query}`).then((balRes: any) => {
          if (balRes?.success && typeof balRes.walletBalance === 'number') {
            useAuthStore.setState((s) =>
              s.currentUser ? { currentUser: { ...s.currentUser, walletBalance: balRes.walletBalance } } : s
            );
          }
        }).catch(() => {});

        apiFetch(`/wallet/transactions${query}`).then((txnRes: any) => {
          if (txnRes?.success && Array.isArray(txnRes.transactions) && txnRes.transactions.length > 0) {
            const mapped: WalletTransaction[] = txnRes.transactions.map((t: any) => ({
              id: t._id || t.id || `tx_${Date.now()}`,
              type: t.type === 'CREDIT' || (t.amount && t.amount > 0) ? 'topup' : 'payment',
              title: t.title || t.description || 'Wallet Transaction',
              subtitle: t.subtitle || t.category || (t.type === 'CREDIT' ? 'Added Money' : 'Payment'),
              amount: Math.abs(t.amount || 0),
              date: t.date || new Date().toISOString().split('T')[0],
              time: t.time || '12:00 PM',
              status: t.status || 'Completed',
              referenceId: t.referenceId || t.transactionId || 'TXN-0000',
            }));
            setTransactions(mapped);
          }
        }).catch(() => {});
      } catch (err) {
        console.warn('[WalletScreen] Failed to load cached data:', err);
      }
    })();
  }, [isGuest, cardsKey, txKey, upiKey, currentUser]);

  const handleSelectPreset = (amount: number) => {
    setSelectedPreset(amount);
    setTopUpAmountInput(amount.toString());
  };

  const handleAddMoney = () => {
    const amountNum = parseInt(topUpAmountInput.replace(/[^0-9]/g, ''), 10);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter or select a valid top-up amount (e.g., ₹500, ₹1,000).');
      return;
    }

    if (amountNum < 100) {
      Alert.alert('Minimum Top-up', 'Minimum wallet top-up amount is ₹100.');
      return;
    }

    // Synthesize Razorpay order for top up
    prepareRazorpayOrder({
      amount: amountNum,
      planType: 'wallet_topup',
      planName: `Wallet Top-Up (₹${amountNum.toLocaleString('en-IN')})`,
      priceText: `₹${amountNum.toLocaleString('en-IN')}`,
      userId: currentUser?.id || 'guest_user',
      onOrderReady: (ord) => {
        setRazorpayOrder(ord);
        setRazorpayModalVisible(true);
      },
    });
  };

  const handleRazorpaySuccess = async (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayModalVisible(false);
    const addedAmountInRs = razorpayOrder ? Math.round(razorpayOrder.amount / 100) : 1000;

    try {
      await verifyRazorpayPayment({
        ...paymentResult,
        planType: 'wallet_topup',
        userId: currentUser?.id || 'guest_user',
      });
    } catch {}

    // Update wallet balance in store
    addWalletBalance(addedAmountInRs);

    // Create new transaction record
    const now = new Date();
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      title: 'Wallet Top Up via Razorpay',
      subtitle: `Payment ID: ${paymentResult.razorpay_payment_id.slice(-8)}`,
      amount: addedAmountInRs,
      date: 'Just now',
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Completed',
      referenceId: paymentResult.razorpay_payment_id,
    };

    const updatedTxList = [newTx, ...transactions];
    setTransactions(updatedTxList);
    AsyncStorage.setItem(WALLET_TX_KEY, JSON.stringify(updatedTxList)).catch(() => {});

    setTopUpAmountInput('');
    setSelectedPreset(null);
    setRazorpayOrder(null);
    showToast(`🎉 ₹${addedAmountInRs.toLocaleString('en-IN')} added to Connect Wallet!`);
  };

  const handleSaveNewCard = async () => {
    if (!formNumber || formNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card Number', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (!formHolder.trim()) {
      Alert.alert('Cardholder Name Required', 'Please enter the name printed on the card.');
      return;
    }
    if (!formExpiry || !formExpiry.includes('/')) {
      Alert.alert('Invalid Expiry Date', 'Please enter expiry date in MM/YY format.');
      return;
    }

    const cleanNumber = formNumber.replace(/\s/g, '');
    const last4 = cleanNumber.slice(-4);
    const formattedCardNum = `•••• •••• •••• ${last4}`;

    const newCard: LinkedCard = {
      id: `card_${Date.now()}`,
      cardNumber: formattedCardNum,
      cardHolder: formHolder.trim(),
      expiry: formExpiry.trim(),
      cardType: formType,
      cardColor: formColor,
      isDefault: linkedCards.length === 0,
    };

    const updatedCards = [newCard, ...linkedCards];
    setLinkedCards(updatedCards);
    await AsyncStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(updatedCards));

    setIsAddCardModalOpen(false);
    setFormNumber('');
    setFormHolder(currentUser?.name || 'Connect Member');
    setFormExpiry('');
    setFormCvv('');
    showToast('New card linked successfully!');
  };

  const handleAddUpi = () => {
    if (!newUpiInput || !newUpiInput.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid VPA / UPI ID (e.g. name@okaxis).');
      return;
    }
    const clean = newUpiInput.trim().toLowerCase();
    if (linkedUPIs.includes(clean)) {
      Alert.alert('Already Linked', 'This UPI ID is already linked to your account.');
      return;
    }
    setLinkedUPIs([...linkedUPIs, clean]);
    setNewUpiInput('');
    setIsAddUpiModalOpen(false);
    showToast('UPI ID linked successfully!');
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTxTab !== 'all' && tx.type !== activeTxTab) return false;
    if (!txSearchQuery.trim()) return true;
    const q = txSearchQuery.toLowerCase();
    return (
      tx.title.toLowerCase().includes(q) ||
      tx.subtitle.toLowerCase().includes(q) ||
      tx.referenceId.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      
      {/* App Header Bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CustomerTabs', { screen: 'Home' });
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connect Wallet</Text>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() =>
            Alert.alert(
              'Connect Wallet Info ℹ️',
              'Connect Wallet allows 1-click instant payments for all products, grocery, food, stays, and services with zero transaction failures.'
            )
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.HelpCircle color={colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ================= WALLET CARD HUD ================= */}
        <View style={styles.cardSection}>
          <View style={styles.walletCardWrapper}>
            <Svg width="100%" height={180}>
              <Defs>
                {isDark ? (
                  <LinearGradient id="gradWallet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#1E293B" />
                    <Stop offset="50%" stopColor="#0F172A" />
                    <Stop offset="100%" stopColor="#020617" />
                  </LinearGradient>
                ) : (
                  <LinearGradient id="gradWallet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#92400E" />
                    <Stop offset="35%" stopColor="#D97706" />
                    <Stop offset="70%" stopColor="#B45309" />
                    <Stop offset="100%" stopColor="#78350F" />
                  </LinearGradient>
                )}
              </Defs>
              <Rect width="100%" height="100%" rx="20" ry="20" fill="url(#gradWallet)" />
            </Svg>

            <View style={styles.cardOverlayContent}>
              {/* Header */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.brandRow}>
                  <View style={styles.brandIconCircle}>
                    <Icons.Wallet color="#FFFFFF" size={14} />
                  </View>
                  <Text style={styles.brandText}>CONNECT WALLET</Text>
                </View>

                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              </View>

              {/* Balance Row */}
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                <Text style={styles.balanceValue}>
                  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Footer Meta Row */}
              <View style={styles.cardFooterRow}>
                <View>
                  <Text style={styles.cardMetaLabel}>ACCOUNT ID</Text>
                  <Text style={styles.cardMetaValue}>CN-WLT-98742</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Icons.Zap color="#FCD34D" size={12} />
                  <Text style={styles.pointsText}>
                    {Math.round(walletBalance * 0.1).toLocaleString('en-IN')} Points
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ================= ADD MONEY SECTION ================= */}
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Icons.PlusCircle color="#F5B800" size={18} />
            <Text style={[styles.sectionTitleText, { color: colors.text }]}>Add Money to Wallet</Text>
          </View>

          {/* Quick Presets */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SELECT QUICK AMOUNT</Text>
          <View style={styles.presetsRow}>
            {[500, 1000, 2000, 5000].map((amt) => {
              const isSelected = selectedPreset === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: isSelected ? '#F5B800' : isLight ? '#F1F5F9' : '#1E293B',
                      borderColor: isSelected ? '#D97706' : isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                  onPress={() => handleSelectPreset(amt)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: isSelected ? '#0F172A' : colors.text },
                    ]}
                  >
                    + ₹{amt.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount Input */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.currencyPrefix, { color: colors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="Enter custom top-up amount"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={topUpAmountInput}
              onChangeText={(val) => {
                setTopUpAmountInput(val);
                setSelectedPreset(null);
              }}
            />
            {topUpAmountInput ? (
              <TouchableOpacity
                onPress={() => {
                  setTopUpAmountInput('');
                  setSelectedPreset(null);
                }}
              >
                <Icons.XCircle color={colors.muted} size={18} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Action CTA Button */}
          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={handleAddMoney}
            activeOpacity={0.85}
          >
            <Icons.ShieldCheck color="#0F172A" size={18} />
            <Text style={styles.addMoneyBtnText}>Proceed to Add Money</Text>
          </TouchableOpacity>
        </View>

        {/* ================= LINKED CARDS & UPI ================= */}
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeaderRow}>
              <Icons.CreditCard color="#F5B800" size={18} />
              <Text style={[styles.sectionTitleText, { color: colors.text }]}>Linked Payment Methods</Text>
            </View>
            <TouchableOpacity
              style={styles.linkNewBtn}
              onPress={() => setIsAddCardModalOpen(true)}
              activeOpacity={0.8}
            >
              <Icons.Plus color="#D97706" size={14} />
              <Text style={styles.linkNewBtnText}>Link Card</Text>
            </TouchableOpacity>
          </View>

          {/* Cards List */}
          {linkedCards.length > 0 ? (
            <View style={styles.cardsList}>
              {linkedCards.map((card) => (
                <View
                  key={card.id}
                  style={[
                    styles.cardItemRow,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : '#0F172A',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                >
                  <View style={styles.cardItemIconCircle}>
                    <Icons.CreditCard color={colors.text} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardItemTitle, { color: colors.text }]}>{card.cardNumber}</Text>
                    <Text style={[styles.cardItemSub, { color: colors.textSecondary }]}>
                      {card.cardHolder} • Exp {card.expiry}
                    </Text>
                  </View>
                  {card.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>PRIMARY</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.emptyCardBox, { borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)' }]}
              onPress={() => setIsAddCardModalOpen(true)}
              activeOpacity={0.8}
            >
              <Icons.PlusCircle color="#F5B800" size={24} />
              <Text style={[styles.emptyCardText, { color: colors.text }]}>No Debit / Credit Cards Linked</Text>
              <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                Tap here to link your HDFC, ICICI, SBI or Axis card for 1-click top-up.
              </Text>
            </TouchableOpacity>
          )}

          {/* Linked UPI Section */}
          <View style={styles.upiHeaderRow}>
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>LINKED UPI HANDLES</Text>
            <TouchableOpacity onPress={() => setIsAddUpiModalOpen(true)}>
              <Text style={styles.addUpiText}>+ Link New UPI</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.upiChipsRow}>
            {linkedUPIs.map((upi) => (
              <View
                key={upi}
                style={[
                  styles.upiChip,
                  { backgroundColor: isLight ? '#FEFCE8' : '#1E293B', borderColor: isLight ? '#FDE68A' : '#854D0E' },
                ]}
              >
                <Icons.CheckCircle2 color="#D97706" size={13} />
                <Text style={[styles.upiChipText, { color: isLight ? '#854D0E' : '#F4C400' }]}>{upi}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ================= WALLET TRANSACTIONS ================= */}
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Icons.History color="#F5B800" size={18} />
            <Text style={[styles.sectionTitleText, { color: colors.text }]}>Wallet Activity & Statements</Text>
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.txFilterScroll}>
            {[
              { label: 'All Transactions', key: 'all' },
              { label: 'Money Added', key: 'topup' },
              { label: 'Payments', key: 'payment' },
              { label: 'Cashbacks', key: 'cashback' },
            ].map((tab) => {
              const isActive = activeTxTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.txFilterChip,
                    {
                      backgroundColor: isActive ? '#F5B800' : isLight ? '#F1F5F9' : '#1E293B',
                      borderColor: isActive ? '#D97706' : isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                  onPress={() => setActiveTxTab(tab.key as any)}
                >
                  <Text
                    style={[
                      styles.txFilterChipText,
                      { color: isActive ? '#0F172A' : colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Box */}
          <View style={[styles.txSearchBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)' }]}>
            <Icons.Search color={colors.muted} size={16} />
            <TextInput
              style={[styles.txSearchInput, { color: colors.text }]}
              placeholder="Search by order or reference ID..."
              placeholderTextColor={colors.muted}
              value={txSearchQuery}
              onChangeText={setTxSearchQuery}
            />
          </View>

          {/* Transactions List */}
          {filteredTransactions.length > 0 ? (
            <View style={styles.txList}>
              {filteredTransactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txItemRow,
                      { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)' },
                    ]}
                  >
                    <View
                      style={[
                        styles.txIconCircle,
                        {
                          backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        },
                      ]}
                    >
                      {isPositive ? (
                        <Icons.ArrowDownLeft color="#10B981" size={18} />
                      ) : (
                        <Icons.ArrowUpRight color="#EF4444" size={18} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={[styles.txSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {tx.subtitle}
                      </Text>
                      <Text style={[styles.txTimeText, { color: colors.muted }]}>
                        {tx.date} • {tx.time}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.txAmountText,
                          { color: isPositive ? '#10B981' : colors.text },
                        ]}
                      >
                        {isPositive ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.txStatusPill}>
                        <Text style={styles.txStatusText}>{tx.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyTxBox}>
              <Icons.FileText color={colors.muted} size={32} />
              <Text style={[styles.emptyTxTitle, { color: colors.text }]}>No transactions found</Text>
            </View>
          )}
        </View>

        {/* Security Badge Footer */}
        <View style={styles.securityFooter}>
          <Icons.ShieldCheck color="#10B981" size={18} />
          <Text style={[styles.securityFooterText, { color: colors.textSecondary }]}>
            256-Bit Encrypted • RBI Compliant Connect Pay Security
          </Text>
        </View>

      </ScrollView>

      {/* ================= MODAL: ADD LINKED CARD ================= */}
      <Modal
        visible={isAddCardModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddCardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isLight ? '#FFFFFF' : '#0B1530', borderColor: isLight ? '#FDE68A' : colors.cardBorder }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Link New Credit / Debit Card</Text>
              <TouchableOpacity onPress={() => setIsAddCardModalOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CARD NUMBER</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}
                placeholder="4532 8912 3456 4820"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                maxLength={19}
                value={formNumber}
                onChangeText={setFormNumber}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CARDHOLDER NAME</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}
                placeholder="Name as printed on card"
                placeholderTextColor={colors.muted}
                value={formHolder}
                onChangeText={setFormHolder}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EXPIRY (MM/YY)</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}
                    placeholder="12/28"
                    placeholderTextColor={colors.muted}
                    maxLength={5}
                    value={formExpiry}
                    onChangeText={setFormExpiry}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CVV SECURITY CODE</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}
                    placeholder="•••"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={formCvv}
                    onChangeText={setFormCvv}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CARD BRAND</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['visa', 'mastercard', 'rupay'] as const).map((type) => {
                  const isSel = formType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.brandChoiceBtn,
                        {
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F1F5F9' : '#1E293B',
                          borderColor: isSel ? '#D97706' : isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                        },
                      ]}
                      onPress={() => setFormType(type)}
                    >
                      <Text style={[styles.brandChoiceText, { color: isSel ? '#0F172A' : colors.text }]}>
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.saveCardBtn} onPress={handleSaveNewCard} activeOpacity={0.85}>
                <Text style={styles.saveCardBtnText}>Save & Link Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: ADD UPI ================= */}
      <Modal
        visible={isAddUpiModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddUpiModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isLight ? '#FFFFFF' : '#0B1530', borderColor: isLight ? '#FDE68A' : colors.cardBorder }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Link New UPI VPA ID</Text>
              <TouchableOpacity onPress={() => setIsAddUpiModalOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ENTER VIRTUAL PAYMENT ADDRESS (UPI ID)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}
              placeholder="e.g. mobile@upi or name@okicici"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              value={newUpiInput}
              onChangeText={setNewUpiInput}
            />

            <TouchableOpacity style={styles.saveCardBtn} onPress={handleAddUpi} activeOpacity={0.85}>
              <Text style={styles.saveCardBtnText}>Verify & Link UPI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Razorpay Top Up Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={razorpayOrder}
        userInfo={{
          name: currentUser?.name || 'Guest User',
          email: currentUser?.email || 'guest@connectapp.com',
          phone: currentUser?.phone || '',
        }}
        onSuccess={handleRazorpaySuccess}
        onCancel={() => {
          setRazorpayModalVisible(false);
          setRazorpayOrder(null);
        }}
      />
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
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingVertical: 14,
    paddingBottom: 40,
  },
  cardSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  walletCardWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardOverlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#34D399',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  balanceContainer: {
    marginVertical: 4,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardMetaLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
  },
  cardMetaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 1,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionBlock: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    backgroundColor: 'rgba(245, 184, 0, 0.05)',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addMoneyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  linkNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkNewBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  cardsList: {
    gap: 10,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardItemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 184, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardItemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  defaultPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#D97706',
  },
  emptyCardBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 6,
  },
  emptyCardText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyCardSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  upiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },
  addUpiText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
  },
  upiChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  upiChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  txFilterScroll: {
    gap: 8,
    marginBottom: 12,
  },
  txFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  txFilterChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  txSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  txSearchInput: {
    flex: 1,
    fontSize: 12,
  },
  txList: {
    gap: 10,
  },
  txItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  txSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  txTimeText: {
    fontSize: 10,
    marginTop: 2,
  },
  txAmountText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  txStatusPill: {
    marginTop: 2,
  },
  txStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyTxBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTxTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 10,
  },
  securityFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  brandChoiceText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  saveCardBtn: {
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveCardBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
