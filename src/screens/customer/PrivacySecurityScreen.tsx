import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

export default function PrivacySecurityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  // Security Toggles
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: 'sess_1',
      device: 'Samsung Galaxy S24 Ultra (This Device)',
      location: 'Bangalore, India',
      ip: '106.51.72.19',
      isCurrent: true,
      lastActive: 'Active Now',
    },
    {
      id: 'sess_2',
      device: 'Chrome on macOS (MacBook Pro 16")',
      location: 'Bangalore, India',
      ip: '106.51.72.22',
      isCurrent: false,
      lastActive: '2 hours ago',
    },
  ]);

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      'Terminate Session',
      'Are you sure you want to log out this device remotely?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            Alert.alert('Success', 'Session revoked successfully.');
          },
        },
      ]
    );
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Your account password has been updated securely.');
    }, 400);
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Export Account Data',
      `A complete archive of your orders, bookings, addresses, and account logs will be compiled and sent to ${currentUser?.email || 'your email'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Archive',
          onPress: () => Alert.alert('Request Sent', 'Your data export link will arrive in your inbox within 15 minutes.'),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your Connect account? This action cannot be undone and all loyalty points, orders, and saved addresses will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
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
            paddingTop: insets.top + 8,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>

        <View style={styles.titleGroup}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Security</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Protect your data and manage account security
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Shield Banner */}
        <View
          style={[
            styles.shieldBanner,
            {
              backgroundColor: isLight ? '#FEF9E7' : 'rgba(245, 184, 0, 0.08)',
              borderColor: isLight ? '#FCD34D' : 'rgba(245, 184, 0, 0.3)',
            },
          ]}
        >
          <View style={styles.shieldIconCircle}>
            <Icons.ShieldCheck color="#D97706" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.shieldTitle, { color: colors.text }]}>Security Status: Protected</Text>
            <Text style={[styles.shieldSubtitle, { color: colors.subtext }]}>
              256-bit SSL encryption active. Multi-layer account defense is safeguarding your transactions.
            </Text>
          </View>
        </View>

        {/* 1. AUTHENTICATION & LOGIN */}
        <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
          AUTHENTICATION & ACCESS
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          {/* Two-Factor Auth */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Key color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Two-Factor Authentication (2FA)</Text>
                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                  Require OTP verification when logging in from new devices
                </Text>
              </View>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={(val) => {
                setTwoFactorAuth(val);
                Alert.alert('2FA Updated', val ? 'Two-factor OTP challenge enabled.' : '2FA disabled.');
              }}
              trackColor={{ false: '#64748B', true: '#F5B800' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

          {/* Biometric Unlock */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Fingerprint color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Biometric Quick Unlock</Text>
                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                  Use Fingerprint / Face ID to authenticate checkouts
                </Text>
              </View>
            </View>
            <Switch
              value={biometricLogin}
              onValueChange={(val) => setBiometricLogin(val)}
              trackColor={{ false: '#64748B', true: '#F5B800' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => setIsPasswordModalOpen(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
              <Icons.Lock color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                Update your login password regularly
              </Text>
            </View>
            <Icons.ChevronRight color="#94A3B8" size={16} />
          </TouchableOpacity>
        </View>

        {/* 2. ACTIVE SESSIONS */}
        <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
          ACTIVE SESSIONS & DEVICES
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          {sessions.map((sess, idx) => (
            <React.Fragment key={sess.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />}
              <View style={styles.sessionRow}>
                <View style={[styles.iconCircle, { backgroundColor: sess.isCurrent ? '#FEF9E7' : (isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)') }]}>
                  <Icons.Smartphone color={sess.isCurrent ? '#D97706' : '#94A3B8'} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {sess.device}
                    </Text>
                    {sess.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>THIS DEVICE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                    {sess.location} • {sess.lastActive}
                  </Text>
                </View>
                {!sess.isCurrent && (
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    activeOpacity={0.7}
                    onPress={() => handleRevokeSession(sess.id)}
                  >
                    <Text style={styles.revokeBtnText}>Revoke</Text>
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* 3. DATA & PRIVACY RIGHTS */}
        <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
          DATA & PRIVACY PREFERENCES
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          {/* Personalized Ads/Analytics */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextGroup}>
              <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Icons.Sliders color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Analytics & Usage Data</Text>
                <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                  Share anonymous diagnostics to help improve app reliability
                </Text>
              </View>
            </View>
            <Switch
              value={dataSharing}
              onValueChange={(val) => setDataSharing(val)}
              trackColor={{ false: '#64748B', true: '#F5B800' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]} />

          {/* Download Data */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={handleDownloadData}
          >
            <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)' }]}>
              <Icons.Download color={isLight ? '#0F172A' : '#FFFFFF'} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Download Your Data</Text>
              <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
                Request a copy of your personal orders and account logs
              </Text>
            </View>
            <Icons.ChevronRight color="#94A3B8" size={16} />
          </TouchableOpacity>
        </View>

        {/* 4. DANGER ZONE */}
        <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>
          DANGER ZONE
        </Text>
        <TouchableOpacity
          style={[styles.dangerCard, { backgroundColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.08)' }]}
          activeOpacity={0.7}
          onPress={handleDeleteAccount}
        >
          <View style={styles.dangerIconCircle}>
            <Icons.Trash2 color="#EF4444" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Delete Connect Account</Text>
            <Text style={styles.dangerSubtitle}>
              Permanently erase profile, orders, points, and saved addresses
            </Text>
          </View>
          <Icons.ChevronRight color="#EF4444" size={16} />
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isLight ? '#FFFFFF' : '#0B132B' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Current Password</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)' }]}
              placeholder="Enter current password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={[styles.inputLabel, { color: colors.subtext }]}>New Password</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)' }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)' }]}
              placeholder="Re-type new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setIsPasswordModalOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdatePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#050B1E" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  shieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  shieldIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  shieldSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  revokeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  revokeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 20,
  },
  dangerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  dangerSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#050B1E',
  },
});
