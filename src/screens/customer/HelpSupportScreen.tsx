import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const FAQ_ITEMS = [
  {
    id: 'faq_1',
    category: 'Orders & Deliveries',
    question: 'How do I track my live order or service booking?',
    answer: 'Navigate to the "Orders" tab at the bottom, select your active order or booking, and tap "Track Live" to view real-time delivery partner coordinates and progress milestones.',
  },
  {
    id: 'faq_2',
    category: 'Payments & Refunds',
    question: 'How long do refunds take after cancellation?',
    answer: 'Prepaid refunds are automatically processed within 15-30 minutes for UPI payments, and 2-5 business days for Credit/Debit cards directly to your original payment source.',
  },
  {
    id: 'faq_3',
    category: 'Membership Privileges',
    question: 'How do I access Airport Lounges with Diamond Club?',
    answer: 'Open the "Membership" tab to view your digital QR pass. Present this QR code at partner airport lounges and luxury dining outlets for instant complimentary entry.',
  },
  {
    id: 'faq_4',
    category: 'Service Booking & Rescheduling',
    question: 'Can I reschedule my home service technician visit?',
    answer: 'Yes, you can reschedule any upcoming service up to 2 hours before the scheduled slot directly from your Booking Details sheet.',
  },
];

export default function HelpSupportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const currentUser = useAuthStore((state) => state.currentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq_1');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      !searchQuery.trim() ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCallSupport = () => {
    Linking.openURL('tel:18002666328').catch(() => {
      Alert.alert('Phone Support', 'Toll-Free Hotline: 1800-266-6328 (Available 24/7)');
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@connectapp.com?subject=Connect%20Mobile%20Support%20Request').catch(() => {
      Alert.alert('Email Support', 'Email our 24/7 team at support@connectapp.com');
    });
  };

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketDesc.trim()) {
      Alert.alert('Required Fields', 'Please enter a brief subject and description of your issue.');
      return;
    }
    setTicketSubmitted(true);
    setTimeout(() => {
      Alert.alert(
        'Ticket Created 🎉',
        `Ticket #TKT-${Date.now().toString().slice(-6)} has been created. Our senior concierge team will reach out to you within 30 minutes.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setTicketSubject('');
              setTicketDesc('');
              setTicketSubmitted(false);
            },
          },
        ]
      );
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Contact Cards */}
        <View style={styles.quickContactRow}>
          <TouchableOpacity
            style={[
              styles.contactCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleCallSupport}
          >
            <View style={[styles.contactIconCircle, { backgroundColor: 'rgba(245, 184, 0, 0.15)' }]}>
              <Icons.PhoneCall color="#F5B800" size={20} />
            </View>
            <Text style={[styles.contactCardTitle, { color: colors.text }]}>Call Concierge</Text>
            <Text style={[styles.contactCardSub, { color: colors.subtext }]}>24/7 Toll-Free Line</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.contactCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleEmailSupport}
          >
            <View style={[styles.contactIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Icons.Mail color="#3B82F6" size={20} />
            </View>
            <Text style={[styles.contactCardTitle, { color: colors.text }]}>Email Support</Text>
            <Text style={[styles.contactCardSub, { color: colors.subtext }]}>support@connectapp.com</Text>
          </TouchableOpacity>
        </View>

        {/* Search FAQs */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <Icons.Search color={colors.subtext} size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search FAQs & Help Articles..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icons.X color={colors.subtext} size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Frequently Asked Questions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        <View
          style={[
            styles.faqCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          {filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <View key={faq.id}>
                {idx > 0 && (
                  <View
                    style={[
                      styles.faqDivider,
                      { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' },
                    ]}
                  />
                )}
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.faqCategory}>{faq.category.toUpperCase()}</Text>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                  </View>
                  <Icons.ChevronDown
                    color={isExpanded ? '#F5B800' : colors.subtext}
                    size={18}
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={[styles.faqAnswerText, { color: colors.subtext }]}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Create Support Ticket */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Raise a Support Ticket</Text>
        <View
          style={[
            styles.ticketCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.text }]}>ISSUE SUBJECT</Text>
          <TextInput
            style={[
              styles.inputField,
              {
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                color: colors.text,
              },
            ]}
            placeholder="e.g., Order #DN-9941 delivery status"
            placeholderTextColor={colors.subtext}
            value={ticketSubject}
            onChangeText={setTicketSubject}
          />

          <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 14 }]}>DESCRIPTION</Text>
          <TextInput
            style={[
              styles.inputField,
              {
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                color: colors.text,
                height: 90,
                textAlignVertical: 'top',
                paddingTop: 10,
              },
            ]}
            placeholder="Please provide details about your issue..."
            placeholderTextColor={colors.subtext}
            value={ticketDesc}
            onChangeText={setTicketDesc}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitTicketBtn, { opacity: ticketSubmitted ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleSubmitTicket}
            disabled={ticketSubmitted}
          >
            <Icons.Send color="#0F172A" size={16} style={{ marginRight: 6 }} />
            <Text style={styles.submitTicketText}>
              {ticketSubmitted ? 'Submitting...' : 'Submit Support Ticket'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  contactCardSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  faqCategory: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F5B800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  faqDivider: {
    height: 1,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  faqAnswerText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  ticketCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B800',
    borderRadius: 10,
    height: 44,
    marginTop: 16,
  },
  submitTicketText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
