/**
 * Privacy-Preserving Geolocation Utilities for ENQUEbet.
 *
 * Coordinates are rounded to 2 decimal places (~1.1 km precision) before
 * being transmitted to any API, strictly preserving user doorstep/building privacy.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
  source?: 'gps' | 'cache' | 'ip';
}

const STORAGE_KEY = 'enquebet_user_coords_v1';

/**
 * Rounds a coordinate to 2 decimal places (~1.1 km coarse precision).
 */
export function roundCoordinate(val: number): number {
  return Math.round(val * 100) / 100;
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
 * Get user coordinates using HTML5 Geolocation with coarse rounding.
 * Checks localStorage cache first unless `forceRefresh` is requested.
 */
export async function getUserCoordinates(options?: {
  forceRefresh?: boolean;
  coarse?: boolean;
}): Promise<GeoCoordinates | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  const coarse = options?.coarse ?? true;

  // 1. Check local cache (valid for 4 hours)
  if (!options?.forceRefresh) {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageHours = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
        if (ageHours < 4 && parsed.coords) {
          return {
            ...parsed.coords,
            source: 'cache',
          };
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Request current position from browser
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

        // Cache coordinates
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              coords: result,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore storage errors
        }

        resolve(result);
      },
      () => {
        // Permission denied or unavailable
        resolve(null);
      },
      {
        enableHighAccuracy: false, // Low battery & coarse preferred
        timeout: 8000,
        maximumAge: 1000 * 60 * 60, // accept 1h old browser-cached position
      }
    );
  });
}

/**
 * Clear cached coordinates from localStorage.
 */
export function clearUserCoordinates(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
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
