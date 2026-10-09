import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import {
  TravelSearchParams,
  DEFAULT_POPULAR_ORIGINS,
  DEFAULT_POPULAR_DESTINATIONS,
  TIME_SLOT_OPTIONS,
  PRICE_RANGE_OPTIONS,
  TRAVEL_TYPE_OPTIONS,
  PASSENGER_OPTIONS,
  getNextDaysList,
  formatJourneyDate,
} from '../screens/customer/travelData';

export interface TravelSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: TravelSearchParams) => void;
  initialParams?: Partial<TravelSearchParams>;
  popularOrigins?: string[];
  popularDestinations?: string[];
}

export default function TravelSearchModal({
  visible,
  onClose,
  onSearch,
  initialParams,
  popularOrigins = DEFAULT_POPULAR_ORIGINS,
  popularDestinations = DEFAULT_POPULAR_DESTINATIONS,
}: TravelSearchModalProps) {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { width } = useWindowDimensions();

  const daysList = useMemo(() => getNextDaysList(10), []);

  const [from, setFrom] = useState<string>(initialParams?.from || '');
  const [to, setTo] = useState<string>(initialParams?.to || '');
  const [selectedDate, setSelectedDate] = useState<string>(
    initialParams?.journeyDate || daysList[0]?.formatted || formatJourneyDate(new Date())
  );
  const [departureTime, setDepartureTime] = useState<string>(
    initialParams?.departureTime || 'all'
  );
  const [priceRange, setPriceRange] = useState<string>(
    initialParams?.priceRange || 'all'
  );
  const [travelType, setTravelType] = useState<string>(
    initialParams?.travelType || 'all'
  );
  const [passengers, setPassengers] = useState<number>(
    initialParams?.passengers || 1
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sync initial params when opened
  React.useEffect(() => {
    if (visible) {
      if (initialParams?.from !== undefined) setFrom(initialParams.from);
      if (initialParams?.to !== undefined) setTo(initialParams.to);
      if (initialParams?.journeyDate) setSelectedDate(initialParams.journeyDate);
      if (initialParams?.departureTime) setDepartureTime(initialParams.departureTime);
      if (initialParams?.priceRange) setPriceRange(initialParams.priceRange);
      if (initialParams?.travelType) setTravelType(initialParams.travelType);
      if (initialParams?.passengers) setPassengers(initialParams.passengers);
      setErrorMessage('');
    }
  }, [visible, initialParams]);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    setErrorMessage('');
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    setSelectedDate(daysList[0]?.formatted || formatJourneyDate(new Date()));
    setDepartureTime('all');
    setPriceRange('all');
    setTravelType('all');
    setPassengers(1);
    setErrorMessage('');
  };

  const handleSearch = () => {
    const cleanFrom = from.trim();
    const cleanTo = to.trim();

    if (cleanFrom && cleanTo && cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setErrorMessage('Departure and destination cannot be the same location.');
      return;
    }

    setErrorMessage('');
    onSearch({
      from: cleanFrom,
      to: cleanTo,
      journeyDate: selectedDate,
      departureTime,
      priceRange,
      travelType,
      passengers,
    });
    onClose();
  };

  const isLight = !isDark;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
                borderColor: isLight ? '#E2E8F0' : '#1E293B',
              },
            ]}
          >
            {/* Header Handle Bar */}
            <View style={styles.handleBar} />

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <View style={[styles.headerIconCircle, { backgroundColor: 'rgba(245, 184, 0, 0.15)' }]}>
                  <Icons.Bus size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                    Plan Your Journey
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                    Search buses, cars & bikes with live availability
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)' },
                ]}
              >
                <Icons.X size={18} color={isLight ? '#475569' : '#CBD5E1'} />
              </TouchableOpacity>
            </View>

            {/* Error Message banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle size={15} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Scrollable Form Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. TRAVEL TYPE SELECTOR */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  TRAVEL TYPE
                </Text>
                <View style={styles.travelTypeRow}>
                  {TRAVEL_TYPE_OPTIONS.map((item) => {
                    const isSelected = travelType.toLowerCase() === item.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => setTravelType(item.id)}
                        style={[
                          styles.travelTypeChip,
                          {
                            backgroundColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#F8FAFC'
                              : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        {item.id === 'Bus' ? (
                          <Icons.Bus size={15} color={isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'} />
                        ) : item.id === 'Car' ? (
                          <Icons.Car size={15} color={isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'} />
                        ) : item.id === 'Bike' ? (
                          <Icons.Bike size={15} color={isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'} />
                        ) : (
                          <Icons.Compass size={15} color={isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'} />
                        )}
                        <Text
                          style={[
                            styles.travelTypeChipText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#334155' : '#E2E8F0',
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. ROUTE (FROM & TO) */}
              <View style={styles.sectionBlock}>
                <View style={styles.routeBoxContainer}>
                  {/* From Field */}
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldIconCol}>
                      <View style={[styles.locDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <View style={styles.fieldInputCol}>
                      <Text style={[styles.fieldMiniLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                        FROM (DEPARTURE)
                      </Text>
                      <TextInput
                        value={from}
                        onChangeText={(txt) => {
                          setFrom(txt);
                          setErrorMessage('');
                        }}
                        placeholder="e.g. Bangalore, Krishnagiri, Dindigul"
                        placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        style={[
                          styles.routeTextInput,
                          { color: isLight ? '#0F172A' : '#F8FAFC' },
                        ]}
                      />
                    </View>
                    {from.length > 0 && (
                      <TouchableOpacity onPress={() => setFrom('')} style={styles.clearBtn}>
                        <Icons.X size={14} color={isLight ? '#94A3B8' : '#64748B'} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Route Divider with Swap button */}
                  <View style={styles.routeDividerRow}>
                    <View
                      style={[
                        styles.routeDividerLine,
                        { backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)' },
                      ]}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSwap}
                      style={[
                        styles.swapButton,
                        {
                          backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
                          borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)',
                        },
                      ]}
                    >
                      <Icons.ArrowUpDown size={14} color="#D97706" />
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.routeDividerLine,
                        { backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)' },
                      ]}
                    />
                  </View>

                  {/* To Field */}
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldIconCol}>
                      <View style={[styles.locDot, { backgroundColor: '#EF4444' }]} />
                    </View>
                    <View style={styles.fieldInputCol}>
                      <Text style={[styles.fieldMiniLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                        TO (DESTINATION)
                      </Text>
                      <TextInput
                        value={to}
                        onChangeText={(txt) => {
                          setTo(txt);
                          setErrorMessage('');
                        }}
                        placeholder="e.g. Salem, Chennai, Madurai"
                        placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        style={[
                          styles.routeTextInput,
                          { color: isLight ? '#0F172A' : '#F8FAFC' },
                        ]}
                      />
                    </View>
                    {to.length > 0 && (
                      <TouchableOpacity onPress={() => setTo('')} style={styles.clearBtn}>
                        <Icons.X size={14} color={isLight ? '#94A3B8' : '#64748B'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Popular Departure quick pills */}
                {popularOrigins.length > 0 && (
                  <View style={styles.quickPillsWrap}>
                    <Text style={[styles.quickPillsTitle, { color: isLight ? '#94A3B8' : '#64748B' }]}>
                      Popular Departures:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
                      {popularOrigins.map((city, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => setFrom(city)}
                          style={[
                            styles.quickCityPill,
                            {
                              backgroundColor: from.toLowerCase() === city.toLowerCase()
                                ? (isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.2)')
                                : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)'),
                              borderColor: from.toLowerCase() === city.toLowerCase()
                                ? '#F5B800'
                                : (isLight ? '#E2E8F0' : 'transparent'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickCityPillText,
                              {
                                color: from.toLowerCase() === city.toLowerCase()
                                  ? '#92400E'
                                  : (isLight ? '#475569' : '#CBD5E1'),
                              },
                            ]}
                          >
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Popular Destination quick pills */}
                {popularDestinations.length > 0 && (
                  <View style={[styles.quickPillsWrap, { marginTop: 6 }]}>
                    <Text style={[styles.quickPillsTitle, { color: isLight ? '#94A3B8' : '#64748B' }]}>
                      Popular Destinations:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
                      {popularDestinations.map((city, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => setTo(city)}
                          style={[
                            styles.quickCityPill,
                            {
                              backgroundColor: to.toLowerCase() === city.toLowerCase()
                                ? (isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)')
                                : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)'),
                              borderColor: to.toLowerCase() === city.toLowerCase()
                                ? '#EF4444'
                                : (isLight ? '#E2E8F0' : 'transparent'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickCityPillText,
                              {
                                color: to.toLowerCase() === city.toLowerCase()
                                  ? '#B91C1C'
                                  : (isLight ? '#475569' : '#CBD5E1'),
                              },
                            ]}
                          >
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. JOURNEY DATE */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Icons.Calendar size={14} color="#D97706" />
                  <Text style={[styles.sectionLabel, { color: isLight ? '#475569' : '#94A3B8', marginBottom: 0 }]}>
                    JOURNEY DATE
                  </Text>
                  <Text style={[styles.selectedDateBadge, { color: '#D97706' }]}>
                    {selectedDate}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateScroll}
                >
                  {daysList.map((d, idx) => {
                    const isSelected = selectedDate === d.formatted;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        onPress={() => setSelectedDate(d.formatted)}
                        style={[
                          styles.dateCard,
                          {
                            backgroundColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#F8FAFC'
                              : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateDayText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8',
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {d.relative || d.dayName}
                        </Text>
                        <Text
                          style={[
                            styles.dateNumText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#0F172A' : '#F8FAFC',
                              fontWeight: '900',
                            },
                          ]}
                        >
                          {d.dateNum}
                        </Text>
                        <Text
                          style={[
                            styles.dateMonthText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#64748B' : '#94A3B8',
                            },
                          ]}
                        >
                          {d.monthName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 4. DEPARTURE TIME */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Icons.Clock size={14} color="#D97706" />
                  <Text style={[styles.sectionLabel, { color: isLight ? '#475569' : '#94A3B8', marginBottom: 0 }]}>
                    DEPARTURE TIME
                  </Text>
                </View>

                <View style={styles.optionsWrap}>
                  {TIME_SLOT_OPTIONS.map((slot) => {
                    const isSelected = departureTime === slot.id;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        activeOpacity={0.8}
                        onPress={() => setDepartureTime(slot.id)}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#F8FAFC'
                              : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#334155' : '#E2E8F0',
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. PRICE RANGE */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Icons.Tag size={14} color="#D97706" />
                  <Text style={[styles.sectionLabel, { color: isLight ? '#475569' : '#94A3B8', marginBottom: 0 }]}>
                    PRICE BUDGET
                  </Text>
                </View>

                <View style={styles.optionsWrap}>
                  {PRICE_RANGE_OPTIONS.map((pr) => {
                    const isSelected = priceRange === pr.id;
                    return (
                      <TouchableOpacity
                        key={pr.id}
                        activeOpacity={0.8}
                        onPress={() => setPriceRange(pr.id)}
                        style={[
                          styles.optionPill,
                          {
                            backgroundColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#F8FAFC'
                              : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#334155' : '#E2E8F0',
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {pr.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. PASSENGERS / SEATS */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Icons.Users size={14} color="#D97706" />
                  <Text style={[styles.sectionLabel, { color: isLight ? '#475569' : '#94A3B8', marginBottom: 0 }]}>
                    PASSENGERS
                  </Text>
                </View>

                <View style={styles.passengersRow}>
                  {PASSENGER_OPTIONS.map((num) => {
                    const isSelected = passengers === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        activeOpacity={0.8}
                        onPress={() => setPassengers(num)}
                        style={[
                          styles.passengerPill,
                          {
                            backgroundColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#F8FAFC'
                              : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected
                              ? '#F5B800'
                              : isLight
                              ? '#E2E8F0'
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.passengerPillText,
                            {
                              color: isSelected ? '#0F172A' : isLight ? '#334155' : '#E2E8F0',
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View
              style={[
                styles.bottomActionsBar,
                {
                  backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
                  borderTopColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleReset}
                activeOpacity={0.75}
                style={[
                  styles.resetBtn,
                  {
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
                  },
                ]}
              >
                <Icons.RotateCcw size={15} color={isLight ? '#475569' : '#CBD5E1'} />
                <Text style={[styles.resetBtnText, { color: isLight ? '#475569' : '#CBD5E1' }]}>
                  Reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.88}
                style={styles.searchBtn}
              >
                <Icons.Search size={18} color="#0F172A" />
                <Text style={styles.searchBtnText}>Search Travel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '92%',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  selectedDateBadge: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  travelTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  travelTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  travelTypeChipText: {
    fontSize: 12,
  },
  routeBoxContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.04)',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  fieldIconCol: {
    width: 20,
    alignItems: 'center',
  },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fieldInputCol: {
    flex: 1,
  },
  fieldMiniLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeTextInput: {
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    padding: 4,
  },
  routeDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  routeDividerLine: {
    flex: 1,
    height: 1,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillsWrap: {
    marginTop: 10,
  },
  quickPillsTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  pillsScroll: {
    gap: 8,
  },
  quickCityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickCityPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dateCard: {
    width: 66,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDayText: {
    fontSize: 10,
    marginBottom: 2,
  },
  dateNumText: {
    fontSize: 17,
  },
  dateMonthText: {
    fontSize: 10.5,
    marginTop: 2,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionPillText: {
    fontSize: 11.5,
  },
  passengersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  passengerPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  passengerPillText: {
    fontSize: 11.5,
  },
  bottomActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5B800',
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
});
