/**
 * Geolocation and Distance Utilities for Healthcare Provider Discovery and Ambulance Tracking
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  label?: string;
  isRealGps: boolean;
}

// Default fallback demo location (Central Mumbai / Dadar)
export const DEFAULT_DEMO_LOCATION: GeoLocation = {
  latitude: 19.0760,
  longitude: 72.8777,
  label: 'Central Mumbai, Maharashtra',
  isRealGps: false,
};

// Known demo healthcare facility coordinates
export const FACILITY_COORDINATES: Record<string, { lat: number; lon: number; area: string }> = {
  'demo-clinic-01': { lat: 19.1176, lon: 72.9060, area: 'Central Ave, Powai' },
  'demo-hospital-01': { lat: 19.0771, lon: 72.9986, area: 'Sector 18, Vashi' },
  'demo-diag-01': { lat: 19.1197, lon: 72.9051, area: 'Galleria Mall, Hiranandani' },
};

/**
 * Calculates Haversine distance between two GPS coordinates in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates average travel time in minutes based on distance in urban conditions (~25-35 km/h).
 */
export function estimateDriveTimeMinutes(distanceKm: number): number {
  if (distanceKm <= 0.5) return 3;
  // Approx 2.5 minutes per km in typical city traffic
  return Math.max(3, Math.round(distanceKm * 2.5));
}

/**
 * Formats a distance value into a friendly human-readable string.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Deterministically generates realistic facility coordinates based on ID / city / address.
 */
export function getFacilityCoordinates(
  facilityId: string,
  city?: string | null,
  address?: string | null
): { lat: number; lon: number } {
  if (FACILITY_COORDINATES[facilityId]) {
    return {
      lat: FACILITY_COORDINATES[facilityId].lat,
      lon: FACILITY_COORDINATES[facilityId].lon,
    };
  }

  // Generate deterministic coordinates near Mumbai center (19.0760, 72.8777)
  let hash = 0;
  const str = `${facilityId}-${city || ''}-${address || ''}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.0015; // ±0.075 deg (~8 km)
  const offsetLon = ((Math.abs(hash >> 2) % 100) - 50) * 0.0015;

  return {
    lat: 19.0760 + offsetLat,
    lon: 72.8777 + offsetLon,
  };
}

/**
 * Requests real device GPS position using browser Geolocation API.
 * Falls back to default demo location if unavailable or denied.
 */
export async function getBrowserLocation(): Promise<GeoLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...DEFAULT_DEMO_LOCATION, isRealGps: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: `${position.coords.latitude.toFixed(4)}° N, ${position.coords.longitude.toFixed(4)}° E`,
          isRealGps: true,
        });
      },
      (error) => {
        console.warn('Browser geolocation prompt skipped or denied:', error.message);
        resolve({ ...DEFAULT_DEMO_LOCATION, isRealGps: false });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}
