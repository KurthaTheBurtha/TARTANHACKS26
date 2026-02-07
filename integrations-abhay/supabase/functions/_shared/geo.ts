/**
 * CareMap Integrations — Geospatial Utilities
 * ============================================
 * Helpers for distance calculations and bounding box queries.
 */

/** Earth's radius in miles */
const EARTH_RADIUS_MILES = 3958.8;

/** Degrees to radians */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two points using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Bounding box result for geo queries.
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Calculate a bounding box around a center point.
 * Useful for initial SQL filtering before precise distance calc.
 *
 * @param lat Center latitude
 * @param lng Center longitude
 * @param radiusMiles Radius in miles
 * @returns Bounding box coordinates
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusMiles: number
): BoundingBox {
  // Approximate degrees per mile at this latitude
  const latDegPerMile = 1 / 69.0; // ~69 miles per degree latitude
  const lngDegPerMile = 1 / (69.0 * Math.cos(toRadians(lat))); // Varies with latitude

  const latDelta = radiusMiles * latDegPerMile;
  const lngDelta = radiusMiles * lngDegPerMile;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Convert miles to meters (for Places API).
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

/**
 * Convert meters to miles.
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}
