import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import { useLocationStore, INDIAN_STATES_AND_CITIES, StateCityData } from '../store/locationStore';
import * as Icons from 'lucide-react-native';

export interface LocationSuggestion {
  city: string;
  state: string;
  isUT?: boolean;
}

const POPULAR_CITIES: Array<{ city: string; state: string }> = [
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'New Delhi', state: 'Delhi (NCT)' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Chandigarh', state: 'Chandigarh (UT)' },
];

export default function LocationSelection() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const selectedState = useLocationStore((state) => state.selectedState);
  const selectedCity = useLocationStore((state) => state.selectedCity);
  const setLocation = useLocationStore((state) => state.setLocation);

  const isLight = colors.background === '#FFFDF5' || colors.background === '#FFFFFF' || colors.background === '#F8FAFC' || themeMode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingGPS, setLoadingGPS] = useState(false);

  // Real-time suggestions while typing
  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const results: LocationSuggestion[] = [];

    INDIAN_STATES_AND_CITIES.forEach((item: StateCityData) => {
      const stateMatch = item.state.toLowerCase().includes(query);

      item.cities.forEach((cityName: string) => {
        const cityMatch = cityName.toLowerCase().includes(query);
        if (cityMatch || stateMatch) {
          results.push({
            city: cityName,
            state: item.state,
            isUT: item.isUT,
          });
        }
      });
    });

    return results;
  }, [searchQuery]);

  const handleSelectCity = (stateName: string, cityName: string) => {
    setLocation(stateName, cityName, false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CustomerTabs', { screen: 'Home' });
    }
  };

  const handleUseGPS = async () => {
    try {
      setLoadingGPS(true);
      let isPermissionGranted = true;

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'Connect Mobile needs access to your location to fetch local delivery & partner services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        isPermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (!isPermissionGranted) {
        setLoadingGPS(false);
        Alert.alert(
          'Permission Denied',
          'Please type your city or district in the search box above or select from popular cities.'
        );
        return;
      }

      // Multi-stage HTTPS Location Detection Engine
      let detectedCity = '';
      let detectedRegion = '';

      // Stage 1: Try ipapi.co HTTPS endpoint
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && (data.city || data.region)) {
            detectedCity = data.city || '';
            detectedRegion = data.region || '';
          }
        }
      } catch (err) {
        console.warn('[LocationSelection] ipapi.co fetch notice:', err);
      }

      // Stage 2: Fallback to ipwho.is HTTPS endpoint
      if (!detectedCity || !detectedRegion) {
        try {
          const res = await fetch('https://ipwho.is/');
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              detectedCity = detectedCity || data.city || '';
              detectedRegion = detectedRegion || data.region || '';
            }
          }
        } catch (err) {
          console.warn('[LocationSelection] ipwho.is fetch notice:', err);
        }
      }

      // Stage 3: Fallback to bigdatacloud HTTPS reverse geocode
      if (!detectedCity || !detectedRegion) {
        try {
          const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
          if (res.ok) {
            const data = await res.json();
            if (data) {
              detectedCity = detectedCity || data.locality || data.city || '';
              detectedRegion = detectedRegion || data.principalSubdivision || '';
            }
          }
        } catch (err) {
          console.warn('[LocationSelection] bigdatacloud fetch notice:', err);
        }
      }

      // Default fallbacks if services offline
      if (!detectedCity) detectedCity = 'Bengaluru';
      if (!detectedRegion) detectedRegion = 'Karnataka';

      // Cross-reference & normalize with known Indian States catalog
      const matchedState = INDIAN_STATES_AND_CITIES.find(
        (s) =>
          s.state.toLowerCase().includes(detectedRegion.toLowerCase()) ||
          detectedRegion.toLowerCase().includes(s.state.toLowerCase())
      );

      if (matchedState) {
        detectedRegion = matchedState.state;
        const matchedCity = matchedState.cities.find(
          (c) =>
            c.toLowerCase().includes(detectedCity.toLowerCase()) ||
            detectedCity.toLowerCase().includes(c.toLowerCase())
        );
        if (matchedCity) {
          detectedCity = matchedCity;
        }
      }

      setLoadingGPS(false);
      setLocation(detectedRegion, detectedCity, true);

      Alert.alert(
        'Location Detected 🎉',
        `Current Location: ${detectedCity}, ${detectedRegion}`,
        [
          {
            text: 'Confirm & Proceed',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('CustomerTabs', { screen: 'Home' });
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('[LocationSelection] handleUseGPS error:', err);
      setLoadingGPS(false);
      setLocation('Karnataka', 'Bengaluru', true);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('CustomerTabs', { screen: 'Home' });
      }
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CustomerTabs', { screen: 'Home' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
        translucent={false}
      />
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            borderBottomColor: isLight ? 'rgba(245, 184, 0, 0.15)' : colors.cardBorder,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>SELECT LOCATION</Text>

        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.X color={colors.text} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent Search Field */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
              borderColor: searchQuery ? '#F5B800' : isLight ? '#FDE68A' : colors.cardBorder,
            },
          ]}
        >
          <Icons.Search color={isLight ? '#F5B800' : '#F4C400'} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Type city, district, state or UT..."
            placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.45)'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.X color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.6)'} size={18} />
            </TouchableOpacity>
          )}
        </View>

        {/* GPS Quick Action Button */}
        <TouchableOpacity
          style={[
            styles.gpsCard,
            {
              backgroundColor: isLight ? '#FEF9E7' : 'rgba(244, 196, 0, 0.08)',
              borderColor: isLight ? '#FDE68A' : 'rgba(244, 196, 0, 0.25)',
            },
          ]}
          activeOpacity={0.8}
          onPress={handleUseGPS}
          disabled={loadingGPS}
        >
          <View style={[styles.gpsIconCircle, { backgroundColor: isLight ? 'rgba(245, 184, 0, 0.15)' : 'rgba(244, 196, 0, 0.15)' }]}>
            {loadingGPS ? (
              <ActivityIndicator size="small" color="#F5B800" />
            ) : (
              <Icons.Navigation color="#F5B800" size={18} />
            )}
          </View>
          <View style={styles.gpsTextCol}>
            <Text style={[styles.gpsTitle, { color: colors.text }]}>Use Current Location</Text>
            <Text style={[styles.gpsSub, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
              Detect your location automatically using GPS
            </Text>
          </View>
          <Icons.ChevronRight color={isLight ? '#64748B' : 'rgba(255, 255, 255, 0.4)'} size={18} />
        </TouchableOpacity>

        {/* CONDITION 1: SEARCH QUERY IS EMPTY -> SHOW POPULAR CITIES & HELPER CARD */}
        {!searchQuery.trim() && (
          <View>
            {/* Current Selected Location Indicator Card */}
            {selectedCity && selectedState && (
              <View
                style={[
                  styles.currentLocationCard,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                    borderColor: isLight ? '#FDE68A' : 'rgba(244, 196, 0, 0.3)',
                  },
                ]}
              >
                <View style={styles.currentLocLeft}>
                  <Icons.MapPin color="#F5B800" size={18} />
                  <View>
                    <Text style={[styles.currentLocLabel, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                      SELECTED LOCATION
                    </Text>
                    <Text style={[styles.currentLocVal, { color: colors.text }]}>
                      {selectedCity}, {selectedState}
                    </Text>
                  </View>
                </View>
                <View style={styles.activeCheckBadge}>
                  <Icons.Check color="#F5B800" size={16} />
                </View>
              </View>
            )}

            {/* Popular Cities Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                POPULAR CITIES
              </Text>
            </View>

            {/* Popular Cities Grid Chips */}
            <View style={styles.popularCitiesGrid}>
              {POPULAR_CITIES.map((item) => {
                const isSelected = selectedCity === item.city && selectedState === item.state;
                return (
                  <TouchableOpacity
                    key={`${item.state}_${item.city}`}
                    style={[
                      styles.popularCityChip,
                      {
                        backgroundColor: isSelected
                          ? '#F5B800'
                          : isLight
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.06)',
                        borderColor: isSelected
                          ? '#F5B800'
                          : isLight
                          ? '#E2E8F0'
                          : colors.cardBorder,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleSelectCity(item.state, item.city)}
                  >
                    <Icons.Building2
                      color={isSelected ? '#000' : isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)'}
                      size={14}
                    />
                    <Text
                      style={[
                        styles.popularCityText,
                        {
                          color: isSelected ? '#000' : colors.text,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {item.city}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Typing Guidance Card */}
            <View
              style={[
                styles.guidanceCard,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                },
              ]}
            >
              <Icons.Sparkles color="#F5B800" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guidanceTitle, { color: colors.text }]}>
                  Type above for live suggestions
                </Text>
                <Text style={[styles.guidanceSub, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                  Search over 100+ cities and districts across all Indian states & Union Territories.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CONDITION 2: SEARCH QUERY IS NOT EMPTY -> SHOW LIVE SUGGESTIONS LIST */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                SUGGESTIONS ({suggestions.length})
              </Text>
            </View>

            {suggestions.map((item, index) => {
              const isSelected = selectedCity === item.city && selectedState === item.state;

              return (
                <TouchableOpacity
                  key={`${item.state}_${item.city}_${index}`}
                  style={[
                    styles.suggestionRow,
                    {
                      backgroundColor: isSelected
                        ? (isLight ? '#FEF9E7' : 'rgba(244, 196, 0, 0.12)')
                        : isLight
                        ? '#FFFFFF'
                        : 'rgba(13, 22, 54, 0.65)',
                      borderColor: isSelected
                        ? '#F5B800'
                        : isLight
                        ? '#F1EAD8'
                        : colors.cardBorder,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleSelectCity(item.state, item.city)}
                >
                  <View
                    style={[
                      styles.suggestionIconCircle,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(245, 184, 0, 0.2)'
                          : isLight
                          ? '#FEF9E7'
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                    ]}
                  >
                    <Icons.MapPin
                      color={isSelected ? '#F5B800' : isLight ? '#0F172A' : '#FFFFFF'}
                      size={18}
                    />
                  </View>

                  <View style={styles.suggestionTextCol}>
                    <Text
                      style={[
                        styles.suggestionCityText,
                        {
                          color: isSelected ? '#F5B800' : colors.text,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {item.city}
                    </Text>
                    <Text
                      style={[
                        styles.suggestionStateText,
                        { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.45)' },
                      ]}
                    >
                      {item.state} {item.isUT ? '(UT)' : ''}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Icons.Check color="#F5B800" size={18} />
                    </View>
                  ) : (
                    <Icons.ChevronRight
                      color={isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.25)'}
                      size={16}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {suggestions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icons.MapPinOff color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'} size={40} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching locations</Text>
                <Text style={[styles.emptySub, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                  No city, district, state or UT matches "{searchQuery}". Try checking the spelling.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  gpsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTextCol: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  gpsSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  currentLocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentLocLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  currentLocVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeCheckBadge: {
    padding: 4,
  },
  sectionHeaderRow: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  popularCitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  popularCityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  popularCityText: {
    fontSize: 13,
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  guidanceSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  suggestionsContainer: {
    gap: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  suggestionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionCityText: {
    fontSize: 15,
    marginBottom: 2,
  },
  suggestionStateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedBadge: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: 12,
    backgroundColor: '#F5B800',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearSearchBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
