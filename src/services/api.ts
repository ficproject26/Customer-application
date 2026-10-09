import { Platform } from 'react-native';
import { API_URL_ANDROID, API_URL_IOS } from './env';

const CONFIGURED_API_URL = Platform.select({
  android: API_URL_ANDROID || 'https://api.ficapp.in/api',
  ios: API_URL_IOS || 'https://api.ficapp.in/api',
  default: 'https://api.ficapp.in/api',
}) || 'https://api.ficapp.in/api';

const CANDIDATE_URLS = [
  CONFIGURED_API_URL,
  'https://api.ficapp.in/api',
];

let activeBackendUrl = CANDIDATE_URLS[0];
let hasDiscoveredHost = false;

export function getActiveBackendUrl(): string {
  return activeBackendUrl;
}

export function resolveImageUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('/uploads/')) {
    const origin = (activeBackendUrl || 'https://api.ficapp.in/api').replace(/\/api\/?$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${cleanPath}`;
  }
  return trimmed;
}

// Fast in-memory SWR cache for GET responses
const apiMemoryCache = new Map<string, { data: any; timestamp: number }>();
// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Background concurrent probe to discover the fastest reachable host
 */
async function probeFastestHost(): Promise<string> {
  const probePromises = CANDIDATE_URLS.map(async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(`${url}/public/banners`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return url;
      }
    } catch {
      clearTimeout(timeoutId);
    }
    throw new Error(`Unreachable: ${url}`);
  });

  try {
    const fastest = await Promise.any(probePromises);
    activeBackendUrl = fastest;
    hasDiscoveredHost = true;
    return fastest;
  } catch {
    hasDiscoveredHost = true;
    return activeBackendUrl;
  }
}

// Kick off probe immediately in background
probeFastestHost().catch(() => {});

// Haversine distance formula
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate intermediate coordinates for maps routing
export function generateInterpolatedRoute(lat1: number, lon1: number, lat2: number, lon2: number, steps = 15): [number, number][] {
  const path: [number, number][] = [];
  const midLat = lat1 + (lat2 - lat1) * 0.45;
  const midLng = lon1 + (lon2 - lon1) * 0.65;

  const controlPoints: [number, number][] = [
    [lat1, lon1],
    [midLat, lon1],
    [midLat, midLng],
    [lat2, midLng],
    [lat2, lon2]
  ];

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const start = controlPoints[i];
    const end = controlPoints[i + 1];
    const segSteps = Math.ceil(steps / 4);
    for (let j = 0; j < segSteps; j++) {
      const t = j / segSteps;
      const lt = start[0] + (end[0] - start[0]) * t;
      const ln = start[1] + (end[1] - start[1]) * t;
      path.push([lt + Math.sin(j) * 0.0001, ln + Math.cos(j) * 0.0001]);
    }
  }
  path.push([lat2, lon2]);
  return path;
}

/**
 * Main API Fetch function that routes directly to MongoDB Atlas Backend with multi-host fallback,
 * in-memory SWR caching, request deduplication, and zero UI-blocking latency.
 */
export const apiFetch = async (endpoint: string, options: any = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const isGetOrHead = method === 'GET' || method === 'HEAD';

  // SWR: For GET requests, if fresh in cache (<= 15s old), return immediately
  const cacheKey = `${method}:${endpoint}`;
  if (isGetOrHead && !options.skipCache) {
    const cached = apiMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 15000) {
      return cached.data;
    }
  }

  // Deduplicate identical concurrent GET requests
  if (isGetOrHead && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const executeFetch = async () => {
    const fetchOptions: any = {
      ...options,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    };

    if (isGetOrHead) {
      delete fetchOptions.body;
    } else if (options.body && typeof options.body !== 'string') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    // Prioritize activeBackendUrl first, then others
    const urlsToTry = [
      activeBackendUrl,
      ...CANDIDATE_URLS.filter((u) => u !== activeBackendUrl),
    ];

    let lastError: any = null;

    for (const baseUrl of urlsToTry) {
      const fullUrl = `${baseUrl}${endpoint}`;
      const controller = new AbortController();
      // 12000ms timeout per host for reliable network transport over mobile/HTTPS
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(fullUrl, {
          signal: controller.signal,
          ...fetchOptions,
        });
        clearTimeout(timeoutId);

        // Successfully connected: cache working host
        activeBackendUrl = baseUrl;

        const contentType = res.headers.get('content-type') || '';
        let responseData: any = null;

        if (contentType.includes('application/json')) {
          const text = await res.text();
          try {
            responseData = text ? JSON.parse(text) : {};
          } catch {
            responseData = { message: text };
          }
        } else {
          const text = await res.text();
          responseData = { message: text };
        }

        if (!res.ok) {
          return responseData || { success: false, error: true, message: `HTTP ${res.status}` };
        }

        // Cache successful GET response in memory
        if (isGetOrHead && responseData) {
          apiMemoryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now(),
          });
        }

        return responseData;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.message && err.message.startsWith('HTTP')) {
          return { success: false, error: true, message: err.message };
        }
      }
    }

    // Return legitimate error response when network or server request fails. No mock fallbacks.
    return {
      status: 'error',
      success: false,
      error: true,
      message: lastError?.message || 'Network request failed. Unable to connect to backend server.',
      data: null,
    };
  };

  if (isGetOrHead) {
    const reqPromise = executeFetch().finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, reqPromise);
    return reqPromise;
  }

  // Invalidate related cache entries on mutations
  apiMemoryCache.clear();
  return executeFetch();
};

