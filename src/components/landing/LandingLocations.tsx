import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Icons from 'lucide-react-native';

const { width } = Dimensions.get('window');

const LOCATIONS = [
  {
    type: 'HEAD OFFICE',
    city: 'Krishnagiri',
    address: 'RK Towers, Rayakottai Rd, opposite to HP Petrol Bunk, Wahab Nagar, Krishnagiri, Tamil Nadu 635002',
    phone: '+91 63694 06416',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=RK+Towers+Rayakottai+Rd+Krishnagiri+Tamil+Nadu+635002',
    accent: '#F59E0B',
  },
  {
    type: 'BRANCH OFFICE',
    city: 'Tirupattur',
    address: 'No 83, Hyundai showroom, 1st floor, opp to Jio Petrol Bunk, Tirupattur, Tamil Nadu - 635853',
    phone: '+91 63694 06416',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Tirupattur+Tamil+Nadu+635853',
    accent: '#38BDF8',
  },
  {
    type: 'BRANCH OFFICE',
    city: 'Chennai',
    address: '22, VVM Towers, 3rd Floor, Pattullos Rd, Anna Salai, Royapettah, Chennai, Tamil Nadu 600002',
    phone: '+91 63694 06416',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=22+VVM+Towers+Pattullos+Rd+Anna+Salai+Royapettah+Chennai+600002',
    accent: '#34D399',
  },
  {
    type: 'LIAISON OFFICE',
    city: 'Bangalore',
    address: 'Excel Coworks, Marilingappa layout, Nagarbhavi, Papareddypalya, Bangalore.',
    phone: '+91 63694 06416',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Excel+Coworks+Marilingappa+layout+Nagarbhavi+Bangalore',
    accent: '#C084FC',
  },
  {
    type: 'AGENT BRANCH',
    city: 'Palacode',
    address: '832F+39C, Theerthagiri Nagar, Karagathahalli, Palacode, Tamil Nadu 636808',
    phone: '+91 63694 06416',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=832F%2B39C+Theerthagiri+Nagar+Karagathahalli+Palacode+Tamil+Nadu+636808',
    accent: '#EC4899',
  },
];

export default function LandingLocations() {
  const openMap = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.overline}>OUR PRESENCE</Text>
        <Text style={styles.title}>Branch Locations</Text>
        <Text style={styles.subtitle}>Visit us at any of our offices across India</Text>
      </View>

      {/* Location Cards */}
      <View style={styles.grid}>
        {LOCATIONS.map((loc, idx) => (
          <Animated.View
            key={loc.city}
            entering={FadeInDown.delay(idx * 100).duration(400).springify()}
          >
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => openMap(loc.mapUrl)}
            >
              {/* Office Type Tag */}
              <View style={styles.typeBadge}>
                <Text style={[styles.typeBadgeText, { color: loc.accent }]}>{loc.type}</Text>
              </View>

              {/* City header */}
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: loc.accent }]} />
                <Text style={styles.cityName}>{loc.city}</Text>
                <Icons.ExternalLink color="rgba(255,255,255,0.3)" size={12} />
              </View>

              {/* Address */}
              <Text style={styles.address} numberOfLines={3}>
                {loc.address}
              </Text>

              {/* Phone */}
              <View style={styles.phoneRow}>
                <Icons.Phone color="rgba(244, 196, 0, 0.8)" size={11} />
                <Text style={styles.phone}>{loc.phone}</Text>
              </View>

              {/* Map Link */}
              <View style={styles.mapLink}>
                <Icons.MapPin color="#F4C400" size={12} />
                <Text style={styles.mapText}>View on Maps</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <View style={styles.footerContent}>
          <Image
            source={require('../../assets/images/forge_india_logo.jpg')}
            style={styles.footerLogoImage}
          />
          <Text style={styles.footerBrand}>Forge India Connect</Text>
          <Text style={styles.footerTagline}>
            Everything Connected. Everywhere You Go.
          </Text>
          <Text style={styles.footerCopyright}>
            © 2026 Forge India Connect. All rights reserved.
          </Text>
        </View>
      </View>
    </View>
  );
}

const CARD_WIDTH = (width - 48 - 12) / 2;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050B1E',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  overline: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    color: 'rgba(244, 196, 0, 0.8)',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  address: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 15,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  phone: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  mapText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F4C400',
  },
  footer: {
    marginTop: 40,
    paddingBottom: 30,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  footerContent: {
    alignItems: 'center',
  },
  footerLogoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F4C400',
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  footerTagline: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    marginBottom: 12,
  },
  footerCopyright: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.25)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
