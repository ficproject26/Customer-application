import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PermissionsAndroid, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import GlassCard from '../components/GlassCard';
import * as Icons from 'lucide-react-native';
import { requestNotificationPermissions } from '../services/notificationService';

const { height } = Dimensions.get('window');

export default function PermissionsScreen() {
  const navigation = useNavigation<any>();
  
  // Track state of permission approval
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);

  const requestLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'Connect Mobile needs access to your location to fetch local partner hubs.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationGranted(true);
        } else {
          Alert.alert('Permission Denied', 'Location access is helpful to resolve your nearest delivery hub.');
        }
      } else {
        // Platform fallback for iOS / Web
        setLocationGranted(true);
      }
    } catch (err) {
      console.warn(err);
      setLocationGranted(true);
    }
  };

  const requestNotifications = async () => {
    // Permission handler for notifications
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsGranted(true);
        Alert.alert('Notifications Enabled', 'You will receive updates about orders and promotions.');
      } else {
        setNotificationsGranted(false);
        Alert.alert('Notifications Notice', 'Notification permission was denied. You can enable it in device Settings anytime.');
      }
    } catch (e) {
      setNotificationsGranted(true);
    }
  };

  const requestCamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'Connect Mobile needs access to your camera to scan QR codes and update profile photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setCameraGranted(true);
        } else {
          Alert.alert('Permission Denied', 'Camera access is required for scanning codes or taking photos.');
        }
      } else {
        // Platform fallback for iOS / Web
        setCameraGranted(true);
      }
    } catch (err) {
      console.warn(err);
      setCameraGranted(true);
    }
  };

  const handleContinue = () => {
    // Navigate to Create Account (2-Step Registration)
    navigation.navigate('CreateAccount');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icons.ChevronLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBox}>
          <View style={styles.shieldIconContainer}>
            <Icons.ShieldCheck color="#F4C400" size={32} />
          </View>
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            Please configure your settings to enjoy all features and benefits of the Connect Mobile app.
          </Text>
        </View>

        {/* Permissions list */}
        <View style={styles.listContainer}>
          
          {/* Location Card */}
          <GlassCard
            style={styles.permCard}
            borderColor={locationGranted ? 'rgba(244, 196, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
            backgroundColor={locationGranted ? 'rgba(244, 196, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)'}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: locationGranted ? 'rgba(244, 196, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)' }]}>
                <Icons.MapPin color={locationGranted ? '#F4C400' : '#FFF'} size={20} />
              </View>
              <View style={styles.textDetails}>
                <Text style={[styles.permName, locationGranted ? { color: '#F4C400' } : null]}>Location Access</Text>
                <Text style={styles.permDesc}>Find nearby partner hubs, track live deliveries, and check local offerings.</Text>
              </View>
              <TouchableOpacity
                style={[styles.grantBtn, locationGranted ? styles.grantBtnActive : null]}
                onPress={requestLocation}
                disabled={locationGranted}
              >
                <Text style={[styles.grantBtnText, locationGranted ? styles.grantBtnTextActive : null]}>
                  {locationGranted ? 'Allowed' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Notifications Card */}
          <GlassCard
            style={styles.permCard}
            borderColor={notificationsGranted ? 'rgba(244, 196, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
            backgroundColor={notificationsGranted ? 'rgba(244, 196, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)'}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: notificationsGranted ? 'rgba(244, 196, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)' }]}>
                <Icons.Bell color={notificationsGranted ? '#F4C400' : '#FFF'} size={20} />
              </View>
              <View style={styles.textDetails}>
                <Text style={[styles.permName, notificationsGranted ? { color: '#F4C400' } : null]}>Push Notifications</Text>
                <Text style={styles.permDesc}>Receive instant order status updates, delivery progress, and priority alerts.</Text>
              </View>
              <TouchableOpacity
                style={[styles.grantBtn, notificationsGranted ? styles.grantBtnActive : null]}
                onPress={requestNotifications}
                disabled={notificationsGranted}
              >
                <Text style={[styles.grantBtnText, notificationsGranted ? styles.grantBtnTextActive : null]}>
                  {notificationsGranted ? 'Allowed' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Camera Card */}
          <GlassCard
            style={styles.permCard}
            borderColor={cameraGranted ? 'rgba(244, 196, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
            backgroundColor={cameraGranted ? 'rgba(244, 196, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)'}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: cameraGranted ? 'rgba(244, 196, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)' }]}>
                <Icons.Camera color={cameraGranted ? '#F4C400' : '#FFF'} size={20} />
              </View>
              <View style={styles.textDetails}>
                <Text style={[styles.permName, cameraGranted ? { color: '#F4C400' } : null]}>Camera Access</Text>
                <Text style={styles.permDesc}>Required for scanning QR codes, proof of delivery pictures, and profile setup.</Text>
              </View>
              <TouchableOpacity
                style={[styles.grantBtn, cameraGranted ? styles.grantBtnActive : null]}
                onPress={requestCamera}
                disabled={cameraGranted}
              >
                <Text style={[styles.grantBtnText, cameraGranted ? styles.grantBtnTextActive : null]}>
                  {cameraGranted ? 'Allowed' : 'Allow'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.8}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Agree & Continue</Text>
          <Icons.ChevronRight color="#050B1E" size={16} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: height * 0.05,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introBox: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 10,
  },
  shieldIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 196, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  listContainer: {
    width: '100%',
    marginBottom: 24,
  },
  permCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  permName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  permDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
    lineHeight: 15,
  },
  grantBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  grantBtnActive: {
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
    borderColor: 'rgba(244, 196, 0, 0.3)',
  },
  grantBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  grantBtnTextActive: {
    color: '#F4C400',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4C400',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#F4C400',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#050B1E',
    marginRight: 6,
  },
});
