// Port of what_to_wear.py for the web app. Keep the two in step:
// wear.test.mjs checks recommend() against the Python version.

export const DEFAULT_PLACE = "Redmond, WA";
export const DEFAULT_LAT = 47.6740;
export const DEFAULT_LON = -122.1215;

// A clock time for "Other" that is more than this far in the past is taken
// to mean tomorrow.
export const START_GRACE_MS = 30 * 60 * 1000;

// Wardrobe
export const PROLOGO = "Castelli Prologo 7";
export const FONDO = "Castelli Fondo 2";
export const PERFETTO = "Castelli Perfetto RoS 3";
export const CORE_SEAMLESS = "Core Seamless Long Sleeve";
export const EMERGENCY = "Emergency 3 Rain Jacket";
export const BIBS = "Bib shorts";
export const TIGHTS = "Thermowoven Bibtight";
export const KNEE_WARMERS = "Knee warmers";
export const GLOVES = "Castelli Perfetto RoS 2 Gloves";
export const SHOE_COVERS = "Castelli Pioggia 4 Shoecovers";
export const CAP = "Cycling cap / ear coverage";

// Thresholds; see the comment in what_to_wear.py.
const WET_PROBABILITY = 45;        // %
const WET_HOURLY_RAIN = 0.02;      // inches in any one hour
const HEAVY_HOURLY_RAIN = 0.10;    // inches in any one hour
const MAYBE_RAIN_PROBABILITY = 20; // %
const WINDY_SPEED = 12;            // mph sustained
const WINDY_GUSTS = 20;            // mph
const TEMP_SWING = 10;             // °F between coldest and warmest reading

export const FORECAST_DAYS = 3;

export const CARRY_PREFIX = "Carry Emergency 3 in jersey pocket";

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
    daily: "sunrise,sunset",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timeformat: "unixtime",
    timezone: "auto",
    forecast_days: FORECAST_DAYS,
  });
  return getJson("https://api.open-meteo.com/v1/forecast?" + params);
}

/** "Seattle, Washington, US" from an Open-Meteo geocoding result. */
export function placeName(result) {
  const parts = [];
  for (const part of [result.name, result.admin1, result.country_code]) {
    if (part && !parts.includes(part)) parts.push(part);
  }
  return parts.join(", ");
}

/** Look up a place name; returns up to `count` {name, lat, lon} matches. */
export async function geocode(place, count = 5) {
  const params = new URLSearchParams({
    name: place,
    count,
    language: "en",
    format: "json",
  });
  const data = await getJson(
    "https://geocoding-api.open-meteo.com/v1/search?" + params
  );
  return (data.results || []).map((r) => ({
    name: placeName(r),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

async function getJson(url) {
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (e) {
    throw new Error(`Could not reach Open-Meteo: ${e.message}`);
  }
  if (!r.ok) {
    // Open-Meteo explains rejected requests in a JSON "reason" field.
    let reason = `HTTP ${r.status}`;
    try {
      reason = (await r.json()).reason || reason;
    } catch {}
    throw new Error(`Open-Meteo rejected the request: ${reason}`);
  }
  return r.json();
}

/** `start` and the returned times are epoch milliseconds. */
export function rideWeather(data, start, durationHours) {
  const h = data.hourly;
  const times = h.time.map((t) => t * 1000);
  const hour = 60 * 60 * 1000;
  const end = start + durationHours * hour;

  // Temperature and wind are readings at the top of each hour, so use
  // the readings from 30 minutes either side of the ride.
  const instant = indices(times, (t) => start - hour / 2 <= t && t <= end + hour / 2);

  // Precipitation values cover the hour *before* each timestamp, so use
  // every hour that overlaps the ride.
  const preceding = indices(times, (t) => start < t && t < end + hour);

  const values = (name, idx) =>
    idx.map((i) => h[name][i]).filter((v) => v !== null && v !== undefined);

  const temps = values("temperature_2m", instant);
  const feels = values("apparent_temperature", instant);

  if (!temps.length || !feels.length) {
    throw new Error("No forecast data available for that ride window.");
  }

  const max = (xs) => (xs.length ? Math.max(...xs) : 0);

  return {
    low: Math.min(...temps),
    high: Math.max(...temps),
    feels_low: Math.min(...feels),
    rain_probability: max(values("precipitation_probability", preceding)),
    rain_max_hourly: max(values("precipitation", preceding)),
    wind: max(values("wind_speed_10m", instant)),
    gusts: max(values("wind_gusts_10m", instant)),
    partial: end > times[times.length - 1],
  };
}

function indices(xs, keep) {
  const out = [];
  xs.forEach((x, i) => keep(x) && out.push(i));
  return out;
}

/**
 * Returns {layers, notes, carry, band, cold, wet, windy}. `layers` and
 * `notes` match recommend() in what_to_wear.py; `carry` holds the reasons
 * behind the "Carry Emergency 3" note.
 */
export function recommend(w, duration, hasPerfetto = true) {
  const low = w.low;
  const high = w.high;
  const rainProb = w.rain_probability;
  const rainMax = w.rain_max_hourly;

  const wet = rainProb >= WET_PROBABILITY || rainMax >= WET_HOURLY_RAIN;
  const heavyRain = rainMax >= HEAVY_HOURLY_RAIN;
  const maybeRain = !wet && rainProb >= MAYBE_RAIN_PROBABILITY;
  const windy = w.wind >= WINDY_SPEED || w.gusts >= WINDY_GUSTS;
  const short = duration <= 1.0;

  // Use the colder of actual and apparent temperature when choosing.
  const cold = Math.min(low, w.feels_low);

  const layers = [];
  const notes = [];
  const carry = []; // reasons to carry Emergency 3 without wearing it
  let band;

  if (cold >= 61) {
    band = "Summer kit";
    layers.push(PROLOGO, BIBS);
    if (wet) layers.push(EMERGENCY);
  } else if (cold >= 54) {
    band = "Jersey weather";
    layers.push(FONDO, BIBS);
    if (wet) layers.push(EMERGENCY);
    else if (windy) carry.push("wind");
  } else if (cold >= 46) {
    band = hasPerfetto ? "Perfetto weather" : "Cool layers";
    // For short, dry rides, avoid over-layering.
    const skipBase = short && !wet && cold >= 50;

    if (hasPerfetto) {
      if (skipBase) notes.push("Skipped Core Seamless because this is a short ride.");
      else layers.push(CORE_SEAMLESS);
      layers.push(PERFETTO);
      if (heavyRain) layers.push(EMERGENCY);
    } else if (wet) {
      layers.push(CORE_SEAMLESS, FONDO, EMERGENCY);
    } else {
      layers.push(FONDO);
      if (windy) {
        layers.push(EMERGENCY);
        notes.push("Remove Emergency 3 once warmed up.");
      }
    }

    layers.push(BIBS, KNEE_WARMERS, GLOVES);
    if (wet) layers.push(SHOE_COVERS);
  } else if (cold >= 39) {
    band = "Cold kit";
    layers.push(CORE_SEAMLESS);
    if (hasPerfetto) {
      layers.push(PERFETTO);
      if (heavyRain) layers.push(EMERGENCY);
    } else {
      layers.push(FONDO);
      if (wet || windy) layers.push(EMERGENCY);
    }
    layers.push(TIGHTS, GLOVES, SHOE_COVERS);
  } else {
    band = "Deep cold";
    layers.push(CORE_SEAMLESS);
    if (hasPerfetto) {
      layers.push(PERFETTO);
      if (heavyRain) layers.push(EMERGENCY);
    } else {
      layers.push(FONDO, EMERGENCY);
    }
    layers.push(TIGHTS, GLOVES, SHOE_COVERS, CAP);
    notes.push("Below ~39°F you're approaching the lower end of this wardrobe.");
    notes.push(
      "Perfetto RoS 2 gloves are thin for this cold;" +
        " add liner gloves if you have them."
    );
  }

  if (!layers.includes(EMERGENCY)) {
    if (wet) carry.push("rain likely");
    else if (maybeRain) carry.push("chance of rain");

    if (carry.length) notes.push(`${CARRY_PREFIX} (${carry.join(", ")}).`);
  }

  if (high - low >= TEMP_SWING) {
    notes.push(
      `Temperature changes by ${round0(high - low)}°F during the ride;` +
        " wear layers you can take off or put on."
    );
  }

  return { layers, notes, carry, band, cold, wet, windy };
}

/** Python's f"{x:.0f}": halves round to even. */
export function round0(x) {
  const r = Math.round(x);
  return x - Math.floor(x) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

//
// Wall-clock times in the forecast location's time zone
//

const partsFormat = new Map();

/** {year, month (1-12), day, hour, minute} of `ms` in `tz`. */
export function zonedParts(ms, tz) {
  if (!partsFormat.has(tz)) {
    partsFormat.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    }));
  }
  const p = {};
  for (const { type, value } of partsFormat.get(tz).formatToParts(ms)) {
    p[type] = Number(value);
  }
  return p;
}

/** Epoch ms of a wall-clock time in `tz`; `day` may overflow the month. */
export function zonedTime(year, month, day, hour, minute, tz) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (ms) => {
    const p = zonedParts(ms, tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
      Math.floor(ms / 1000) * 1000;
  };
  let ms = wall - offsetAt(wall);
  const corrected = wall - offsetAt(ms);
  if (corrected !== ms) ms = corrected;
  return ms;
}

/** Like resolve_start(): a time already past (beyond the grace) is tomorrow. */
export function resolveClock(hour, minute, now, tz) {
  const t = zonedParts(now, tz);
  const start = zonedTime(t.year, t.month, t.day, hour, minute, tz);
  if (start < now - START_GRACE_MS) {
    return zonedTime(t.year, t.month, t.day + 1, hour, minute, tz);
  }
  return start;
}

/** The next time the clock reads hour:00, today or tomorrow. */
export function nextMorning(hour, now, tz) {
  const t = zonedParts(now, tz);
  const start = zonedTime(t.year, t.month, t.day, hour, 0, tz);
  return start > now ? start : zonedTime(t.year, t.month, t.day + 1, hour, 0, tz);
}
