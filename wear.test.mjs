// Run with: node --test
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import {
  nextMorning,
  placeName,
  recommend,
  resolveClock,
  rideWeather,
  round0,
  zonedTime,
} from "./wear.js";

const TZ = "America/Los_Angeles";
const HOUR = 60 * 60 * 1000;

function cases() {
  const out = [];
  const rain = [[0, 0], [25, 0], [50, 0], [10, 0.02], [90, 0.2]];
  const wind = [[5, 8], [14, 18], [6, 24]];
  for (let low = 30; low <= 70; low++) {
    for (const feelsDrop of [0, 3, 8]) {
      for (const [rainProb, rainMax] of rain) {
        for (const [w, gusts] of wind) {
          for (const swing of [0, 10.5, 12]) {
            for (const duration of [1, 2]) {
              for (const perfetto of [true, false]) {
                out.push({
                  w: {
                    low, high: low + swing, feels_low: low - feelsDrop,
                    rain_probability: rainProb, rain_max_hourly: rainMax,
                    wind: w, gusts,
                  },
                  duration, perfetto,
                });
              }
            }
          }
        }
      }
    }
  }
  return out;
}

test("recommend() matches what_to_wear.py", () => {
  const all = cases();
  const expected = JSON.parse(execFileSync("python3", ["-c", `
import json, sys
from what_to_wear import recommend
out = []
for c in json.load(sys.stdin):
    layers, notes = recommend(c["w"], c["duration"], c["perfetto"])
    out.append({"layers": layers, "notes": notes})
print(json.dumps(out))
`], { input: JSON.stringify(all), cwd: import.meta.dirname, maxBuffer: 1 << 28 }));

  all.forEach((c, i) => {
    const { layers, notes } = recommend(c.w, c.duration, c.perfetto);
    assert.deepEqual({ layers, notes }, expected[i], JSON.stringify(c));
  });
});

test("round0 rounds halves to even like Python", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 10.5, 2.4, 2.6].map(round0), [0, 2, 2, 10, 2, 3]);
});

function forecast(start, hours, overrides = {}) {
  const series = {
    temperature_2m: 50,
    apparent_temperature: 48,
    precipitation_probability: 0,
    precipitation: 0,
    wind_speed_10m: 5,
    wind_gusts_10m: 8,
  };
  const hourly = { time: [] };
  for (let i = 0; i < hours; i++) hourly.time.push((start + i * HOUR) / 1000);
  for (const [name, value] of Object.entries(series)) {
    hourly[name] = overrides[name] || Array(hours).fill(value);
  }
  return { hourly };
}

const midnight = zonedTime(2026, 9, 27, 0, 0, TZ);

test("rain only counts hours overlapping the ride", () => {
  const rain = Array(24).fill(0);
  rain[8] = 0.3;
  const data = forecast(midnight, 24, { precipitation: rain });
  assert.equal(rideWeather(data, midnight + 8 * HOUR, 1).rain_max_hourly, 0);
  rain[9] = 0.05;
  assert.equal(rideWeather(data, midnight + 8 * HOUR, 1).rain_max_hourly, 0.05);
});

test("nulls are ignored", () => {
  const temps = Array(24).fill(50);
  temps[8] = null;
  const data = forecast(midnight, 24, {
    wind_speed_10m: Array(24).fill(null),
    temperature_2m: temps,
  });
  const w = rideWeather(data, midnight + 8 * HOUR, 1);
  assert.equal(w.wind, 0);
  assert.equal(w.low, 50);
});

test("partial forecast is flagged", () => {
  const data = forecast(midnight, 24);
  assert.equal(rideWeather(data, midnight + 22 * HOUR, 3).partial, true);
  assert.equal(rideWeather(data, midnight + 22 * HOUR, 1).partial, false);
});

test("no data throws", () => {
  const data = forecast(midnight, 24);
  assert.throws(() => rideWeather(data, midnight + 72 * HOUR, 1));
});

test("zonedTime handles daylight saving", () => {
  // 2026-11-01 is the fall-back day: midnight to noon is 13 hours.
  const day = zonedTime(2026, 11, 1, 0, 0, TZ);
  assert.equal(zonedTime(2026, 11, 1, 12, 0, TZ) - day, 13 * HOUR);
  assert.equal(new Date(day).toISOString(), "2026-11-01T07:00:00.000Z");
});

test("resolveClock matches resolve_start()", () => {
  const now = zonedTime(2026, 9, 27, 14, 0, TZ);
  assert.equal(resolveClock(18, 0, now, TZ), zonedTime(2026, 9, 27, 18, 0, TZ));
  assert.equal(resolveClock(8, 0, now, TZ), zonedTime(2026, 9, 28, 8, 0, TZ));
  assert.equal(resolveClock(13, 45, now, TZ), zonedTime(2026, 9, 27, 13, 45, TZ));
});

test("nextMorning is today before the hour, tomorrow after", () => {
  const early = zonedTime(2026, 9, 27, 6, 30, TZ);
  assert.equal(nextMorning(7, early, TZ), zonedTime(2026, 9, 27, 7, 0, TZ));
  const evening = zonedTime(2026, 9, 27, 18, 40, TZ);
  assert.equal(nextMorning(7, evening, TZ), zonedTime(2026, 9, 28, 7, 0, TZ));
  // Month rollover.
  const last = zonedTime(2026, 9, 30, 20, 0, TZ);
  assert.equal(nextMorning(8, last, TZ), zonedTime(2026, 10, 1, 8, 0, TZ));
});

test("placeName skips missing and repeated parts", () => {
  assert.equal(
    placeName({ name: "Seattle", admin1: "Washington", country_code: "US" }),
    "Seattle, Washington, US"
  );
  assert.equal(
    placeName({ name: "Singapore", admin1: "Singapore", country_code: "SG" }),
    "Singapore, SG"
  );
});
