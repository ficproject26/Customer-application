export interface TravelRideItem {
  id: string;
  name: string;
  operator: string;
  type: 'Bus' | 'Car' | 'Bike';
  subType: string;
  subcategory?: string;
  busType?: string;
  desc?: string;
  route?: string;
  from: string;
  to: string;
  departureTime: string;
  departureSlot?: string;
  arrivalTime: string;
  duration: string;
  price: number;
  priceNum?: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  seatsLeft: number;
  capacity?: string;
  boardingPoints: string[];
  droppingPoints: string[];
  amenities: string[];
  badge?: string;
  image: string;
  vehicleNumber?: string;
  isActive: boolean;
  status: string;
  rawProduct: any;
}

export interface TravelSearchParams {
  from: string;
  to: string;
  journeyDate: string; // e.g. "09 Oct 2026"
  departureTime: string; // 'all' | 'morning' | 'afternoon' | 'evening' | 'night'
  priceRange: string; // 'all' | 'under-500' | '500-2000' | 'above-2000' | 'custom'
  minPrice?: number;
  maxPrice?: number;
  travelType: string; // 'all' | 'Bus' | 'Car' | 'Bike'
  passengers: number; // 1, 2, 3, etc.
}

export const DEFAULT_POPULAR_ORIGINS = [
  'Bangalore',
  'Krishnagiri',
  'Dindigul',
  'Trichy',
  'Coimbatore',
];

export const DEFAULT_POPULAR_DESTINATIONS = [
  'Salem',
  'Chennai',
  'Madurai',
  'Dindigul',
  'Gandhipuram',
];

export const TRAVEL_TYPE_OPTIONS = [
  { id: 'all', label: 'All Travel' },
  { id: 'Bus', label: 'Bus' },
  { id: 'Car', label: 'Car / Cab' },
  { id: 'Bike', label: 'Bike' },
];

export const TIME_SLOT_OPTIONS = [
  { id: 'all', label: 'Any Time' },
  { id: 'morning', label: 'Morning (6 AM - 12 PM)' },
  { id: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
  { id: 'evening', label: 'Evening (6 PM - 12 AM)' },
  { id: 'night', label: 'Night (12 AM - 6 AM)' },
];

export const PRICE_RANGE_OPTIONS = [
  { id: 'all', label: 'Any Budget' },
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-2000', label: '₹500 - ₹2,000' },
  { id: 'above-2000', label: 'Above ₹2,000' },
];

export const PASSENGER_OPTIONS = [1, 2, 3, 4, 5, 6];

export const LOCATION_ALIASES: Record<string, string> = {
  bangalore: 'bangalore',
  bengaluru: 'bangalore',
  banglore: 'bangalore',
  chennai: 'chennai',
  madras: 'chennai',
  coimbatore: 'coimbatore',
  coiambatore: 'coimbatore',
  kovai: 'coimbatore',
  dindigul: 'dindigul',
  trichy: 'trichy',
  tiruchirappalli: 'trichy',
  salem: 'salem',
  madurai: 'madurai',
  krishnagiri: 'krishnagiri',
  gandhipuram: 'gandhipuram',
  goa: 'goa',
  mysore: 'mysore',
  mysuru: 'mysore',
  hyderabad: 'hyderabad',
  mumbai: 'mumbai',
  delhi: 'delhi',
  coorg: 'coorg',
  ooty: 'ooty',
  kochi: 'kochi',
};

export function normalizeLocationName(loc: string): string {
  if (!loc) return '';
  const clean = loc.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return canonical;
    }
  }
  return clean;
}

export function matchesLocation(actual: string, query: string, subLocations: string[] = []): boolean {
  if (!query || !query.trim()) return true;
  const normQuery = normalizeLocationName(query);
  const normActual = normalizeLocationName(actual);
  if (normActual && normQuery && (normActual === normQuery || normActual.includes(normQuery) || normQuery.includes(normActual))) {
    return true;
  }
  const qLower = query.toLowerCase().trim();
  if (actual && actual.toLowerCase().includes(qLower)) return true;

  if (Array.isArray(subLocations)) {
    for (const sub of subLocations) {
      if (!sub) continue;
      const normSub = normalizeLocationName(sub);
      if (normSub && normQuery && (normSub === normQuery || normSub.includes(normQuery) || normQuery.includes(normSub))) {
        return true;
      }
      if (sub.toLowerCase().includes(qLower)) return true;
    }
  }
  return false;
}

export function parseTimeToHour(timeStr: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim().toLowerCase();
  const m12 = str.match(/(\d{1,2})[:.]?(\d{2})?\s*(am|pm)/);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const isPm = m12[3] === 'pm';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return hour;
  }
  const m24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (m24) {
    return parseInt(m24[1], 10);
  }
  return null;
}

export function matchesDepartureTimeSlot(departureTimeStr: string, slot: string): boolean {
  if (!slot || slot.toLowerCase() === 'all' || slot.toLowerCase() === 'any time' || slot.toLowerCase() === 'any') return true;
  const hour = parseTimeToHour(departureTimeStr);
  if (hour === null) return true;
  const s = slot.toLowerCase();
  if (s.includes('morning')) return hour >= 6 && hour < 12;
  if (s.includes('afternoon')) return hour >= 12 && hour < 18;
  if (s.includes('evening')) return hour >= 18 && hour < 24;
  if (s.includes('night')) return hour >= 0 && hour < 6;
  return true;
}

export function matchesPriceBudget(price: number, range: string, minPrice?: number, maxPrice?: number): boolean {
  if (minPrice !== undefined && minPrice !== null && price < minPrice) return false;
  if (maxPrice !== undefined && maxPrice !== null && maxPrice > 0 && price > maxPrice) return false;

  const r = (range || '').toLowerCase();
  if (!r || r === 'all' || r === 'any budget' || r === 'any') return true;
  if (r === 'under-500' || r.includes('under 500')) return price < 500;
  if (r === '500-2000' || r.includes('500 - 2000') || r.includes('500-2000')) return price >= 500 && price <= 2000;
  if (r === 'above-2000' || r.includes('above 2000')) return price > 2000;
  return true;
}

export function formatJourneyDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getNextDaysList(count = 7): { dateNum: string; dayName: string; monthName: string; formatted: string; relative?: string }[] {
  const result = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = dayNames[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthName = monthNames[d.getMonth()];
    const formatted = `${dateNum} ${monthName} ${d.getFullYear()}`;
    const relative = i === 0 ? 'Today' : i === 1 ? 'Tmr' : undefined;
    result.push({ dateNum, dayName, monthName, formatted, relative });
  }
  return result;
}

export function isRealTravelProduct(p: any): boolean {
  if (!p) return false;
  if (p.vendorIsActive === false || p.isVendorSuspended === true || p.isSuspended === true) return false;
  const vStatus = (p.vendorStatus || p.vendor_status || '').toString().toLowerCase().trim();
  if (['suspended', 'inactive', 'rejected', 'deactivated', 'blocked'].includes(vStatus)) return false;

  if (p.isActive === false || p.isAvailable === false) return false;
  const pStatus = (p.status || p.availability || '').toString().toLowerCase().trim();
  if (['out of stock', 'inactive', 'suspended', 'blocked', 'unavailable'].includes(pStatus)) return false;

  const main = (p.mainCategory || p.subNavbarCategory || '').toString().toLowerCase();
  const cat = (p.category || p.vendorType || '').toString().toLowerCase();
  const sub = (p.subcategory || p.subCategory || '').toString().toLowerCase();

  const isMainTravel = main === 'travel' || main.includes('travel');
  const isCatTravel = cat === 'travel' || cat === 'bus' || cat === 'car' || cat === 'bike' || cat.includes('travel') || cat.includes('bus') || cat.includes('cab');
  const isSubTravel = sub.includes('bus') || sub.includes('car') || sub.includes('bike') || sub.includes('travel') || sub.includes('sleeper');
  const hasTravelFields = !!(p.boardingPoint || p.dropPoint || p.boardingTime || p.arrivalTime || p.busSchedule || p.busTiming);

  return isMainTravel || isCatTravel || isSubTravel || hasTravelFields;
}

export function mapProductToTravelItem(p: any): TravelRideItem {
  const cat = (p.category || p.vendorType || '').toString().toLowerCase();
  const sub = (p.subcategory || p.subCategory || '').toString().toLowerCase();
  const name = (p.name || '').toString().toLowerCase();

  let vType: 'Bus' | 'Car' | 'Bike' = 'Bus';
  if (cat.includes('bike') || sub.includes('bike') || name.includes('bike')) {
    vType = 'Bike';
  } else if (cat.includes('car') || cat.includes('cab') || sub.includes('car') || name.includes('car')) {
    vType = 'Car';
  }

  let boardingPointsList: string[] = [];
  if (Array.isArray(p.boardingPoints) && p.boardingPoints.length > 0) {
    boardingPointsList = p.boardingPoints.map((bp: any) =>
      typeof bp === 'string' ? bp : `${bp.name || bp.city || bp.point || 'Boarding Point'}${bp.time ? ` (${bp.time})` : ''}`
    );
  } else if (p.boardingPoint) {
    boardingPointsList = [`${p.boardingPoint}${p.boardingTime ? ` (${p.boardingTime})` : ''}`];
  }

  let droppingPointsList: string[] = [];
  if (Array.isArray(p.droppingPoints) && p.droppingPoints.length > 0) {
    droppingPointsList = p.droppingPoints.map((dp: any) =>
      typeof dp === 'string' ? dp : `${dp.name || dp.city || dp.point || 'Dropping Point'}${dp.time ? ` (${dp.time})` : ''}`
    );
  } else if (p.dropPoint) {
    droppingPointsList = [`${p.dropPoint}${p.arrivalTime ? ` (${p.arrivalTime})` : ''}`];
  }

  const rawOrigin = p.from || p.origin || p.fromCity || p.boardingPoint || (boardingPointsList[0]?.split('(')[0]?.trim() || '');
  const rawDestination = p.to || p.destination || p.toCity || p.dropPoint || (droppingPointsList[0]?.split('(')[0]?.trim() || '');

  const operatorName = p.operator || p.operatorName || p.vendorName || p.companyName || p.businessName || 'Verified Travels';
  const resolvedSub = p.subcategory || p.subCategory || p.busType || p.subType || (vType === 'Bus' ? 'AC Sleeper' : vType === 'Car' ? 'AC Car' : 'Rental Bike');

  const numPrice = typeof p.price === 'number' ? p.price : (parseInt(String(p.price || '0').replace(/[^\d]/g, ''), 10) || 0);
  const numOrig = typeof p.originalPrice === 'number' ? p.originalPrice : (parseInt(String(p.originalPrice || '0').replace(/[^\d]/g, ''), 10) || undefined);

  const stock = typeof p.stock === 'number' ? p.stock : (parseInt(String(p.stock || '10'), 10) || 10);

  const amenities = Array.isArray(p.amenities) && p.amenities.length > 0
    ? p.amenities
    : (Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0 ? p.selectedAmenities : ['AC', 'Live GPS Tracking', 'Verified Driver']);

  const departureTime = p.boardingTime || p.departureTime || p.busTiming || (vType === 'Bus' ? '10:30 PM' : 'Direct Booking');
  const arrivalTime = p.arrivalTime || 'Next Morning';
  const duration = p.distance ? `${p.distance} • ${p.busTiming || 'Direct'}` : (p.busTiming || p.duration || 'Express Journey');

  return {
    id: p._id || p.id || `trv_${Date.now()}`,
    name: p.name || `${operatorName} ${vType}`,
    operator: operatorName,
    type: vType,
    subType: resolvedSub,
    subcategory: resolvedSub,
    busType: resolvedSub,
    desc: p.description || p.desc || 'Quality travel service verified by Connect',
    route: `${rawOrigin} ➔ ${rawDestination}`,
    from: rawOrigin,
    to: rawDestination,
    departureTime,
    arrivalTime,
    duration,
    price: numPrice,
    priceNum: numPrice,
    originalPrice: numOrig,
    rating: Number(p.rating || 4.5),
    reviewsCount: Number(p.reviews || p.ratingCount || 12),
    seatsLeft: stock,
    capacity: vType === 'Car' ? '4 Passengers' : vType === 'Bike' ? '2 Riders' : `${stock} Berths`,
    boardingPoints: boardingPointsList,
    droppingPoints: droppingPointsList,
    amenities,
    badge: p.badge || (stock <= 3 ? 'Few Seats Left' : 'Verified Operator'),
    image: p.image || p.imageUrl || '',
    vehicleNumber: p.vehicleNumber || p.vehicleRegNo || p.busNumber || '',
    isActive: p.isActive !== false,
    status: p.status || 'Available',
    rawProduct: p,
  };
}
