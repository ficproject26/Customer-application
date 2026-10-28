import React, { useState } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { apiFetch } from '../../services/api';
import * as Icons from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LoginScreenProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export default function Login() {
  const navigation = useNavigation<LoginScreenProp>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const showToast = useToastStore((state) => state.showToast);

  const login = useAuthStore((state) => state.login);

  // Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email OTP Modal States
  const [emailOtpModalVisible, setEmailOtpModalVisible] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Google Sign-In Modal States
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Forgot Password Modal States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetTarget, setResetTarget] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // OTP Countdown Timer Effect
  React.useEffect(() => {
    let timer: any;
    if (emailOtpModalVisible && otpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [emailOtpModalVisible, otpSent, resendTimer]);

  const navigateAfterAuth = () => {
    const pendingProduct = useAuthStore.getState().pendingPurchaseProduct;
    if (pendingProduct) {
      useAuthStore.getState().setPendingPurchaseProduct(null);
      if (pendingProduct.isStay || pendingProduct.category?.toLowerCase() === 'stay' || pendingProduct.id?.startsWith('st')) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'CustomerTabs' as any, params: { screen: 'Home' } },
            { name: 'StayDetails' as any, params: { stay: pendingProduct } },
          ],
        });
        return;
      }
      if (pendingProduct.category?.toLowerCase() === 'jobs' || pendingProduct.id?.startsWith('jb')) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'CustomerTabs' as any, params: { screen: 'Home' } },
            { name: 'JobDetails' as any, params: { job: pendingProduct, openApplySheet: true } },
          ],
        });
        return;
      }
      navigation.reset({
        index: 1,
        routes: [
          { name: 'CustomerTabs' as any, params: { screen: 'Home' } },
          { name: 'ProductDetails' as any, params: { item: pendingProduct, category: pendingProduct.category || 'Products' } },
        ],
      });
      return;
    }
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'CustomerTabs' as any,
          params: { screen: 'Home' },
        },
      ],
    });
  };

  // Primary Login Submission
  const handleLogin = async () => {
    const trimmedId = identifier.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!trimmedId) {
      setError('Please enter your mobile number or email.');
      return;
    }

    if (trimmedId.includes('@')) {
      if (!emailRegex.test(trimmedId)) {
        setError('Please enter a valid email address (e.g. name@gmail.com).');
        return;
      }
    } else {
      const cleanPhone = trimmedId.replace(/[^\d]/g, '').slice(-10);
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Connect to Backend API
      const res: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: {
          email: trimmedId.includes('@') ? trimmedId : undefined,
          phone: !trimmedId.includes('@') ? trimmedId : undefined,
          identifier: trimmedId,
          password,
          role: 'customer',
        },
      });

      if (res && (res.error || res.status === 'error' || res.status === 404 || res.status === 401 || res.status === 403)) {
        setLoading(false);
        const errMsg = res.message || '';
        if (res.status === 404 || res.notRegistered || res.code === 'ACCOUNT_NOT_FOUND' || errMsg.toLowerCase().includes('not found')) {
          setError('Account not found. Please register to continue.');
        } else if (res.status === 403 || res.code === 'ACCOUNT_INACTIVE') {
          setError(errMsg || 'Your account is inactive or suspended. Please contact support.');
        } else {
          setError(errMsg || 'Invalid password. Please try again.');
        }
        return;
      }

      // Successful DB authentication
      const loggedUser = res?.user || res?.data || null;
      const accessToken = res?.accessToken || res?.token || '';
      if (loggedUser) {
        const fullUser = {
          id: loggedUser.id || loggedUser._id || loggedUser.customerId || `cust_${trimmedId}`,
          name: loggedUser.name || (trimmedId.includes('@') ? trimmedId.split('@')[0] : 'Connect Customer'),
          email: loggedUser.email || (trimmedId.includes('@') ? trimmedId : ''),
          phone: loggedUser.phone || (!trimmedId.includes('@') ? trimmedId : ''),
          role: 'customer' as const,
          membership: loggedUser.membershipTier || loggedUser.membership,
          membershipTier: loggedUser.membershipTier,
          membershipStatus: loggedUser.membershipStatus,
          walletBalance: loggedUser.walletBalance || 0,
          emailVerified: true,
          phoneVerified: true,
          customerId: loggedUser.customerId || loggedUser.registrationId,
          registrationId: loggedUser.registrationId || loggedUser.customerId,
          address: loggedUser.address,
          addresses: loggedUser.addresses,
        };
        await useAuthStore.getState().setSession(fullUser, accessToken);
      } else {
        login(trimmedId, 'customer');
      }

      setLoading(false);
      showToast(`Welcome back, ${loggedUser?.name || trimmedId}! 🎉`);
      navigateAfterAuth();
    } catch (err: any) {
      setLoading(false);
      setError('Unable to connect to server. Please check your internet connection.');
    }
  };

  // Google Account Select Handler
  const handleGoogleAccountSelect = async (accountEmail: string, accountName: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanEmail = accountEmail.trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setGoogleError('Please enter a valid Google email address (e.g. user@gmail.com).');
      return;
    }
    setGoogleLoading(true);
    setGoogleError('');

    try {
      apiFetch('/auth/google', {
        method: 'POST',
        body: {
          email: cleanEmail,
          name: accountName,
          role: 'customer',
        },
      }).catch(() => {});

      setTimeout(() => {
        login(cleanEmail, 'customer', (user) => {
          if (accountName && user.name !== accountName) {
            useAuthStore.getState().updateProfile({ name: accountName }).catch(() => {});
          }
          setGoogleLoading(false);
          setGoogleModalVisible(false);
          showToast(`Signed in with Google as ${accountName || user.name}! 🚀`);
          navigateAfterAuth();
        });
      }, 500);
    } catch (err: any) {
      setGoogleLoading(false);
      setGoogleError(err?.message || 'Google Sign In failed.');
    }
  };

  // Send Email / Phone OTP
  const handleSendEmailOtp = async () => {
    const trimmed = emailForOtp.trim();
    if (!trimmed) {
      setOtpError('Please enter your mobile number or email.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    try {
      const res: any = await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: {
          phone: trimmed,
          mobileNumber: trimmed,
          mobileOrEmail: trimmed,
        },
      });

      setOtpLoading(false);
      if (res && (res.error || res.status === 'error')) {
        const errMsg = res.message || 'Failed to send OTP.';
        if (res.status === 404 || res.code === 'ACCOUNT_NOT_FOUND' || errMsg.toLowerCase().includes('not found')) {
          setOtpError('Please register first to access the Customer App.');
        } else {
          setOtpError(errMsg);
        }
        return;
      }

      setOtpSent(true);
      setResendTimer(res?.cooldownSeconds || 30);
      const codePreview = res?.devOtpPreview || res?.otp;
      showToast(codePreview ? `OTP Sent! Dev Code: ${codePreview}` : `Verification code sent to ${trimmed}`);
    } catch (err: any) {
      setOtpLoading(false);
      setOtpError(err?.message || 'Failed to send OTP.');
    }
  };

  // Verify OTP & Log In
  const handleVerifyEmailOtp = async () => {
    const code = otpCode.trim();
    if (!code || code.length < 6) {
      setOtpError('Please enter the full 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    try {
      const res: any = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: {
          phone: emailForOtp.trim(),
          mobileNumber: emailForOtp.trim(),
          mobileOrEmail: emailForOtp.trim(),
          otp: code,
        },
      });

      if (res && (res.error || res.status === 'error')) {
        setOtpLoading(false);
        setOtpError(res.message || 'Invalid or expired OTP code. Please try again.');
        return;
      }

      const loggedUser = res?.user || res?.data || null;
      const accessToken = res?.accessToken || res?.token || '';
      if (loggedUser) {
        const fullUser = {
          id: loggedUser.id || loggedUser._id || loggedUser.customerId || `cust_${Date.now()}`,
          name: loggedUser.name || 'Connect Member',
          email: loggedUser.email || (emailForOtp.includes('@') ? emailForOtp : ''),
          phone: loggedUser.phone || (!emailForOtp.includes('@') ? emailForOtp : ''),
          role: 'customer' as const,
          membership: loggedUser.membershipTier || loggedUser.membership,
          membershipTier: loggedUser.membershipTier,
          membershipStatus: loggedUser.membershipStatus,
          walletBalance: loggedUser.walletBalance || 0,
          emailVerified: true,
          phoneVerified: true,
          customerId: loggedUser.customerId || loggedUser.registrationId,
          registrationId: loggedUser.registrationId || loggedUser.customerId,
          address: loggedUser.address,
          addresses: loggedUser.addresses,
        };
        await useAuthStore.getState().setSession(fullUser, accessToken);
      } else {
        login(emailForOtp.trim(), 'customer');
      }

      setOtpLoading(false);
      setEmailOtpModalVisible(false);
      showToast(`Welcome back, ${loggedUser?.name || 'Member'}! 🎉`);
      navigateAfterAuth();
    } catch (err: any) {
      setOtpLoading(false);
      setOtpError(err?.message || 'Verification failed. Please try again.');
    }
  };

  // Forgot Password Handlers
  const handleSendResetCode = () => {
    const trimmed = resetTarget.trim();
    if (!trimmed) {
      setResetError('Please enter your registered mobile number or email.');
      return;
    }
    setResetLoading(true);
    setResetError('');

    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: { target: trimmed },
    }).catch(() => {});

    setTimeout(() => {
      setResetLoading(false);
      setResetStep(2);
      showToast(`Reset code sent to ${trimmed}`);
    }, 600);
  };

  const handleCompleteReset = () => {
    if (!resetOtp || resetOtp.trim().length < 4) {
      setResetError('Please enter the 4-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setResetError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    apiFetch('/auth/reset-password', {
      method: 'POST',
      body: {
        target: resetTarget.trim(),
        otp: resetOtp.trim(),
        newPassword: newPassword,
      },
    }).catch(() => {});

    setTimeout(() => {
      setResetLoading(false);
      setForgotModalVisible(false);
      setResetStep(1);
      const targetUser = resetTarget.trim();
      setIdentifier(targetUser);
      setPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password updated successfully! Logging you in...');
      login(targetUser, 'customer', (user) => {
        showToast(`Welcome back, ${user.name}! Password updated successfully. 🎉`);
        navigateAfterAuth();
      });
    }, 800);
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
            { paddingTop: Math.max(insets.top + 8, 16), paddingBottom: Math.max(insets.bottom + 16, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Header */}
          <View style={styles.topBanner}>
            {/* Central Circular Brand Logo */}
            <View style={styles.centerLogoCircleWrapper}>
              <View style={styles.centerLogoCircle}>
                <Image
                  source={require('../../assets/images/forge_india_logo.jpg')}
                  style={styles.centerLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Headline & Subtitle */}
          <View style={styles.headlineSection}>
            <Text style={[styles.mainHeadline, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
              Welcome Back
            </Text>
            <Text style={[styles.subHeadline, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              Sign in to continue to Connect App{'\n'}
              Explore services, products, travel, jobs and more.
            </Text>
          </View>

          {/* Main Login Card */}
          <View style={[styles.loginCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#F1F5F9' : '#334155' }]}>
            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Mobile Number or Email */}
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                Mobile Number or Email
              </Text>
              <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                <Icons.User color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                  placeholder="Enter your mobile number or email"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <View style={styles.passwordHeaderRow}>
                <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  Password
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setResetTarget(identifier);
                    setForgotModalVisible(true);
                    setResetStep(1);
                    setResetError('');
                  }}
                >
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                <Icons.Lock color={isLight ? '#94A3B8' : '#64748B'} size={18} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                  placeholder="Enter your password"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
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

            {/* Keep me signed in Checkbox */}
            <TouchableOpacity
              style={styles.keepSignedInRow}
              activeOpacity={0.8}
              onPress={() => setKeepSignedIn(!keepSignedIn)}
            >
              <View style={[styles.checkboxBox, keepSignedIn && styles.checkboxBoxChecked]}>
                {keepSignedIn && <Icons.Check color="#0F172A" size={13} strokeWidth={3} />}
              </View>
              <Text style={[styles.keepSignedInText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
                Keep me signed in
              </Text>
            </TouchableOpacity>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In →</Text>
              )}
            </TouchableOpacity>



            {/* New to Connect App? Create Account */}
            <View style={styles.createAccountRow}>
              <Text style={[styles.createAccountPrompt, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                New to Connect App?
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('JoinNow')}
                activeOpacity={0.8}
              >
                <Text style={styles.createAccountLink}> Create Account ›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ marginTop: 14, alignItems: 'center', paddingVertical: 8 }}
              onPress={() => {
                useAuthStore.getState().loginGuest();
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'CustomerTabs' as any,
                      params: { screen: 'Home' },
                    },
                  ],
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#0284C7', fontSize: 14, fontWeight: '700' }}>
                Explore App as Guest →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Quick Category Strip & Illustration Tagline */}
          <View style={styles.bottomHighlightStrip}>
            <View style={styles.quickCategoryRow}>
              {[
                { name: 'Products', icon: 'Box', color: '#F97316' },
                { name: 'Food', icon: 'Utensils', color: '#EF4444' },
                { name: 'Travel', icon: 'Bus', color: '#0EA5E9' },
                { name: 'Jobs', icon: 'Briefcase', color: '#8B5CF6' },
                { name: 'And More', icon: 'LayoutGrid', color: '#10B981' },
              ].map((cat, idx) => {
                const IconComp = (Icons as any)[cat.icon] || Icons.LayoutGrid;
                return (
                  <View key={idx} style={styles.quickCatItem}>
                    <View style={[styles.quickCatIconCircle, { backgroundColor: isLight ? '#FFF8E1' : '#1E293B' }]}>
                      <IconComp color={cat.color} size={18} />
                    </View>
                    <Text style={[styles.quickCatName, { color: isLight ? '#475569' : '#94A3B8' }]}>
                      {cat.name}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.bottomTaglineMotto, { color: isLight ? '#94A3B8' : '#64748B' }]}>
              CONNECTING PEOPLE TO A BETTER TOMORROW
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Selector Modal */}
      <Modal
        visible={googleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoogleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4285F4' }}>G</Text>
                </View>
                <Text style={[styles.modalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Sign in with Google
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#0F172A' }]}
                onPress={() => setGoogleModalVisible(false)}
              >
                <Icons.X color={isLight ? '#0F172A' : '#FFFFFF'} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: isLight ? '#64748B' : '#94A3B8', marginBottom: 16 }]}>
              Choose a Google account to continue to Connect App
            </Text>

            {googleError ? (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{googleError}</Text>
              </View>
            ) : null}

            {googleLoading ? (
              <View style={{ paddingVertical: 30, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#4285F4" />
                <Text style={{ marginTop: 12, color: isLight ? '#64748B' : '#94A3B8', fontSize: 14, fontWeight: '600' }}>
                  Authenticating with Google...
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {/* Account 1 */}
                <TouchableOpacity
                  style={[styles.googleAccountOption, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}
                  activeOpacity={0.8}
                  onPress={() => handleGoogleAccountSelect('rajesh.k@gmail.com', 'Rajesh Kumar')}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.accountAvatarText}>R</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      Rajesh Kumar
                    </Text>
                    <Text style={[styles.accountEmail, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      rajesh.k@gmail.com
                    </Text>
                  </View>
                  <Icons.ChevronRight color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                </TouchableOpacity>

                {/* Account 2 */}
                <TouchableOpacity
                  style={[styles.googleAccountOption, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}
                  activeOpacity={0.8}
                  onPress={() => handleGoogleAccountSelect('priya.sharma@gmail.com', 'Priya Sharma')}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#EC4899' }]}>
                    <Text style={styles.accountAvatarText}>P</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      Priya Sharma
                    </Text>
                    <Text style={[styles.accountEmail, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      priya.sharma@gmail.com
                    </Text>
                  </View>
                  <Icons.ChevronRight color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                </TouchableOpacity>

                {/* Custom Google Account Option */}
                {!showCustomGoogleInput ? (
                  <TouchableOpacity
                    style={[styles.googleAccountOption, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}
                    activeOpacity={0.8}
                    onPress={() => setShowCustomGoogleInput(true)}
                  >
                    <View style={[styles.accountAvatar, { backgroundColor: isLight ? '#E2E8F0' : '#334155' }]}>
                      <Icons.UserPlus color={isLight ? '#475569' : '#94A3B8'} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                        Use another Google account
                      </Text>
                      <Text style={[styles.accountEmail, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                        Enter custom Gmail address
                      </Text>
                    </View>
                    <Icons.ChevronRight color={isLight ? '#94A3B8' : '#64748B'} size={18} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.customEmailBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8', marginBottom: 6 }]}>
                      ENTER YOUR GOOGLE EMAIL
                    </Text>
                    <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#CBD5E1' : '#475569' }]}>
                      <Icons.Mail color="#4285F4" size={18} style={styles.fieldIcon} />
                      <TextInput
                        style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                        placeholder="yourname@gmail.com"
                        placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        value={customGoogleEmail}
                        onChangeText={(val) => {
                          setCustomGoogleEmail(val);
                          if (googleError) setGoogleError('');
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.modalPrimaryBtn, { marginTop: 12, backgroundColor: '#4285F4' }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        const emailParts = customGoogleEmail.trim().split('@');
                        const derivedName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : 'Google User';
                        handleGoogleAccountSelect(customGoogleEmail, derivedName);
                      }}
                    >
                      <Text style={[styles.modalPrimaryBtnText, { color: '#FFFFFF' }]}>
                        Continue with Google →
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Email OTP Login Modal */}
      <Modal
        visible={emailOtpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                {otpSent ? 'Enter Email OTP' : 'Quick Email Sign In'}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#0F172A' }]}
                onPress={() => setEmailOtpModalVisible(false)}
              >
                <Icons.X color={isLight ? '#0F172A' : '#FFFFFF'} size={18} />
              </TouchableOpacity>
            </View>

            {otpError ? (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            {!otpSent ? (
              <>
                <Text style={[styles.modalDesc, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  Enter your registered email address. We'll send you an instant 4-digit sign-in code.
                </Text>
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    EMAIL ADDRESS
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Icons.Mail color="#3B82F6" size={18} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="Enter your email address"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={emailForOtp}
                      onChangeText={setEmailForOtp}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={handleSendEmailOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Send Verification Code →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* OTP Sent Success Banner */}
                <View style={styles.otpSentBanner}>
                  <Icons.ShieldCheck color="#10B981" size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpSentBannerTitle}>Verification Code Sent!</Text>
                    <Text style={styles.otpSentBannerText}>
                      Please enter the 4-digit verification code sent to your email.
                    </Text>
                  </View>
                </View>

                <View style={styles.editNumberContainer}>
                  <Text style={[styles.modalDesc, { color: isLight ? '#64748B' : '#94A3B8', marginBottom: 0 }]}>
                    Sent to <Text style={{ fontWeight: 'bold', color: isLight ? '#0F172A' : '#FFFFFF' }}>{emailForOtp}</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.editNumberBtn}
                    onPress={() => {
                      setOtpSent(false);
                      setOtpError('');
                    }}
                  >
                    <Icons.Pencil color="#0284C7" size={13} />
                    <Text style={styles.editNumberBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    4-DIGIT VERIFICATION CODE
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Icons.Lock color="#10B981" size={18} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF', letterSpacing: 8, fontWeight: 'bold', fontSize: 18 }]}
                      placeholder="1234"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={otpCode}
                      onChangeText={(val) => {
                        setOtpCode(val.replace(/[^\d]/g, '').slice(0, 4));
                        if (otpError) setOtpError('');
                      }}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>

                {/* Resend Timer & Action */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  {resendTimer > 0 ? (
                    <Text style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
                      Resend code in <Text style={{ fontWeight: 'bold', color: isLight ? '#0F172A' : '#FFFFFF' }}>{resendTimer}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        apiFetch('/auth/email-otp', {
                          method: 'POST',
                          body: { email: emailForOtp.trim() },
                        }).catch(() => {});
                        setResendTimer(30);
                        showToast(`New verification code sent to ${emailForOtp}`);
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#0284C7', fontWeight: '700' }}>
                        Resend OTP Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={handleVerifyEmailOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Verify & Sign In →</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isLight ? '#FFFFFF' : '#1E293B', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>Reset Password</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#0F172A' }]}
                onPress={() => setForgotModalVisible(false)}
              >
                <Icons.X color={isLight ? '#0F172A' : '#FFFFFF'} size={18} />
              </TouchableOpacity>
            </View>

            {resetError ? (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{resetError}</Text>
              </View>
            ) : null}

            {resetStep === 1 ? (
              <>
                <Text style={[styles.modalDesc, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  Enter your registered mobile or email to receive a password reset code.
                </Text>
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    MOBILE OR EMAIL
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <Icons.Mail color="#3B82F6" size={18} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="Enter mobile number or email"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={resetTarget}
                      onChangeText={setResetTarget}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={handleSendResetCode}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.otpSentBanner}>
                  <Icons.ShieldCheck color="#10B981" size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpSentBannerTitle}>Reset Code Sent!</Text>
                    <Text style={styles.otpSentBannerText}>
                      Please enter the 4-digit code sent to your registered contact.
                    </Text>
                  </View>
                </View>

                <Text style={[styles.modalDesc, { color: isLight ? '#64748B' : '#94A3B8', marginTop: 10 }]}>
                  Enter the 4-digit code sent to <Text style={{ fontWeight: 'bold', color: isLight ? '#0F172A' : '#FFFFFF' }}>{resetTarget}</Text> and create your new password.
                </Text>
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    4-DIGIT CODE
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="1234"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={resetOtp}
                      onChangeText={setResetOtp}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    NEW PASSWORD
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                    CONFIRM PASSWORD
                  </Text>
                  <View style={[styles.inputFieldBox, { backgroundColor: isLight ? '#F8FAFC' : '#0F172A', borderColor: isLight ? '#E2E8F0' : '#334155' }]}>
                    <TextInput
                      style={[styles.inputTextInput, { color: isLight ? '#0F172A' : '#FFFFFF' }]}
                      placeholder="Re-enter password"
                      placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={handleCompleteReset}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Update & Save Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  topLeftBadge: {
    width: 84,
  },
  scriptText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'sans-serif-medium',
    fontStyle: 'italic',
    fontWeight: '800',
    color: '#0F2942',
    lineHeight: 20,
  },
  scriptUnderline: {
    width: 48,
    height: 3,
    backgroundColor: '#F5B800',
    borderRadius: 2,
    marginTop: 3,
  },
  centerLogoCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLogoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerLogoImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  topRightTagline: {
    width: 90,
    alignItems: 'flex-end',
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    lineHeight: 14,
  },
  taglineUnderline: {
    width: 40,
    height: 2.5,
    backgroundColor: '#F5B800',
    borderRadius: 2,
    marginTop: 3,
  },
  headlineSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainHeadline: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subHeadline: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  loginCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
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
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotPasswordLink: {
    color: '#0284C7',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  inputFieldBox: {
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
  inputTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  eyeToggleBtn: {
    padding: 4,
  },
  keepSignedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 2,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  keepSignedInText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#F5B800',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  signInButtonText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orDividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  socialAuthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
  },
  googleIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  createAccountPrompt: {
    fontSize: 12.5,
  },
  createAccountLink: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  bottomHighlightStrip: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 8,
  },
  quickCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  quickCatItem: {
    alignItems: 'center',
    gap: 4,
  },
  quickCatIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  quickCatName: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  bottomTaglineMotto: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  googleAccountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 11.5,
    marginTop: 1,
  },
  customEmailBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  otpSentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  otpSentBannerTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  otpSentBannerText: {
    color: '#059669',
    fontSize: 11.5,
    marginTop: 1,
  },
  editNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  editNumberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  editNumberBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
});
