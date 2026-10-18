import * as wear from "./wear.js";

// Silhouettes in a 48×48 box, shown until there is a photo.
const SHAPES = {
  jersey: "M17 6 L24 9 L31 6 L42 13 L38 21 L34 19 L34 42 L14 42 L14 19 L10 21 L6 13 Z",
  longsleeve: "M17 6 L24 9 L31 6 L40 11 L45 36 L39 37 L34 20 L34 42 L14 42 L14 20 L9 37 L3 36 L8 11 Z",
  bibs: "M16 4 L19 4 L20 18 L28 18 L29 4 L32 4 L33 18 L35 34 L26 36 L24 28 L22 36 L13 34 L15 18 Z",
  tights: "M16 4 L19 4 L20 14 L28 14 L29 4 L32 4 L33 14 L34 44 L27 44 L24 24 L21 44 L14 44 L15 14 Z",
  warmers: "M13 8 L21 8 L20 40 L14 40 Z M27 8 L35 8 L34 40 L28 40 Z",
  gloves: "M14 44 L14 26 L11 20 L13 18 L17 22 L17 10 Q17 8 19 8 Q21 8 21 10 L21 20 L22 7 Q22 5 24 5 Q26 5 26 7 L26 20 L27 9 Q27 7 29 7 Q31 7 31 9 L31 21 L32 13 Q32 11 34 11 Q36 11 36 13 L35 30 L33 44 Z",
  shoecover: "M10 8 L22 8 L22 28 L40 32 Q44 34 43 38 L42 40 L8 40 Z",
  cap: "M8 30 Q8 14 24 14 Q38 14 38 28 L46 31 L44 34 L8 34 Z",
};

const GENERIC_COLORS = [
  { name: "White", hex: "#F4F4F2" },
  { name: "Black", hex: "#1E1F21" },
  { name: "Grey", hex: "#5B6068" },
  { name: "Red", hex: "#C1272D" },
  { name: "Blue", hex: "#2A4E9B" },
  { name: "Fluo yellow", hex: "#D7E33B" },
];

// Castelli colorway names; hexes are approximate. `accent` is a second
// color (chest band or reflective trim) shown on the swatch.
const BLACK_ONLY = [{ name: "Black", hex: "#1A1A1A" }];

const PROLOGO_COLORS = [
  { name: "Light Black/Silver Gray-Ivory", hex: "#2B2B2D", accent: "#C9CACC" },
  { name: "Ivory/Light Black-Red", hex: "#EDE9DC", accent: "#2B2B2D" },
  { name: "Savile Blue/Silver Gray-Red", hex: "#2C3E66", accent: "#C9CACC" },
  { name: "Azzurro Italia/Ivory-Savile Blue", hex: "#2F7FC1", accent: "#EDE9DC" },
  { name: "Passion Fruit/Ivory-Avocado Green", hex: "#EBD255", accent: "#DADADA" },
  { name: "Bordeaux/Ivory-Passion Fruit", hex: "#6A1E2E", accent: "#EDE9DC" },
  { name: "Saffron/Light Black-Military Green", hex: "#E8A33A", accent: "#2B2B2D" },
  { name: "Fiery Red/Light Black-Ivory", hex: "#E0302A", accent: "#2B2B2D" },
];

const FONDO_COLORS = [
  { name: "Light Black/White Reflex", hex: "#2B2B2D", accent: "#E8E8E8" },
  { name: "Light Black/Blue Reflex", hex: "#2B2B2D", accent: "#3A6FD0" },
  { name: "Savile Blue/Red Reflex", hex: "#2C3E66", accent: "#D0302A" },
  { name: "Steel Blue/Blue Reflex", hex: "#4A6A8A", accent: "#3A6FD0" },
  { name: "Nickel Grey/Blue Reflex", hex: "#6E7072", accent: "#3A6FD0" },
  { name: "Military Green/Silver Reflex", hex: "#4F5634", accent: "#BFC1C4" },
  { name: "Electric Lime/Silver Reflex", hex: "#C8E62A", accent: "#BFC1C4" },
  { name: "Pro Red/Orange Reflex", hex: "#C8102E", accent: "#F26A21" },
];

const PERFETTO_COLORS = [
  { name: "Light Black/Silver Reflex", hex: "#2B2B2D", accent: "#BFC1C4" },
  { name: "Rich Red/Black Reflex", hex: "#D9073F", accent: "#1A1A1A" },
  { name: "Mocha/Black Reflex", hex: "#B55A30", accent: "#1A1A1A" },
  { name: "Pool Blue/Black Reflex", hex: "#A8E3DC", accent: "#1A1A1A" },
];

const BIBS_COLORS = [
  { name: "Black", hex: "#1A1A1A" },
  { name: "Savile Blue", hex: "#2C3E66" },
  { name: "Grey", hex: "#5B5E63" },
];

const EMERGENCY_COLORS = [
  { name: "Light Black", hex: "#2B2B2D" },
  { name: "White", hex: "#F2F2F2" },
  { name: "Brilliant Orange", hex: "#F96A4E" },
];

const WARDROBE = {
  [wear.CAP]: { zone: "Head", kind: "Cap under the helmet", shape: "cap", colors: GENERIC_COLORS, color: 1 },
  [wear.CORE_SEAMLESS]: { zone: "Torso", kind: "Base layer", shape: "longsleeve", colors: BLACK_ONLY, color: 0 },
  [wear.PROLOGO]: { zone: "Torso", kind: "Summer jersey", shape: "jersey", colors: PROLOGO_COLORS, color: 0 },
  [wear.FONDO]: { zone: "Torso", kind: "Thermal jersey", shape: "longsleeve", colors: FONDO_COLORS, color: 0 },
  [wear.PERFETTO]: { zone: "Torso", kind: "Wind and rain jacket", shape: "longsleeve", colors: PERFETTO_COLORS, color: 0 },
  [wear.EMERGENCY]: { zone: "Torso", kind: "Rain shell", shape: "longsleeve", colors: EMERGENCY_COLORS, color: 0 },
  [wear.GLOVES]: { zone: "Hands", kind: "Full-finger gloves", shape: "gloves", colors: BLACK_ONLY, color: 0 },
  [wear.BIBS]: { zone: "Legs", kind: "Free Aero Race 4", shape: "bibs", colors: BIBS_COLORS, color: 0 },
  // Not owned yet: no colors, shown as an outline.
  [wear.KNEE_WARMERS]: { zone: "Legs", kind: "Warmers", shape: "warmers", colors: [], color: 0 },
  [wear.TIGHTS]: { zone: "Legs", kind: "Thermal bibtights", shape: "tights", colors: BLACK_ONLY, color: 0 },
  [wear.SHOE_COVERS]: { zone: "Feet", kind: "Waterproof covers", shape: "shoecover", colors: BLACK_ONLY, color: 0 },
};
const ZONES = ["Head", "Torso", "Hands", "Legs", "Feet"];

const MORNING_HOURS = [7, 8];
const MIN_HOURS = 0.5;
const MAX_HOURS = 8;
const STALE_MS = 30 * 60 * 1000;

// The forecast and the rules stay in °F, mph and inches, as in
// what_to_wear.py; these only change what is shown.
const UNITS = {
  imperial: {
    temp: (f) => f,
    tempDelta: (f) => f,
    deg: "°F",
    speed: (mph) => `${wear.round0(mph)} mph`,
    rain: (inches) => `${inches.toFixed(2)} in/hour`,
  },
  metric: {
    temp: (f) => (f - 32) * 5 / 9,
    tempDelta: (f) => f * 5 / 9,
    deg: "°C",
    speed: (mph) => `${wear.round0(mph * 1.609344)} km/h`,
    rain: (inches) => `${(inches * 25.4).toFixed(1)} mm/hour`,
  },
};

/** Rewrites the °F figures in recommend()'s notes. */
function localizeNote(note, u, w) {
  if (u === UNITS.imperial) return note;
  return note
    .replace(/~(\d+)°F/, (_, f) => `~${wear.round0(u.temp(Number(f)))}${u.deg}`)
    .replace(/by \d+°F/, `by ${wear.round0(u.tempDelta(w.high - w.low))}${u.deg}`);
}

//
// State. Settings persist per device; the forecast lives in memory.
//

const SETTINGS_KEY = "wtw.settings";
const PHOTO_KEY = "wtw.photo.";

const defaults = {
  place: { name: wear.DEFAULT_PLACE, lat: wear.DEFAULT_LAT, lon: wear.DEFAULT_LON },
  start: "morning",
  morningHour: 7,
  customTime: "16:00",
  hours: 1.5,
  colors: {},
  units: "imperial",
};

const state = {
  ...defaults,
  ...load(SETTINGS_KEY),
  data: null,
  fetchedAt: 0,
  loading: false,
  error: null,
  searching: false,
  query: "",
  results: [],
  searchError: null,
  openItem: null,
};

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function save() {
  const { place, start, morningHour, customTime, hours, colors, units } = state;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ place, start, morningHour, customTime, hours, colors, units }));
  } catch {}
}

function photo(item) {
  try {
    return localStorage.getItem(PHOTO_KEY + item);
  } catch {
    return null;
  }
}

function set(changes, { persist = false } = {}) {
  Object.assign(state, changes);
  if (persist) save();
  render();
}

async function refresh() {
  set({ loading: true, error: null });
  try {
    const data = await wear.fetchWeather(state.place.lat, state.place.lon);
    set({ data, fetchedAt: Date.now(), loading: false });
  } catch (e) {
    set({ loading: false, error: e.message });
  }
}

//
// Rendering
//

const root = document.getElementById("app");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function startTime(now, tz) {
  if (state.start === "now") return now;
  if (state.start === "morning") return wear.nextMorning(state.morningHour, now, tz);
  const [h, m] = state.customTime.split(":").map(Number);
  return wear.resolveClock(h, m, now, tz);
}

function fmt(ms, tz, opts) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(ms);
}

// Daylight arc: sunrise at (20, 90), sunset at (300, 90), noon at the top.
function arcPoint(frac) {
  const a = Math.PI * (1 - frac);
  return { x: Math.round(160 + 140 * Math.cos(a)), y: Math.round(90 - 74 * Math.sin(a)) };
}

function span(ms) {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}

/** Sunrise and sunset on the ride's start date, or null if there are none. */
function daylight(data, start, tz) {
  const d = data.daily;
  if (!d?.sunrise) return null;
  const date = (ms) => fmt(ms, tz, { year: "numeric", month: "numeric", day: "numeric" });
  const i = d.sunrise.findIndex((t) => date(t * 1000) === date(start));
  if (i < 0 || d.sunrise[i] == null || d.sunset[i] == null) return null;
  return { rise: d.sunrise[i] * 1000, set: d.sunset[i] * 1000 };
}

function sunArc(start, end, { rise, set }, tz) {
  const frac = (t) => Math.min(1, Math.max(0, (t - rise) / (set - rise)));
  const day = start >= rise && start <= set;
  const p = day ? arcPoint(frac(start)) : { x: start < rise ? 20 : 300, y: 90 };
  let note;
  if (end <= rise || start >= set) note = "Whole ride in the dark. Lights on.";
  else if (start < rise && end > set) note = "Starts and ends in the dark. Lights on.";
  else if (start < rise) note = `Starts ${span(rise - start)} before sunrise. Lights on.`;
  else if (end > set) note = `Ends ${span(end - set)} after sunset. Lights on.`;
  else note = "Daylight the whole ride.";

  let segment = "";
  if (Math.min(end, set) > Math.max(start, rise)) {
    const a = arcPoint(frac(start));
    const b = arcPoint(frac(end));
    segment = `<path d="M ${a.x} ${a.y} A 140 74 0 0 1 ${b.x} ${b.y}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>`;
  }
  const time = (ms) => fmt(ms, tz, { hour: "numeric", minute: "2-digit" });
  const sun = day ? "#FFC266" : "var(--dark-cell)";
  return `
    <div class="sun">
      <svg viewBox="0 0 320 104" role="img" aria-label="${esc(`Sunrise ${time(rise)}, sunset ${time(set)}. ${note}`)}">
        <line x1="6" y1="90" x2="314" y2="90" stroke="#3A443F" stroke-width="1.5"/>
        <path d="M 20 90 A 140 74 0 0 1 300 90" fill="none" stroke="#56615B" stroke-width="1.5" stroke-dasharray="3 5"/>
        ${segment}
        ${day ? `<circle cx="${p.x}" cy="${p.y}" r="17" fill="${sun}" fill-opacity="0.18"/>` : ""}
        <circle cx="${p.x}" cy="${p.y}" r="9" fill="${sun}" stroke="${day ? sun : "var(--on-dark-muted)"}" stroke-width="2"/>
      </svg>
      <div class="sun-times"><span>Sunrise ${esc(time(rise))}</span><span>Sunset ${esc(time(set))}</span></div>
      <div class="sun-note">${esc(note)}</div>
    </div>`;
}

function rideLabel(start, end, tz) {
  const day = (ms) => fmt(ms, tz, { weekday: "short", month: "short", day: "numeric" });
  const time = (ms) => fmt(ms, tz, { hour: "numeric", minute: "2-digit" });
  const [startClock, startAmPm] = time(start).split(/\s/);
  const [, endAmPm] = time(end).split(/\s/);
  const from = startAmPm === endAmPm ? startClock : time(start);
  const to = day(end) === day(start) ? time(end) : fmt(end, tz, { weekday: "short" }) + " " + time(end);
  return `${day(start)} · ${from}–${to}`;
}

function dayHint(start, now, tz) {
  const day = (ms) => fmt(ms, tz, { year: "numeric", month: "numeric", day: "numeric" });
  const label = fmt(start, tz, { weekday: "short", month: "short", day: "numeric" });
  if (day(start) === day(now)) return `Today, ${label}`;
  if (day(start) === day(now + 24 * 60 * 60 * 1000)) return `Tomorrow, ${label}`;
  return label;
}

const icon = {
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  locate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  minus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>',
  temp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/></svg>',
  feels: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  rain: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/></svg>',
  wind: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
  chevron: '<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  pocket: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v6a8 8 0 0 1-16 0z"/><path d="M9 10l3 3 3-3"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

function render() {
  const focused = document.activeElement?.id;
  const caret = document.activeElement?.selectionStart;

  const tz = state.data?.timezone;
  const now = Date.now();
  let ride = null;
  let rideError = null;
  let start = null;

  if (state.data) {
    start = startTime(now, tz);
    try {
      const w = wear.rideWeather(state.data, start, state.hours);
      ride = { w, r: wear.recommend(w, state.hours) };
    } catch (e) {
      rideError = e.message;
    }
  }

  const header = `
    <header class="header">
      <div>
        <h1>What to wear</h1>
        <div class="muted small">${start ? esc(rideLabel(start, start + state.hours * 3600e3, tz)) : "&nbsp;"}</div>
      </div>
      <button class="pill" data-action="toggle-search" aria-expanded="${state.searching}">
        ${icon.pin}<span>${esc(state.place.name)}</span>
      </button>
    </header>`;

  const search = !state.searching ? "" : `
    <section class="card search">
      <label class="eyebrow" for="place-search">Place</label>
      <div class="search-row">
        <input id="place-search" type="search" autocomplete="off" placeholder="Seattle, Portland ME, or 47.67, -122.12" value="${esc(state.query)}">
        <button class="pill" data-action="locate">${icon.locate}<span>Here</span></button>
      </div>
      ${state.searchError ? `<div class="error small">${esc(state.searchError)}</div>` : ""}
      <div class="results">
        ${state.results.map((p, i) => `
          <button class="result" data-action="pick-place" data-index="${i}">
            <span>${esc(p.name)}</span>
            <span class="muted small">${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}</span>
          </button>`).join("")}
      </div>
    </section>`;

  const chip = (key, label) => `
    <button class="chip" data-action="start" data-start="${key}" aria-pressed="${state.start === key}">${label}</button>`;

  const setup = `
    <section class="card setup">
      <div class="stack-8">
        <div class="eyebrow">Start</div>
        <div class="chips">
          ${chip("morning", "Next morning")}${chip("now", "Now")}${chip("other", "Other")}
        </div>
        ${state.start === "morning" ? `
          <div class="sub-row">
            <div class="stack-0">
              <span class="strong">Roll out at</span>
              <span class="muted small">${start ? esc(dayHint(start, now, tz)) : ""}</span>
            </div>
            <div class="segmented">
              ${MORNING_HOURS.map((h) => `
                <button data-action="morning-hour" data-hour="${h}" aria-pressed="${state.morningHour === h}">${h}:00</button>`).join("")}
            </div>
          </div>` : ""}
        ${state.start === "other" ? `
          <div class="sub-row">
            <div class="stack-0">
              <label class="strong" for="start-time">Start at</label>
              <span class="muted small">${start ? esc(dayHint(start, now, tz)) : ""}</span>
            </div>
            <input id="start-time" type="time" step="300" value="${esc(state.customTime)}">
          </div>` : ""}
      </div>
      <div class="sub-row">
        <div class="eyebrow">Duration</div>
        <div class="stepper">
          <button class="round" data-action="hours" data-delta="-0.5" aria-label="Shorter ride" ${state.hours <= MIN_HOURS ? "disabled" : ""}>${icon.minus}</button>
          <div class="display">${state.hours} h</div>
          <button class="round" data-action="hours" data-delta="0.5" aria-label="Longer ride" ${state.hours >= MAX_HOURS ? "disabled" : ""}>${icon.plus}</button>
        </div>
      </div>
      <div class="sub-row">
        <div class="eyebrow">Units</div>
        <div class="segmented">
          <button data-action="units" data-units="imperial" aria-pressed="${state.units !== "metric"}">°F · mph</button>
          <button data-action="units" data-units="metric" aria-pressed="${state.units === "metric"}">°C · km/h</button>
        </div>
      </div>
    </section>`;

  let verdict;
  if (state.error) {
    verdict = `
      <section class="verdict">
        <div class="eyebrow on-dark">Couldn't get the forecast</div>
        <p>${esc(state.error)}</p>
        <button class="pill" data-action="refresh">Try again</button>
      </section>`;
  } else if (!state.data) {
    verdict = `<section class="verdict"><div class="eyebrow on-dark">Getting the forecast…</div></section>`;
  } else if (rideError) {
    verdict = `<section class="verdict"><div class="eyebrow on-dark">${esc(rideError)}</div></section>`;
  } else {
    const { w, r } = ride;
    const r0 = wear.round0;
    const u = UNITS[state.units] || UNITS.imperial;
    const stat = (ic, label, value, detail, hot) => `
      <div class="stat${hot ? " hot" : ""}">
        <div class="stat-label">${ic}<span>${label}</span></div>
        <div class="stat-value">${value}</div>
        <div class="stat-detail">${detail}</div>
      </div>`;
    verdict = `
      <section class="verdict">
        <div class="verdict-head">
          <div class="stack-2">
            <div class="eyebrow on-dark">Kit for this ride</div>
            <div class="band">${esc(r.band)}</div>
          </div>
          <div class="cold">
            <div class="cold-value">${r0(u.temp(r.cold))}°</div>
            <div class="stat-detail">dressing for</div>
          </div>
        </div>
        ${(() => {
          const light = daylight(state.data, start, tz);
          return light ? sunArc(start, start + state.hours * 3600e3, light, tz) : "";
        })()}
        <div class="stats">
          ${stat(icon.temp, "Temperature", `${r0(u.temp(w.low))}–${r0(u.temp(w.high))}${u.deg}`, "during the ride")}
          ${stat(icon.feels, "Feels like", `${r0(u.temp(w.feels_low))}${u.deg}`, "at its coldest")}
          ${stat(icon.rain, "Rain", `${r0(w.rain_probability)}%`, `up to ${u.rain(w.rain_max_hourly)}`, r.wet)}
          ${stat(icon.wind, "Wind", u.speed(w.wind), `gusts ${u.speed(w.gusts)}`, r.windy)}
        </div>
        ${w.partial ? `<div class="warning small">The forecast ends before your ride does.</div>` : ""}
      </section>`;
  }

  let kit = "";
  if (ride) {
    const { r } = ride;
    const items = r.layers
      .map((name, i) => ({ name, i, info: WARDROBE[name] }))
      .sort((a, b) => ZONES.indexOf(a.info.zone) - ZONES.indexOf(b.info.zone) || a.i - b.i);
    const u = UNITS[state.units] || UNITS.imperial;
    const notes = r.notes
      .filter((n) => !n.startsWith(wear.CARRY_PREFIX))
      .map((n) => localizeNote(n, u, ride.w));

    kit = `
      <section class="stack-8">
        <div class="section-head">
          <h2>Wear</h2>
          <div class="muted small">${items.length} pieces</div>
        </div>
        <div class="card wear">
          ${items.map(({ name, info }) => {
            if (!info.colors.length) {
              return `
                <div class="item">
                  <div class="item-row missing">
                    <span class="thumb"><svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true"><path d="${SHAPES[info.shape]}" fill="none" stroke="#59615C" stroke-width="1.4" stroke-dasharray="3 2" stroke-linejoin="round"/></svg></span>
                    <span class="item-text">
                      <span class="strong">${esc(name)}</span>
                      <span class="muted small">${esc(info.kind)} · Not in your wardrobe yet</span>
                    </span>
                  </div>
                </div>`;
            }
            const chosen = info.colors[state.colors[name] ?? info.color] || info.colors[0];
            const open = state.openItem === name;
            const pic = photo(name);
            return `
              <div class="item">
                <button class="item-row" data-action="toggle-item" data-item="${esc(name)}" aria-expanded="${open}">
                  <span class="thumb">${pic
                    ? `<img src="${pic}" alt="">`
                    : `<svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true"><path d="${SHAPES[info.shape]}" fill="${chosen.hex}" stroke="#151A17" stroke-opacity="0.4" stroke-width="1.2" stroke-linejoin="round"/></svg>`}</span>
                  <span class="item-text">
                    <span class="strong">${esc(name)}</span>
                    <span class="muted small">${esc(info.kind)} · ${esc(chosen.name)}</span>
                  </span>
                  ${name === wear.EMERGENCY ? `<span class="badge">Rain</span>` : ""}
                  ${icon.chevron}
                </button>
                ${open ? `
                  <div class="item-panel">
                    ${info.colors.length > 1 ? `
                      <div class="muted small">Which one are you wearing?</div>
                      <div class="swatches">
                        ${info.colors.map((c, ci) => `
                          <button class="swatch" data-action="color" data-item="${esc(name)}" data-color="${ci}" aria-label="${esc(c.name)}" title="${esc(c.name)}" aria-pressed="${c === chosen}">
                            <span style="background:${c.accent ? `linear-gradient(135deg, ${c.hex} 62%, ${c.accent} 62%)` : c.hex}"></span>
                          </button>`).join("")}
                      </div>` : `<div class="muted small">Only made in ${esc(chosen.name.toLowerCase())}.</div>`}
                    <div class="photo-actions">
                      <button class="pill" data-action="photo" data-item="${esc(name)}">${icon.camera}<span>${pic ? "Change photo" : "Use a photo of yours"}</span></button>
                      ${pic ? `<button class="link" data-action="remove-photo" data-item="${esc(name)}">Remove photo</button>` : ""}
                    </div>
                  </div>` : ""}
              </div>`;
          }).join("")}
        </div>
      </section>
      ${r.carry.length ? `
        <section class="pocket">
          ${icon.pocket}
          <div class="stack-0">
            <div class="strong">In your pocket: Emergency 3</div>
            <div class="muted small">${esc(r.carry.join(", ").replace(/^./, (c) => c.toUpperCase()))}</div>
          </div>
        </section>` : ""}
      ${notes.length ? `
        <section class="notes">
          ${notes.map((n) => `<div class="note">${icon.info}<span>${esc(n)}</span></div>`).join("")}
        </section>` : ""}`;
  }

  const updated = state.fetchedAt
    ? `updated ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(state.fetchedAt)} · `
    : "";

  root.innerHTML = `
    <div class="page">
      ${header}
      ${search}
      <div class="columns">
        <div class="column">${setup}${verdict}</div>
        <div class="column">${kit}</div>
      </div>
      <footer class="muted small">
        Forecast by <a href="https://open-meteo.com/">Open-Meteo</a> · ${updated}
        <button class="link" data-action="refresh" ${state.loading ? "disabled" : ""}>${state.loading ? "Refreshing…" : "Refresh"}</button>
      </footer>
    </div>`;

  if (focused) {
    const el = document.getElementById(focused);
    if (el) {
      el.focus();
      if (caret != null && el.setSelectionRange && el.type === "search") el.setSelectionRange(caret, caret);
    }
  }
}

//
// Place search
//

let searchTimer;
let searchSeq = 0;

function search(query) {
  clearTimeout(searchTimer);
  state.query = query;
  const coords = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coords) {
    const lat = Number(coords[1]);
    const lon = Number(coords[2]);
    set({ results: [{ name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon }], searchError: null });
    return;
  }
  if (!query.trim()) {
    set({ results: [], searchError: null });
    return;
  }
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    try {
      const results = await wear.geocode(query.trim());
      if (seq !== searchSeq) return;
      set({ results, searchError: results.length ? null : `Could not find a place called "${query.trim()}".` });
    } catch (e) {
      if (seq === searchSeq) set({ searchError: e.message });
    }
  }, 300);
}

function pickPlace(place) {
  set({ place, searching: false, query: "", results: [], data: null }, { persist: true });
  refresh();
}

//
// Photos: shrunk to a small square and kept on this device.
//

const picker = document.createElement("input");
picker.type = "file";
picker.accept = "image/*";
let pickerItem = null;

picker.addEventListener("change", async () => {
  const file = picker.files[0];
  picker.value = "";
  if (!file || !pickerItem) return;
  try {
    const bitmap = await createImageBitmap(file);
    const size = 192;
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").drawImage(
      bitmap,
      (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
      0, 0, size, size
    );
    localStorage.setItem(PHOTO_KEY + pickerItem, canvas.toDataURL("image/jpeg", 0.82));
  } catch (e) {
    console.error("Could not save photo", e);
  }
  render();
});

//
// Events
//

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action } = el.dataset;

  if (action === "toggle-search") {
    set({ searching: !state.searching, results: [], query: "", searchError: null });
    if (state.searching) document.getElementById("place-search")?.focus();
  } else if (action === "pick-place") {
    pickPlace(state.results[Number(el.dataset.index)]);
  } else if (action === "locate") {
    navigator.geolocation.getCurrentPosition(
      (pos) => pickPlace({ name: "Current location", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => set({ searchError: `Could not get your location: ${err.message}` }),
      { timeout: 10000 }
    );
  } else if (action === "start") {
    set({ start: el.dataset.start }, { persist: true });
  } else if (action === "morning-hour") {
    set({ morningHour: Number(el.dataset.hour) }, { persist: true });
  } else if (action === "units") {
    set({ units: el.dataset.units }, { persist: true });
  } else if (action === "hours") {
    const hours = Math.min(MAX_HOURS, Math.max(MIN_HOURS, state.hours + Number(el.dataset.delta)));
    set({ hours }, { persist: true });
  } else if (action === "toggle-item") {
    set({ openItem: state.openItem === el.dataset.item ? null : el.dataset.item });
  } else if (action === "color") {
    set({ colors: { ...state.colors, [el.dataset.item]: Number(el.dataset.color) } }, { persist: true });
  } else if (action === "photo") {
    pickerItem = el.dataset.item;
    picker.click();
  } else if (action === "remove-photo") {
    try {
      localStorage.removeItem(PHOTO_KEY + el.dataset.item);
    } catch {}
    render();
  } else if (action === "refresh") {
    refresh();
  }
});

root.addEventListener("input", (e) => {
  if (e.target.id === "place-search") search(e.target.value);
});

root.addEventListener("change", (e) => {
  if (e.target.id === "start-time" && e.target.value) {
    set({ customTime: e.target.value }, { persist: true });
  }
});

root.addEventListener("keydown", (e) => {
  if (e.target.id === "place-search" && e.key === "Enter" && state.results.length) {
    pickPlace(state.results[0]);
  }
});

// Keep "now" current, and refetch a forecast left open for a while.
setInterval(() => {
  if (state.start === "now" && !state.searching) render();
}, 60 * 1000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - state.fetchedAt > STALE_MS) refresh();
});

render();
refresh();
