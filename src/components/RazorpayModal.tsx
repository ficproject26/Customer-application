import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { RAZORPAY_KEY_ID } from '../services/env';

export interface RazorpayOrderDetails {
  orderId: string;
  amount: number; // in paise (e.g. 59900 = ₹599)
  currency: string;
  keyId: string;
  planType: 'silver' | 'gold' | 'diamond' | string;
  planName: string;
  priceText: string;
}

interface RazorpayModalProps {
  visible: boolean;
  orderData: RazorpayOrderDetails | null;
  userInfo: {
    name: string;
    email: string;
    phone: string;
  };
  merchantName?: string;
  onSuccess: (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onCancel: () => void;
}

export default function RazorpayModal({
  visible,
  orderData,
  userInfo,
  merchantName,
  onSuccess,
  onCancel,
}: RazorpayModalProps) {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);

  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!orderData) return null;

  const keyId = orderData.keyId || RAZORPAY_KEY_ID || 'rzp_test_THLM17MgXLM2tP';
  const displayAmount = orderData.priceText || `₹${(orderData.amount / 100).toLocaleString('en-IN')}`;
  const merchant = merchantName || 'Connect Mobile';

  const handlePayNow = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const randomId = Math.random().toString(36).substring(2, 12).toUpperCase();
      const paymentId = `pay_${randomId}`;
      const orderId = orderData.orderId || `order_${randomId}`;
      const signature = `rzp_sig_${randomId}`;

      onSuccess({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      });
    }, 1200);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0B132B' : '#F4F6F9' }]}>
        {/* Top Header Bar */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1C2541' : '#0A2540' }]}>
          <View style={styles.headerLeft}>
            <View style={styles.razorpayIconSquare}>
              <View style={styles.blueBar} />
              <View style={styles.cyanBar} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Razorpay Checkout</Text>
              <View style={styles.badgeRow}>
                <View style={styles.testBadge}>
                  <Text style={styles.testBadgeText}>TEST MODE</Text>
                </View>
                <Text style={styles.headerSubtitle}>Key: {keyId.substring(0, 14)}...</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.X color="#FFFFFF" size={22} />
          </TouchableOpacity>
        </View>

        {/* Merchant & Amount Banner */}
        <View style={[styles.banner, { backgroundColor: isDark ? '#1C2541' : '#FFFFFF' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.merchantName, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{merchant}</Text>
            <Text style={[styles.orderDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>{orderData.planName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amountLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Amount to Pay</Text>
            <Text style={styles.amountValue}>{displayAmount}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Payment Method Selector */}
          <Text style={[styles.sectionTitle, { color: isDark ? '#CBD5E1' : '#475569' }]}>SELECT PAYMENT METHOD</Text>

          {/* UPI Option */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: isDark ? '#1C2541' : '#FFFFFF' },
              selectedMethod === 'upi' && styles.selectedMethodCard,
            ]}
            onPress={() => setSelectedMethod('upi')}
          >
            <View style={styles.methodHeader}>
              <Icons.Smartphone color={selectedMethod === 'upi' ? '#0654F6' : (isDark ? '#94A3B8' : '#64748B')} size={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>UPI / QR (Google Pay, PhonePe, Paytm)</Text>
                <Text style={styles.methodSub}>Pay instantly using any UPI app</Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'upi' && styles.radioSelected]} />
            </View>

            {selectedMethod === 'upi' && (
              <View style={styles.methodDetailContainer}>
                <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>Enter VPA / UPI ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="username@upi"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                <Text style={styles.tipText}>💡 In test mode, use <Text style={{ fontWeight: '700' }}>success@razorpay</Text> for instant success.</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Card Option */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: isDark ? '#1C2541' : '#FFFFFF' },
              selectedMethod === 'card' && styles.selectedMethodCard,
            ]}
            onPress={() => setSelectedMethod('card')}
          >
            <View style={styles.methodHeader}>
              <Icons.CreditCard color={selectedMethod === 'card' ? '#0654F6' : (isDark ? '#94A3B8' : '#64748B')} size={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Credit / Debit Card</Text>
                <Text style={styles.methodSub}>Visa, Mastercard, RuPay, Maestro</Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'card' && styles.radioSelected]} />
            </View>

            {selectedMethod === 'card' && (
              <View style={styles.methodDetailContainer}>
                <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>Card Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                  placeholder="4111 1111 1111 1111"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>Expiry (MM/YY)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholder="12/28"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>CVV</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      keyboardType="numeric"
                      secureTextEntry
                      placeholder="123"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Netbanking Option */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: isDark ? '#1C2541' : '#FFFFFF' },
              selectedMethod === 'netbanking' && styles.selectedMethodCard,
            ]}
            onPress={() => setSelectedMethod('netbanking')}
          >
            <View style={styles.methodHeader}>
              <Icons.Building2 color={selectedMethod === 'netbanking' ? '#0654F6' : (isDark ? '#94A3B8' : '#64748B')} size={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Netbanking</Text>
                <Text style={styles.methodSub}>All major Indian banks supported</Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'netbanking' && styles.radioSelected]} />
            </View>

            {selectedMethod === 'netbanking' && (
              <View style={styles.methodDetailContainer}>
                <Text style={[styles.inputLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>Popular Banks</Text>
                <View style={styles.bankGrid}>
                  {['HDFC', 'ICICI', 'SBI', 'AXIS'].map((bank) => (
                    <TouchableOpacity
                      key={bank}
                      style={[
                        styles.bankChip,
                        { backgroundColor: isDark ? '#0B132B' : '#F8FAFC' },
                        selectedBank === bank && styles.selectedBankChip,
                      ]}
                      onPress={() => setSelectedBank(bank)}
                    >
                      <Text style={[styles.bankChipText, { color: isDark ? '#F8FAFC' : '#0F172A' }, selectedBank === bank && { color: '#0654F6', fontWeight: '800' }]}>{bank}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Wallets Option */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: isDark ? '#1C2541' : '#FFFFFF' },
              selectedMethod === 'wallet' && styles.selectedMethodCard,
            ]}
            onPress={() => setSelectedMethod('wallet')}
          >
            <View style={styles.methodHeader}>
              <Icons.Wallet color={selectedMethod === 'wallet' ? '#0654F6' : (isDark ? '#94A3B8' : '#64748B')} size={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Wallets</Text>
                <Text style={styles.methodSub}>Mobikwik, Freecharge, Airtel Money</Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'wallet' && styles.radioSelected]} />
            </View>
          </TouchableOpacity>

          {/* Security Assurance */}
          <View style={styles.securityBox}>
            <Icons.ShieldCheck color="#10B981" size={18} />
            <Text style={styles.securityText}>Secured by Razorpay 256-bit SSL Encryption</Text>
          </View>
        </ScrollView>

        {/* Bottom Pay Button Footer */}
        <View style={[styles.footer, { backgroundColor: isDark ? '#1C2541' : '#FFFFFF', borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <TouchableOpacity
            style={[styles.payButton, isProcessing && { opacity: 0.8 }]}
            onPress={handlePayNow}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icons.Lock color="#FFFFFF" size={18} />
                <Text style={styles.payButtonText}>PAY {displayAmount}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  razorpayIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  blueBar: {
    width: 7,
    height: 22,
    backgroundColor: '#0654F6',
    borderRadius: 2,
    transform: [{ skewX: '-15deg' }],
  },
  cyanBar: {
    width: 7,
    height: 22,
    backgroundColor: '#00D4FF',
    borderRadius: 2,
    transform: [{ skewX: '-15deg' }],
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  testBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  testBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '800',
  },
  orderDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0654F6',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  methodCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedMethodCard: {
    borderColor: '#0654F6',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  radioSelected: {
    borderColor: '#0654F6',
    backgroundColor: '#0654F6',
  },
  methodDetailContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tipText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  bankGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bankChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedBankChip: {
    borderColor: '#0654F6',
    backgroundColor: 'rgba(6, 84, 246, 0.08)',
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  payButton: {
    height: 52,
    backgroundColor: '#0654F6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0654F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

