import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Icons from 'lucide-react-native';
import { useAuthGuardStore } from '../store/authGuardStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../store/languageStore';

const { width } = Dimensions.get('window');

export default function GuestAuthModal() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);

  const isOpen = useAuthGuardStore((state) => state.isOpen);
  const actionText = useAuthGuardStore((state) => state.actionText);
  const hideAuthModal = useAuthGuardStore((state) => state.hideAuthModal);

  if (!isOpen) return null;

  const handleSignIn = () => {
    hideAuthModal();
    navigation.navigate('Login');
  };

  const handleCreateAccount = () => {
    hideAuthModal();
    navigation.navigate('JoinNow');
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={hideAuthModal}
    >
      <TouchableWithoutFeedback onPress={hideAuthModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                },
              ]}
            >
              {/* Top Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={hideAuthModal}
                activeOpacity={0.7}
              >
                <Icons.X size={20} color={colors.subtext} />
              </TouchableOpacity>

              {/* Icon Badge */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7' },
                ]}
              >
                <Icons.Lock size={32} color="#F4C400" />
              </View>

              {/* Title & Message */}
              <Text style={[styles.title, { color: colors.text }]}>
                {t('Login Required')}
              </Text>
              <Text style={[styles.message, { color: colors.subtext }]}>
                Please sign in or create an account to {actionText} and enjoy seamless tracking and membership benefits.
              </Text>

              {/* Buttons */}
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: '#F4C400' }]}
                  onPress={handleSignIn}
                  activeOpacity={0.85}
                >
                  <Icons.LogIn size={18} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>{t('Sign In')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                    },
                  ]}
                  onPress={handleCreateAccount}
                  activeOpacity={0.85}
                >
                  <Icons.UserPlus size={18} color={colors.text} style={{ marginRight: 8 }} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                    {t('Create Account')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={hideAuthModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>
                    {t('Continue Browsing as Guest')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: Math.min(width - 40, 360),
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
