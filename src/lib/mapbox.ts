// Thin Mapbox helpers used by the /home-value funnel.
// Uses the Geocoding API v5 (REST, fetch-only — no SDK dependency).
//
// Token is a public access token, safe to inline in client bundles.

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOCODE_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const STATIC_BASE = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static";

export type AddressSuggestion = {
  id: string;
  placeName: string;
  addressLine1: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat: number;
  lng: number;
};

export function isMapboxConfigured(): boolean {
  return !!MAPBOX_TOKEN;
}

// Forward geocode for autocomplete. Returns top suggestions for the query.
// Restricted to US addresses; defaults to ~5 results.
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  if (!MAPBOX_TOKEN) return [];
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url =
    `${GEOCODE_BASE}/${encodeURIComponent(trimmed)}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&country=us` +
    `&types=address` +
    `&autocomplete=true` +
    `&limit=5`;

  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: MapboxFeature[] };
  return (data.features ?? []).map(toSuggestion);
}

// Static map image URL — used to render the "Property Found" preview as an <img>.
// Drops a pin at the address, returns a 2x retina PNG URL.
export function staticMapUrl(
  lat: number,
  lng: number,
  width = 640,
  height = 360,
  zoom = 15,
): string {
  if (!MAPBOX_TOKEN) return "";
  const pin = `pin-l+c1573a(${lng},${lat})`;
  return (
    `${STATIC_BASE}/${pin}/${lng},${lat},${zoom},0/${width}x${height}@2x` +
    `?access_token=${MAPBOX_TOKEN}`
  );
}

// ── Internals ─────────────────────────────────────────────────────────────

type MapboxFeature = {
  id: string;
  place_name: string;
  text: string;
  address?: string;
  geometry: { coordinates: [number, number] };
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

function toSuggestion(f: MapboxFeature): AddressSuggestion {
  const [lng, lat] = f.geometry.coordinates;
  const addressLine1 = f.address ? `${f.address} ${f.text}` : f.text;
  let city: string | undefined;
  let state: string | undefined;
  let postalCode: string | undefined;
  for (const c of f.context ?? []) {
    if (c.id.startsWith("place.")) city = c.text;
    else if (c.id.startsWith("region.")) state = c.short_code?.replace(/^US-/, "") ?? c.text;
    else if (c.id.startsWith("postcode.")) postalCode = c.text;
  }
  return {
    id: f.id,
    placeName: f.place_name,
    addressLine1,
    city,
    state,
    postalCode,
    lat,
    lng,
  };
}
