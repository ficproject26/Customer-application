import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useThemeStore } from '../store/themeStore';

const { width } = Dimensions.get('window');

// Force custom Simulated Vector Map mode for rock-solid stability and zero-crash live tracking
let NativeMapView: any = null;
let NativeMarker: any = null;
let NativePolyline: any = null;

interface MapComponentProps {
  riderLat: number;
  riderLng: number;
  vendorLat: number;
  vendorLng: number;
  customerLat: number;
  customerLng: number;
  route: [number, number][];
  distance: number;
  eta: number;
  riderName?: string;
  customerName?: string;
}

export default function MapComponent({
  riderLat,
  riderLng,
  vendorLat,
  vendorLng,
  customerLat,
  customerLng,
  route,
  distance,
  eta,
  riderName = 'Rider',
  customerName = 'Customer'
}: MapComponentProps) {

  // Helper for safe coordinate parsing
  const safeNum = (val: any, fallback: number) => {
    const num = Number(val);
    return !isNaN(num) && isFinite(num) && num !== 0 ? num : fallback;
  };

  const sVendorLat = safeNum(vendorLat, 12.9348);
  const sVendorLng = safeNum(vendorLng, 77.6189);
  const sCustomerLat = safeNum(customerLat, 12.9716);
  const sCustomerLng = safeNum(customerLng, 77.6412);
  const sRiderLat = safeNum(riderLat, 12.9498);
  const sRiderLng = safeNum(riderLng, 77.6289);
  const safeDistance = safeNum(distance, 4.2);
  const safeEta = safeNum(eta, 15);
  const safeRoute = Array.isArray(route)
    ? route.filter((c) => Array.isArray(c) && c.length >= 2 && !isNaN(Number(c[0])) && !isNaN(Number(c[1])))
    : [];

  // Reanimated values for simulated pulse rings on pins
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - pulse.value,
      transform: [{ scale: pulse.value * 2.2 }],
    };
  });

  // If react-native-maps is available, render Google Maps
  if (NativeMapView && NativeMarker) {
    const latDiff = Math.abs(sVendorLat - sCustomerLat);
    const lngDiff = Math.abs(sVendorLng - sCustomerLng);
    const initialRegion = {
      latitude: (sVendorLat + sCustomerLat) / 2,
      longitude: (sVendorLng + sCustomerLng) / 2,
      latitudeDelta: Math.max(latDiff * 1.5, 0.04),
      longitudeDelta: Math.max(lngDiff * 1.5, 0.04),
    };

    const nativeCoordsRoute = safeRoute.map((coord) => ({
      latitude: Number(coord[0]),
      longitude: Number(coord[1]),
    }));

    return (
      <View style={styles.mapWrapper}>
        <NativeMapView
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          customMapStyle={darkMapStyle}
        >
          {/* Vendor Marker */}
          <NativeMarker coordinate={{ latitude: sVendorLat, longitude: sVendorLng }} title="Vendor / Origin">
            <View style={[styles.markerPin, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.markerEmoji}>🏪</Text>
            </View>
          </NativeMarker>

          {/* Customer Marker */}
          <NativeMarker coordinate={{ latitude: sCustomerLat, longitude: sCustomerLng }} title={`Destination (${customerName})`}>
            <View style={[styles.markerPin, { backgroundColor: '#10B981' }]}>
              <Text style={styles.markerEmoji}>🏠</Text>
            </View>
          </NativeMarker>

          {/* Rider Marker */}
          <NativeMarker coordinate={{ latitude: sRiderLat, longitude: sRiderLng }} title={`${riderName} (Rider)`}>
            <View style={[styles.markerPin, { backgroundColor: '#F4C400' }]}>
              <Text style={styles.markerEmoji}>🚲</Text>
            </View>
          </NativeMarker>

          {/* Route path */}
          {nativeCoordsRoute.length > 0 && (
            <NativePolyline
              coordinates={nativeCoordsRoute}
              strokeColor="#3B82F6"
              strokeWidth={4}
              lineDashPattern={[6, 6]}
            />
          )}
        </NativeMapView>
      </View>
    );
  }

  // --- VECTOR SIMULATED MAP FALLBACK ---
  // Map coordinates dynamically to pixel spaces on a 300x300 canvas
  const allLats = [sVendorLat, sCustomerLat, sRiderLat, ...(safeRoute.map(c => Number(c[0])).filter(n => !isNaN(n) && n !== 0))];
  const allLngs = [sVendorLng, sCustomerLng, sRiderLng, ...(safeRoute.map(c => Number(c[1])).filter(n => !isNaN(n) && n !== 0))];
  const bMinLat = Math.min(...allLats) - 0.004;
  const bMaxLat = Math.max(...allLats) + 0.004;
  const bMinLng = Math.min(...allLngs) - 0.004;
  const bMaxLng = Math.max(...allLngs) + 0.004;

  const getCanvasCoords = (lat: number, lng: number) => {
    const safeL = safeNum(lat, sVendorLat);
    const safeG = safeNum(lng, sVendorLng);

    const latSpan = Math.max(bMaxLat - bMinLat, 0.008);
    const lngSpan = Math.max(bMaxLng - bMinLng, 0.008);

    const rawX = ((safeG - bMinLng) / lngSpan) * 240 + 30;
    const rawY = 300 - (((safeL - bMinLat) / latSpan) * 240 + 30);

    const x = Math.min(Math.max(isNaN(rawX) ? 140 : rawX, 24), 276);
    const y = Math.min(Math.max(isNaN(rawY) ? 140 : rawY, 24), 276);

    return { x, y };
  };

  const vCoord = getCanvasCoords(sVendorLat, sVendorLng);
  const cCoord = getCanvasCoords(sCustomerLat, sCustomerLng);
  const rCoord = getCanvasCoords(sRiderLat, sRiderLng);

  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);

  // Translate route arrays to SVG Polyline points
  const svgRoutePoints = safeRoute
    .map((c) => {
      const p = getCanvasCoords(c[0], c[1]);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const mapBgColor = isDark ? '#050B1E' : '#F6EFE2';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(16, 24, 39, 0.05)';
  const pinBorderColor = isDark ? '#050B1E' : '#FFFFFF';

  return (
    <View style={[styles.simContainer, { backgroundColor: mapBgColor, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : (colors.cardBorder || '#E8DEC8') }]}>
      {/* Dynamic Themed Grid & Paths */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300">
          <Rect width="300" height="300" fill={mapBgColor} />
          
          {/* Constellation / Street Grid */}
          <G stroke={gridColor} strokeWidth="1">
            <Line x1="50" y1="0" x2="50" y2="300" />
            <Line x1="100" y1="0" x2="100" y2="300" />
            <Line x1="150" y1="0" x2="150" y2="300" />
            <Line x1="200" y1="0" x2="200" y2="300" />
            <Line x1="250" y1="0" x2="250" y2="300" />
            <Line x1="0" y1="50" x2="300" y2="50" />
            <Line x1="0" y1="100" x2="300" y2="100" />
            <Line x1="0" y1="150" x2="300" y2="150" />
            <Line x1="0" y1="200" x2="300" y2="200" />
            <Line x1="0" y1="250" x2="300" y2="250" />
          </G>

          {/* Dotted Route Path */}
          {svgRoutePoints ? (
            <Path
              d={`M ${svgRoutePoints}`}
              stroke="#2563EB"
              strokeWidth="3.5"
              strokeDasharray="5,6"
              fill="none"
            />
          ) : (
            <Line
              x1={vCoord.x} y1={vCoord.y}
              x2={cCoord.x} y2={cCoord.y}
              stroke="#2563EB"
              strokeWidth="3.5"
              strokeDasharray="5,6"
            />
          )}

          {/* Vendor Node */}
          <Circle cx={vCoord.x} cy={vCoord.y} r="16" fill="rgba(139, 92, 246, 0.18)" stroke="#8B5CF6" strokeWidth="1.8" />
          
          {/* Customer Node */}
          <Circle cx={cCoord.x} cy={cCoord.y} r="16" fill="rgba(16, 185, 129, 0.18)" stroke="#10B981" strokeWidth="1.8" />
        </Svg>
      </View>

      {/* Simulated Pulsating Glows and Pins */}
      {/* Vendor */}
      <View style={[styles.simPin, { left: vCoord.x - 14, top: vCoord.y - 14, backgroundColor: '#8B5CF6', borderColor: pinBorderColor }]}>
        <Text style={styles.simEmoji}>🏪</Text>
      </View>

      {/* Customer */}
      <View style={[styles.simPin, { left: cCoord.x - 14, top: cCoord.y - 14, backgroundColor: '#10B981', borderColor: pinBorderColor }]}>
        <Text style={styles.simEmoji}>🏠</Text>
      </View>

      {/* Rider with Pulse Rings */}
      <View style={{ position: 'absolute', left: rCoord.x - 16, top: rCoord.y - 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
        <View style={[styles.simPin, { position: 'relative', left: 0, top: 0, backgroundColor: '#F59E0B', borderColor: pinBorderColor }]}>
          <Text style={styles.simEmoji}>🚲</Text>
        </View>
      </View>

      {/* Dashboard Metrics Overlay */}
      <View style={[styles.metricsBox, { backgroundColor: isDark ? 'rgba(5, 11, 30, 0.88)' : 'rgba(255, 255, 255, 0.94)', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0' }]}>
        <Text style={[styles.metricsTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>GPS Live Delivery Route Map</Text>
        <View style={styles.metricsRow}>
          <View>
            <Text style={[styles.metricsLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Distance</Text>
            <Text style={[styles.metricsVal, { color: isDark ? '#FFFFFF' : '#101827' }]}>{safeDistance.toFixed(2)} KM</Text>
          </View>
          <View style={[styles.verticalBorder, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0' }]} />
          <View>
            <Text style={[styles.metricsLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>ETA</Text>
            <Text style={[styles.metricsVal, { color: isDark ? '#FFFFFF' : '#101827' }]}>{safeEta} MINS</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#050B1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 14,
  },
  simContainer: {
    flex: 1,
    backgroundColor: '#050B1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
    height: 300,
  },
  simPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#050B1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  simEmoji: {
    fontSize: 13,
  },
  pulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 196, 0, 0.35)',
    borderWidth: 1,
    borderColor: '#F4C400',
  },
  metricsBox: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(5, 11, 30, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 10,
  },
  metricsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#F4C400',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricsLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metricsVal: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'black',
    textAlign: 'center',
    marginTop: 2,
  },
  verticalBorder: {
    height: 20,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

// Custom dark mode theme configurations for Google Maps API
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e2735" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e2735" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f282d" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];
