const BASE_TIMEOUT = 12_000;
const timeout = () => AbortSignal.timeout(BASE_TIMEOUT);
const headers = { "User-Agent": "Verifee/1.0 (travel route and nearby-place lookup)", "Accept-Language": "en" };
const nearbyCache = new Map();
const marketCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimAt = 0;
async function paceNominatim() {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimAt = Date.now();
}
function serializedNominatim(task) {
  const result = nominatimQueue.then(task, task);
  nominatimQueue = result.catch(() => {});
  return result;
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  let rows = [];
  try {
    rows = await serializedNominatim(async () => {
      await paceNominatim();
      const res = await fetch(url, { headers, signal: timeout() });
      if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
      return res.json();
    });
  } catch (err) {
    console.warn("Nominatim geocoder unavailable; trying Photon:", err.message);
  }
  if (rows.length) return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), label: rows[0].display_name };
  // Campus/building names are often missing from Nominatim results. Photon provides a second OSM-based geocoder.
  try {
    const response = await fetch(`https://photon.komoot.io/api/?limit=1&lang=en&q=${encodeURIComponent(query)}`, { headers, signal: timeout() });
    if (response.ok) {
      const data = await response.json();
      const feature = data.features?.[0];
      const coords = feature?.geometry?.coordinates;
      if (coords?.length === 2) {
        const props = feature.properties || {};
        return { lat: Number(coords[1]), lng: Number(coords[0]), label: [props.name, props.street, props.city, props.state, props.country].filter(Boolean).join(", ") };
      }
    }
  } catch (err) {
    console.warn("Photon geocoder fallback unavailable:", err.message);
  }
  throw new Error(`Could not find “${query}”. Try a simpler landmark name or add the city.`);
}

async function route(pickup, destination) {
  const from = await geocode(pickup);
  // Nominatim asks clients to keep search requests at or below one per second.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const to = await geocode(destination);
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=true&steps=false`;
  const res = await fetch(url, { signal: timeout() });
  if (!res.ok) throw new Error("Route service could not calculate this trip.");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No drivable route was found for these places.");
  return { from, to, routes: data.routes.map((r) => ({ distanceKm: r.distance / 1000, durationMinutes: r.duration / 60 })) };
}

const TAGS = {
  all: ['nwr[amenity~"restaurant|cafe|fast_food|bank|pharmacy|hospital|atm|fuel|taxi|bus_station|clinic"]', "nwr[shop]", 'nwr[tourism~"hotel|hostel|guest_house|motel"]'],
  food: 'nwr[amenity~"restaurant|cafe|fast_food|food_court"]',
  hotels: 'nwr[tourism~"hotel|hostel|guest_house|motel"]',
  shops: 'nwr[shop]',
  services: 'nwr[amenity~"pharmacy|hospital|clinic|bank|atm|fuel|taxi|bus_station|police"]',
};

async function nearby(lat, lng, radius, category) {
  const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${category}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const selected = TAGS[category] || TAGS.all;
  const selectors = Array.isArray(selected) ? selected : [selected];
  const query = `[out:json][timeout:15];(${selectors.map((tag) => `${tag}(around:${radius},${lat},${lng});`).join("")});out center tags 40;`;
  let elements;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`, signal: timeout(),
    });
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
    const data = await res.json();
    elements = data.elements || [];
  } catch (overpassError) {
    // Overpass is often rate-limited. Use a bounded Nominatim text search as a fallback.
    const terms = { food: "restaurant", hotels: "hotel", shops: "shop", services: "pharmacy", all: "restaurant shop hotel" };
    const deltaLat = radius / 111000;
    const deltaLng = radius / Math.max(1000, 111000 * Math.cos(lat * Math.PI / 180));
    const viewbox = [lng - deltaLng, lat + deltaLat, lng + deltaLng, lat - deltaLat].join(",");
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=30&addressdetails=1&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(terms[category] || terms.all)}`;
    try {
      const fallback = await serializedNominatim(async () => {
        await paceNominatim();
        const response = await fetch(url, { headers, signal: timeout() });
        if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
        return response.json();
      });
      elements = fallback.map((item, index) => ({
        type: "nominatim", id: item.place_id || index, lat: Number(item.lat), lon: Number(item.lon),
        tags: { name: item.name || item.display_name?.split(",")[0] || "Nearby place", amenity: item.type || item.category },
      }));
    } catch (fallbackError) {
      console.warn("Nearby providers unavailable:", overpassError.message, fallbackError.message);
      throw new Error("Nearby search is temporarily unavailable. Try again in a moment.");
    }
  }
  const result = elements.map((x) => {
    const t = x.tags || {};
    return {
      id: `osm-${x.type}-${x.id}`, name: t.name || t.brand || "Unnamed place",
      category: t.amenity || t.shop || t.tourism || "place",
      address: [t["addr:street"], t["addr:city"]].filter(Boolean).join(", "),
      lat: Number(x.lat ?? x.center?.lat), lng: Number(x.lon ?? x.center?.lon),
      phone: t.phone || t["contact:phone"] || null, website: t.website || t["contact:website"] || null,
      source: "OpenStreetMap", verified: false,
    };
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
  nearbyCache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 });
  return result;
}

// Market discovery should show actual mapped places, not AI-invented ratings,
// opening hours, or trust scores. OSM entries are explicitly unverified.
async function searchMarkets(city = "", query = "", limit = 12) {
  const cleanCity = String(city || "").trim().slice(0, 100);
  const cleanQuery = String(query || "").trim().slice(0, 100);
  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 12));
  const cacheKey = `${cleanCity.toLowerCase()}|${cleanQuery.toLowerCase()}|${safeLimit}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const originQuery = cleanCity || cleanQuery;
  if (!originQuery) return [];
  const origin = await geocode(originQuery);
  const radius = cleanCity ? 25000 : 10000;
  const escapedQuery = cleanQuery.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/[\r\n"]+/g, " ");
  const nameSelector = escapedQuery ? `nwr[\"name\"~\"${escapedQuery}\",i](around:${radius},${origin.lat},${origin.lng});` : "";
  const around = `(around:${radius},${origin.lat},${origin.lng})`;
  const selectors = cleanQuery
    ? nameSelector
    : `nwr[\"amenity\"=\"marketplace\"]${around};nwr[\"shop\"=\"mall\"]${around};nwr[\"landuse\"=\"retail\"]${around};`;
  const ql = `[out:json][timeout:20];(${selectors});out center tags 80;`;
  let elements = [];
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(ql)}`,
      signal: timeout(),
    });
    if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
    elements = (await response.json()).elements || [];
  } catch (err) {
    console.warn("Market map search unavailable:", err.message);
  }

  // Photon fallback keeps discovery useful when the Overpass instance is
  // rate-limited. It returns mapped place records, never synthetic ratings.
  if (!elements.length) {
    try {
      const searchText = [cleanQuery, cleanCity].filter(Boolean).join(", ") || cleanCity || "market";
      const url = `https://photon.komoot.io/api/?limit=${safeLimit}&lang=en&lat=${origin.lat}&lon=${origin.lng}&q=${encodeURIComponent(searchText)}`;
      const response = await fetch(url, { headers, signal: timeout() });
      if (response.ok) {
        const data = await response.json();
        elements = (data.features || []).map((feature, index) => {
          const props = feature.properties || {};
          const [lng, lat] = feature.geometry?.coordinates || [];
          return {
            type: "photon", id: props.osm_id || index, lat, lon: lng,
            tags: {
              name: props.name || props.street || "",
              amenity: props.osm_value === "marketplace" ? "marketplace" : undefined,
              shop: props.osm_value === "mall" ? "mall" : undefined,
              "addr:city": props.city || cleanCity,
              "addr:state": props.state || "",
              "addr:street": props.street || "",
            },
          };
        });
      }
    } catch (err) {
      console.warn("Market Photon fallback unavailable:", err.message);
    }
  }

  let rows = elements.map((element) => {
    const tags = element.tags || {};
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    const name = String(tags.name || tags.brand || "").trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: `osm-${element.type}-${element.id}`,
      name,
      city: tags["addr:city"] || cleanCity || "",
      state: tags["addr:state"] || "",
      category: tags.amenity === "marketplace" ? "Market" : tags.shop === "mall" ? "Shopping centre" : tags.landuse === "retail" ? "Retail area" : "Mapped place",
      description: [tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", "),
      lat,
      lng,
      source: "OpenStreetMap",
      isVerified: false,
      mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    };
  }).filter(Boolean);
  if (cleanQuery) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(cleanQuery.toLowerCase()));
  }
  rows = [...new Map(rows.map((row) => [row.id, row])).values()].slice(0, safeLimit);
  marketCache.set(cacheKey, { data: rows, expiresAt: Date.now() + 10 * 60 * 1000 });
  return rows;
}

const currencyCache = new Map();
async function rates(base) {
  const key = base.toUpperCase();
  const cached = currencyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(key)}`, { signal: timeout() });
  if (!res.ok) throw new Error("Live exchange rates are temporarily unavailable.");
  const data = await res.json();
  const value = { base: data.base, date: data.date, rates: data.rates };
  currencyCache.set(key, { data: value, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
  return value;
}

module.exports = { geocode, route, nearby, searchMarkets, rates };
