import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { apiFetch } from '../../services/api';
import * as Icons from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAFT_STORAGE_KEY = 'connect_reg_draft';

type JoinNowScreenProp = StackNavigationProp<AuthStackParamList, 'JoinNow'>;

// Enterprise Password Strength Helper (Matching Website Standard)
function getPasswordStrength(pass: string): { label: string; color: string; percent: number; isValid: boolean; error: string } {
  if (!pass) return { label: '', color: 'transparent', percent: 0, isValid: false, error: 'Password is required.' };
  if (pass.length < 8) return { label: 'Weak', color: '#EF4444', percent: 25, isValid: false, error: 'Password must be at least 8 characters long.' };
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return {
      label: 'Medium',
      color: '#F59E0B',
      percent: 60,
      isValid: false,
      error: 'Password must contain uppercase, lowercase, number & special character.',
    };
  }

  return { label: 'Strong', color: '#10B981', percent: 100, isValid: true, error: '' };
}

export default function JoinNow() {
  const navigation = useNavigation<JoinNowScreenProp>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const showToast = useToastStore((state) => state.showToast);

  const register = useAuthStore((state) => state.register);

  // Exactly 2 Steps: 1 = Details, 2 = OTP Verification
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form Fields (Step 1)
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Delivery Address Fields (Step 1)
  const [house, setHouse] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // OTP Fields (Step 2)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const [resendTimer, setResendTimer] = useState(30);

  // UI State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Always clear stale draft on mount so registration fields are always clean & empty
  useEffect(() => {
    AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (currentStep === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep, resendTimer]);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  // Step 1 -> Step 2 Handler
  const handleProceedToOtp = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;

    if (!cleanName || !nameRegex.test(cleanName)) {
      setError('Please enter a valid full name (3-50 letters, alphabets and spaces only).');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10 || !phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    if (aadhaarNumber.trim() && !/^\d{12}$/.test(aadhaarNumber.trim())) {
      setError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) {
      setError('Enter a valid PAN number (e.g. ABCDE1234F).');
      return;
    }
    if (!strength.isValid) {
      setError(strength.error || 'Password must be at least 8 characters long with uppercase, lowercase, digit, and special char.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!house.trim() || !street.trim()) {
      setError('Please enter complete house/flat details and street/locality for delivery.');
      return;
    }
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setError('Please enter a valid 6-digit PIN code.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Backend check & send OTP via /auth/send-otp
      const otpRes: any = await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: {
          phone: cleanPhone,
          mobileNumber: cleanPhone,
          mobileOrEmail: cleanEmail || cleanPhone,
        },
      });

      setLoading(false);
      setCurrentStep(2);
      setResendTimer(otpRes?.cooldownSeconds || 30);
      const codePreview = otpRes?.devOtpPreview || otpRes?.otp;
      showToast(codePreview ? `OTP Sent! Dev Code: ${codePreview}` : `6-digit code sent to +91 ${cleanPhone.slice(-10)}`);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Unable to send verification code.');
    }
  };

  // OTP Input Changes
  const handleOtpChange = (text: string, index: number) => {
    const newDigits = [...otpDigits];
    newDigits[index] = text;
    setOtpDigits(newDigits);
    if (error) setError('');

    // Auto-advance to next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    const cleanEmail = email.trim().toLowerCase();
    setResendTimer(30);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const otpRes: any = await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: { phone: cleanPhone, mobileNumber: cleanPhone, mobileOrEmail: cleanEmail || cleanPhone },
      });
      const codePreview = otpRes?.devOtpPreview || otpRes?.otp;
      showToast(codePreview ? `OTP Resent! Dev Code: ${codePreview}` : 'New verification code sent!');
    } catch {
      showToast('New verification code sent!');
    }
  };

  // Step 2 -> Finalize Account Registration
  const handleVerifyAndRegister = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    try {
      // 1. Submit Registration to Deployed Backend API
      const regRes: any = await apiFetch('/auth/register-customer', {
        method: 'POST',
        body: {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          password: password,
          aadhaarNumber: aadhaarNumber.trim(),
          panNumber: panNumber.trim().toUpperCase(),
          address: `${house.trim()}${street.trim() ? ', ' + street.trim() : ''}`,
          city: city.trim() || 'Bengaluru',
          pincode: pincode.trim(),
        },
      });

      if (regRes && (regRes.error || regRes.status === 'error')) {
        setLoading(false);
        setError(regRes.message || 'Registration failed. Please check your details.');
        return;
      }

      // Clear draft
      AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});

      const registeredUser = regRes?.user || regRes?.data || null;
      if (registeredUser) {
        useAuthStore.setState({
          currentUser: {
            id: registeredUser.id || registeredUser._id || registeredUser.customerId || `cust_${cleanPhone}`,
            name: registeredUser.name || cleanName,
            email: registeredUser.email || cleanEmail,
            phone: registeredUser.phone || `+91 ${cleanPhone}`,
            role: 'customer',
            membership: registeredUser.membership,
            walletBalance: registeredUser.walletBalance || 0,
            emailVerified: true,
            phoneVerified: true,
            address: {
              address: `${house.trim()}, ${street.trim()}`,
              house: house.trim(),
              street: street.trim(),
              city: city.trim() || 'Bengaluru',
              state: state.trim() || 'Karnataka',
              pincode: pincode.trim() || '560034',
            },
          },
          isOnboarded: true,
        });
      } else {
        register(
          {
            name: cleanName,
            phone: `+91 ${cleanPhone.slice(-10)}`,
            email: cleanEmail,
            gender: (gender || 'Male') as any,
            address: {
              house: house.trim(),
              street: street.trim(),
              city: city.trim() || 'Bengaluru',
              state: state.trim() || 'Karnataka',
              pincode: pincode.trim() || '560034',
            },
          },
          'customer'
        );
      }

      setLoading(false);
      showToast(`Account created! Welcome, ${cleanName}! 🎉`);
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs' as any,
            params: { screen: 'Home' },
          },
        ],
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Registration network notice. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isLight ? '#FFF8E8' : '#050B1E' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isLight ? '#FFF8E8' : '#050B1E'} translucent={false} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 8, 16), paddingBottom: Math.max(insets.bottom + 20, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Brand Logo */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}
              onPress={() => {
                if (currentStep === 2) {
                  setCurrentStep(1);
                  setError('');
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Login');
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icons.ChevronLeft color={colors.text} size={20} />
            </TouchableOpacity>

            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/images/forge_india_logo.jpg')}
                  style={styles.logoBadgeImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>CONNECT</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* Stepper Indicator (Exactly 2 Steps) */}
          <View style={styles.stepperContainer}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                {currentStep > 1 ? (
                  <Icons.Check color="#0F172A" size={13} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepNumber, styles.stepNumberActive]}>1</Text>
                )}
              </View>
              <Text style={[styles.stepTitle, { color: currentStep === 1 ? colors.text : colors.textSecondary }]}>
                Details
              </Text>
            </View>

            {/* Connecting Line */}
            <View
              style={[
                styles.stepLine,
                { backgroundColor: currentStep === 2 ? '#F5B800' : (isLight ? '#E2E8F0' : '#334155') },
              ]}
            />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep === 2 && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, currentStep === 2 && styles.stepNumberActive]}>2</Text>
              </View>
              <Text style={[styles.stepTitle, { color: currentStep === 2 ? colors.text : colors.textSecondary }]}>
                OTP Verification
              </Text>
            </View>
          </View>

          {/* Headline */}
          <View style={styles.headlineBox}>
            <Text style={[styles.mainTitle, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
              {currentStep === 1 ? 'Create Account' : 'Verify Mobile Number'}
            </Text>
            <Text style={[styles.subTitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              {currentStep === 1
                ? 'Join Connect to access products, services & local jobs'
                : `Enter the 6-digit code sent to +91 ${phone.replace(/[^\d]/g, '').slice(-10)}`}
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Icons.AlertCircle color="#EF4444" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* STEP 1: Account Details */}
          {currentStep === 1 && (
            <View style={[styles.card, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#F1F5F9' : '#334155' }]}>
              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  FULL NAME *
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.User color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val.replace(/[^a-zA-Z\s'.]/g, ''));
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              {/* Gender */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  GENDER *
                </Text>
                <View style={styles.genderRow}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => {
                    const isSelected = gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderOptionBtn,
                          {
                            backgroundColor: isSelected
                              ? isLight
                                ? '#FEF3C7'
                                : 'rgba(245, 184, 0, 0.2)'
                              : isLight
                              ? '#F8FAFC'
                              : '#0F172A',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : '#334155',
                          },
                        ]}
                        onPress={() => {
                          setGender(g);
                          if (error) setError('');
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.genderOptionText,
                            {
                              color: isSelected
                                ? isLight
                                  ? '#78350F'
                                  : '#F5B800'
                                : isLight
                                ? '#475569'
                                : '#94A3B8',
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🧑 Other'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 10-Digit Mobile */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  10-DIGIT MOBILE NUMBER *
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Text style={[styles.phonePrefix, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>+91</Text>
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val.replace(/[^\d]/g, '').slice(0, 10));
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  EMAIL ADDRESS *
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.Mail color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="name@gmail.com"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val.trim());
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              {/* Aadhaar Number (Optional / UIDAI Standard) */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  AADHAAR NUMBER (12 DIGITS)
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.ShieldCheck color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="12-digit Aadhaar number"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    keyboardType="numeric"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChangeText={(val) => {
                      setAadhaarNumber(val.replace(/[^\d]/g, '').slice(0, 12));
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              {/* PAN Number (Optional / Tax Standard) */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  PAN NUMBER (e.g. ABCDE1234F)
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.CreditCard color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="ABCDE1234F"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    autoCapitalize="characters"
                    maxLength={10}
                    value={panNumber}
                    onChangeText={(val) => {
                      setPanNumber(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithBadgeRow}>
                  <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    PASSWORD *
                  </Text>
                  {strength.label ? (
                    <Text style={[styles.strengthBadge, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.KeyRound color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPassword ? (
                      <Icons.EyeOff color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                    ) : (
                      <Icons.Eye color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithBadgeRow}>
                  <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    CONFIRM PASSWORD *
                  </Text>
                  {confirmPassword ? (
                    passwordsMatch ? (
                      <Text style={[styles.strengthBadge, { color: '#10B981' }]}>Matched ✓</Text>
                    ) : (
                      <Text style={[styles.strengthBadge, { color: '#EF4444' }]}>Does not match</Text>
                    )
                  ) : null}
                </View>
                <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                  <Icons.Lock color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showConfirmPassword ? (
                      <Icons.EyeOff color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                    ) : (
                      <Icons.Eye color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delivery Address Section */}
              <View style={{ marginTop: 14, marginBottom: 6, borderTopWidth: 1, borderTopColor: isLight ? '#F1EAD8' : '#334155', paddingTop: 14 }}>
                <Text style={[styles.inputLabel, { color: isLight ? '#475569' : '#94A3B8', fontWeight: '800', marginBottom: 10 }]}>
                  📍 DEFAULT DELIVERY ADDRESS *
                </Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: isLight ? '#64748B' : '#94A3B8', fontSize: 11 }]}>
                    HOUSE / FLAT / BUILDING NO. *
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Icons.Home color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="e.g. Flat 402, Sunshine Residency"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={house}
                      onChangeText={(val) => {
                        setHouse(val);
                        if (error) setError('');
                      }}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: isLight ? '#64748B' : '#94A3B8', fontSize: 11 }]}>
                    STREET / LOCALITY / AREA *
                  </Text>
                  <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Icons.MapPin color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="e.g. 12th Main, Koramangala"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={street}
                      onChangeText={(val) => {
                        setStreet(val);
                        if (error) setError('');
                      }}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[{ flex: 1 }, styles.formGroup]}>
                    <Text style={[styles.inputLabel, { color: isLight ? '#64748B' : '#94A3B8', fontSize: 11 }]}>
                      CITY *
                    </Text>
                    <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                      <TextInput
                        style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                        placeholder="Bengaluru"
                        placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        value={city}
                        onChangeText={(val) => {
                          setCity(val);
                          if (error) setError('');
                        }}
                      />
                    </View>
                  </View>

                  <View style={[{ flex: 1 }, styles.formGroup]}>
                    <Text style={[styles.inputLabel, { color: isLight ? '#64748B' : '#94A3B8', fontSize: 11 }]}>
                      PINCODE *
                    </Text>
                    <View style={[styles.inputBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                      <TextInput
                        style={[styles.textInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                        placeholder="560034"
                        placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        keyboardType="numeric"
                        maxLength={6}
                        value={pincode}
                        onChangeText={(val) => {
                          setPincode(val.replace(/[^\d]/g, '').slice(0, 6));
                          if (error) setError('');
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && <Icons.Check color="#0F172A" size={12} strokeWidth={3} />}
                </View>
                <Text style={[styles.termsText, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                    Terms of Service
                  </Text>{' '}
                  &{' '}
                  <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Continue to Verification CTA */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleProceedToOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Continue to Verification →</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {currentStep === 2 && (
            <View style={[styles.card, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#F1F5F9' : '#334155' }]}>
              <View style={styles.shieldHeaderBox}>
                <View style={styles.shieldBadge}>
                  <Icons.ShieldCheck color="#F5B800" size={36} />
                </View>
                <Text style={[styles.otpBoxTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Enter 6-Digit Verification Code
                </Text>

                {/* Mobile Display with Edit Number Action */}
                <View style={styles.editNumberContainer}>
                  <Text style={[styles.mobileNumberDisplay, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    Sent to +91 {phone.replace(/[^\d]/g, '').slice(-10)}
                  </Text>
                  <TouchableOpacity
                    style={styles.editNumberBtn}
                    onPress={() => {
                      setCurrentStep(1);
                      setError('');
                    }}
                  >
                    <Icons.Pencil color="#0284C7" size={13} />
                    <Text style={styles.editNumberBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 6-Digit Individual Pin Inputs */}
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(r) => {
                      otpInputRefs.current[idx] = r;
                    }}
                    style={[
                      styles.otpSingleBox,
                      {
                        backgroundColor: isLight ? '#F8FAFC' : '#0F172A',
                        borderColor: digit ? '#F5B800' : (isLight ? '#CBD5E1' : '#334155'),
                        color: isLight ? '#0F172A' : '#FFFFFF',
                      },
                      digit ? styles.otpSingleBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text.slice(-1), idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend OTP Row */}
              <View style={styles.resendTimerRow}>
                {resendTimer > 0 ? (
                  <Text style={[styles.timerCountdownText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    Resend code in <Text style={{ fontWeight: 'bold', color: isLight ? '#0F172A' : '#FFFFFF' }}>{resendTimer}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={styles.resendCodeLink}>Resend Verification Code</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Verify & Create Account CTA */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleVerifyAndRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Verify & Create Account →</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Already have an account? Sign In Prompt */}
          <View style={styles.signInPromptRow}>
            <Text style={[styles.signInPromptText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInPromptLink}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Privacy Modal */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.termsCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
            <View style={styles.termsHeaderRow}>
              <Text style={[styles.termsTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Terms & Privacy Policy</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#0F172A' }]}
                onPress={() => setTermsModalVisible(false)}
              >
                <Icons.X color={isLight ? '#0F172A' : '#FFFFFF'} size={18} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.termsContent, { color: isLight ? '#475569' : '#94A3B8' }]}>
                Welcome to Forge India Connect.{'\n\n'}
                1. Account Guidelines: Your registered mobile and email are used for verified order notifications and security.{'\n\n'}
                2. Data Privacy: We never sell or share your personal information with unauthorized third parties.{'\n\n'}
                3. Order & Service Deliveries: Local merchant guarantees apply to all active deliveries.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => {
                setAgreeTerms(true);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styles.primaryActionBtnText}>I Agree & Accept</Text>
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5B800',
  },
  logoBadgeImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  stepCircleActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#0F172A',
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  headlineBox: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  formGroup: {
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOptionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionText: {
    fontSize: 12.5,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthBadge: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  phonePrefix: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginRight: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  termsText: {
    fontSize: 11.5,
    flex: 1,
  },
  termsLink: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  primaryActionBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Step 2 OTP Styles
  shieldHeaderBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 184, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  otpBoxTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  editNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  mobileNumberDisplay: {
    fontSize: 12.5,
  },
  editNumberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editNumberBtnText: {
    color: '#0284C7',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 6,
  },
  otpSingleBox: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  otpSingleBoxFilled: {
    borderColor: '#F5B800',
  },
  resendTimerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerCountdownText: {
    fontSize: 12,
  },
  resendCodeLink: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: 'bold',
  },

  // Bottom Links
  signInPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  signInPromptText: {
    fontSize: 13,
  },
  signInPromptLink: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  termsCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },
  termsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  termsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsContent: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
});
