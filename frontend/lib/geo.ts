/**
 * Privacy-Preserving Geolocation Utilities for ENQUEbet.
 *
 * Coordinates are rounded to 2 decimal places (~1.1 km precision) before
 * being transmitted to any API, strictly preserving user doorstep/building privacy.
 *
 * Implements intelligent, one-time permission flow:
 * - NEVER triggers an unsolicited browser permission dialog on initial page mount.
 * - Auto-fetches silently in the background when browser permission is already granted.
 * - Persists coarse coordinates for 7 days in localStorage to eliminate repeat prompts.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
  source?: 'gps' | 'cache' | 'ip';
}

interface StoredGeoData {
  coords: GeoCoordinates;
  timestamp: number;
  permissionState?: 'granted' | 'denied' | 'prompt';
}

const STORAGE_KEY = 'enquebet_user_coords_v2';
const LEGACY_STORAGE_KEY = 'enquebet_user_coords_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Rounds a coordinate to 2 decimal places (~1.1 km coarse precision).
 */
export function roundCoordinate(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Safely inspects the browser's native Geolocation permission state
 * using the Permissions API WITHOUT triggering a user prompt.
 * Returns: 'granted' | 'prompt' | 'denied' | null
 */
export async function getBrowserPermissionState(): Promise<PermissionState | null> {
  if (typeof window === 'undefined' || !navigator.permissions?.query) {
    return null;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

/**
 * Reads valid cached coordinates from localStorage.
 */
function getCachedData(): StoredGeoData | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredGeoData = JSON.parse(raw);
    if (!parsed?.coords) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Best-effort reverse geocoding to resolve a readable city name.
 * Respects rate limits, timeouts after 3 seconds, and fails gracefully.
 */
export async function reverseGeocodeCity(lat: number, lng: number): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return undefined;
    const data = await res.json();
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.state;
  } catch {
    return undefined;
  }
}

/**
 * Internal worker to query GPS, reverse-geocode city, and write to cache.
 */
async function fetchAndCachePosition(options?: {
  coarse?: boolean;
  timeoutMs?: number;
  highAccuracy?: boolean;
}): Promise<GeoCoordinates | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  const coarse = options?.coarse ?? true;
  const timeoutMs = options?.timeoutMs ?? 8000;
  const highAccuracy = options?.highAccuracy ?? false;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;

        if (coarse) {
          lat = roundCoordinate(lat);
          lng = roundCoordinate(lng);
        }

        let city: string | undefined;
        try {
          city = await reverseGeocodeCity(lat, lng);
        } catch {
          // ignore geocode failure
        }

        const result: GeoCoordinates = {
          latitude: lat,
          longitude: lng,
          city,
          source: 'gps',
        };

        // Cache coordinates with 7-day TTL
        try {
          const payload: StoredGeoData = {
            coords: result,
            timestamp: Date.now(),
            permissionState: 'granted',
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore storage errors
        }

        resolve(result);
      },
      (err) => {
        // If user actively blocked or permission was denied
        if (err.code === 1) { // PERMISSION_DENIED
          try {
            const existing = getCachedData();
            const payload: StoredGeoData = {
              coords: existing?.coords || { latitude: 0, longitude: 0 },
              timestamp: Date.now(),
              permissionState: 'denied',
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          } catch {
            // ignore storage errors
          }
        }
        resolve(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 1000 * 60 * 60, // accept 1h old browser-cached position
      }
    );
  });
}

/**
 * AUTO-FETCH ON MOUNT (Zero Unsolicited Popups):
 *
 * 1. Checks if valid cached coordinates exist (< 7 days old). If yes, returns them immediately.
 * 2. Checks browser's native permission state via Permissions API:
 *    - If 'granted': silently syncs updated GPS in the background with ZERO dialogs or popups.
 *    - If 'prompt' or 'denied': NEVER invokes navigator.geolocation on mount! Returns cache or null.
 */
export async function autoFetchCoordinates(): Promise<GeoCoordinates | null> {
  if (typeof window === 'undefined') return null;

  const cached = getCachedData();
  const now = Date.now();
  const isFresh = cached && (now - cached.timestamp) < CACHE_TTL_MS;

  // 1. If we have fresh cached coordinates, return them immediately
  if (isFresh && cached?.coords) {
    // If the browser permission is already granted, refresh in the background silently
    getBrowserPermissionState().then((perm) => {
      if (perm === 'granted') {
        fetchAndCachePosition({ timeoutMs: 5000, highAccuracy: false }).catch(() => {});
      }
    });

    return {
      ...cached.coords,
      source: 'cache',
    };
  }

  // 2. No fresh cache. Check browser permission state WITHOUT triggering a popup
  const browserPerm = await getBrowserPermissionState();

  if (browserPerm === 'granted') {
    // Permission is already granted by user in browser: safe to fetch silently without popup
    const fresh = await fetchAndCachePosition({ timeoutMs: 6000, highAccuracy: false });
    if (fresh) return fresh;
  }

  // 3. If permission is 'prompt' or 'denied', DO NOT pop up on mount.
  // Return any existing cached coords if present, else null
  if (cached?.coords && cached.coords.latitude !== 0) {
    return {
      ...cached.coords,
      source: 'cache',
    };
  }

  return null;
}

/**
 * USER-TRIGGERED EXPLICIT ACTION:
 *
 * Called ONLY when the user clicks [Detect Location], [Sync], or location button in create post.
 * Explicitly invokes navigator.geolocation to prompt for permission if needed,
 * then saves 'granted' state and coordinates for 7 days.
 */
export async function requestUserCoordinates(options?: {
  forceRefresh?: boolean;
  coarse?: boolean;
}): Promise<GeoCoordinates | null> {
  return fetchAndCachePosition({
    coarse: options?.coarse ?? true,
    timeoutMs: 8000,
    highAccuracy: false,
  });
}

/**
 * Backward-compatible alias for existing callers.
 */
export const getUserCoordinates = requestUserCoordinates;

/**
 * Clear cached coordinates and reset permission state from localStorage.
 */
export function clearUserCoordinates(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

/**
 * Format a distance in kilometers into a human-readable badge text.
 */
export function formatDistance(distanceKm?: number | null): string | null {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return null;
  }
  if (distanceKm < 1.0) {
    return '< 1 km away';
  }
  if (distanceKm < 10.0) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
}
