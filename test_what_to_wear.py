import argparse
import io
import json
import unittest
import urllib.error
from datetime import datetime, time, timedelta
from unittest import mock
from zoneinfo import ZoneInfo

from what_to_wear import (
    BIBS,
    CORE_SEAMLESS,
    EMERGENCY,
    FONDO,
    GLOVES,
    PERFETTO,
    PROLOGO,
    SHOE_COVERS,
    TIGHTS,
    api_error,
    clock_time,
    geocode,
    place_arg,
    place_name,
    positive_hours,
    recommend,
    resolve_start,
    ride_weather,
)

TZ = ZoneInfo("America/Los_Angeles")


def weather(temp, rain_probability=0, rain_max_hourly=0, wind=5, gusts=8,
            high=None, feels=None):
    return {
        "low": temp,
        "high": temp if high is None else high,
        "feels_low": temp if feels is None else feels,
        "rain_probability": rain_probability,
        "rain_max_hourly": rain_max_hourly,
        "wind": wind,
        "gusts": gusts,
    }


DRY = {}
WET = {"rain_probability": 60}
HEAVY = {"rain_probability": 90, "rain_max_hourly": 0.2}
MAYBE = {"rain_probability": 30}


class RecommendTest(unittest.TestCase):
    def test_bib_shorts_down_to_46(self):
        for temp in (65, 58, 50):
            for conditions in (DRY, WET):
                for perfetto in (False, True):
                    layers, _ = recommend(
                        weather(temp, **conditions), 2, perfetto
                    )
                    self.assertIn(BIBS, layers, (temp, conditions, perfetto))
                    self.assertNotIn(TIGHTS, layers)

    def test_tights_replace_bib_shorts_below_46(self):
        for temp in (42, 35):
            for perfetto in (False, True):
                layers, _ = recommend(weather(temp), 2, perfetto)
                self.assertIn(TIGHTS, layers, (temp, perfetto))
                self.assertNotIn(BIBS, layers, (temp, perfetto))

    def test_gloves_below_54(self):
        for temp in (50, 42, 35):
            layers, _ = recommend(weather(temp), 2)
            self.assertIn(GLOVES, layers, temp)
        layers, _ = recommend(weather(58), 2)
        self.assertNotIn(GLOVES, layers)

    def test_gloves_note_in_coldest_band_only(self):
        _, notes = recommend(weather(35), 2)
        self.assertTrue(any("liner gloves" in n for n in notes))
        _, notes = recommend(weather(42), 2)
        self.assertFalse(any("liner gloves" in n for n in notes))

    def test_shoe_covers_always_below_46(self):
        for temp in (42, 35):
            layers, _ = recommend(weather(temp), 2)
            self.assertIn(SHOE_COVERS, layers, temp)

    def test_shoe_covers_only_when_wet_from_46_to_54(self):
        layers, _ = recommend(weather(50, **WET), 2)
        self.assertIn(SHOE_COVERS, layers)
        layers, _ = recommend(weather(50), 2)
        self.assertNotIn(SHOE_COVERS, layers)

    def test_perfetto_is_the_default(self):
        layers, _ = recommend(weather(50), 2)
        self.assertIn(PERFETTO, layers)

    def test_warm(self):
        layers, notes = recommend(weather(65), 2)
        self.assertEqual(layers, [PROLOGO, BIBS])
        self.assertEqual(notes, [])

    def test_mild_wet_adds_jacket(self):
        layers, _ = recommend(weather(58, **WET), 2)
        self.assertEqual(layers, [FONDO, BIBS, EMERGENCY])

    def test_mild_windy_suggests_carrying_jacket(self):
        _, notes = recommend(weather(58, wind=15), 2)
        self.assertTrue(any("Emergency 3" in n for n in notes))

    def test_gusts_count_as_windy(self):
        layers, _ = recommend(weather(50, gusts=25), 2, has_perfetto=False)
        self.assertIn(EMERGENCY, layers)

    def test_maybe_rain_note_in_every_band_without_jacket(self):
        for temp in (65, 58, 50, 42):
            layers, notes = recommend(weather(temp, **MAYBE), 2)
            self.assertNotIn(EMERGENCY, layers, temp)
            self.assertTrue(
                any("chance of rain" in n for n in notes), temp
            )

    def test_no_maybe_rain_note_when_wearing_jacket(self):
        _, notes = recommend(weather(35, **MAYBE), 2, has_perfetto=False)
        self.assertFalse(any("chance of rain" in n for n in notes))

    def test_likely_rain_suggests_carrying_jacket(self):
        # Wet but not heavy: Perfetto alone, but bring the shell.
        for temp in (50, 42, 35):
            layers, notes = recommend(
                weather(temp, **WET), 2, has_perfetto=True
            )
            self.assertNotIn(EMERGENCY, layers, temp)
            self.assertIn(
                "Carry Emergency 3 in jersey pocket (rain likely).", notes, temp
            )

    def test_wind_and_rain_share_one_carry_note(self):
        _, notes = recommend(weather(58, wind=15, **MAYBE), 2)
        carry = [n for n in notes if "Carry Emergency 3" in n]
        self.assertEqual(
            carry,
            ["Carry Emergency 3 in jersey pocket (wind, chance of rain)."],
        )

    def test_cool_wet_with_perfetto_prefers_perfetto(self):
        layers, _ = recommend(weather(50, **WET), 2, has_perfetto=True)
        self.assertIn(PERFETTO, layers)
        self.assertNotIn(FONDO, layers)
        self.assertNotIn(EMERGENCY, layers)

    def test_heavy_rain_adds_jacket_over_perfetto(self):
        for temp in (50, 42, 35):
            layers, _ = recommend(
                weather(temp, **HEAVY), 2, has_perfetto=True
            )
            self.assertIn(PERFETTO, layers, temp)
            self.assertIn(EMERGENCY, layers, temp)

    def test_short_dry_ride_skips_base_layer(self):
        layers, notes = recommend(weather(52), 1, has_perfetto=True)
        self.assertNotIn(CORE_SEAMLESS, layers)
        self.assertTrue(any("short ride" in n for n in notes))

    def test_long_ride_keeps_base_layer(self):
        layers, _ = recommend(weather(52), 2, has_perfetto=True)
        self.assertIn(CORE_SEAMLESS, layers)

    def test_uses_colder_of_actual_and_apparent(self):
        layers, _ = recommend(weather(62, feels=50), 2)
        self.assertNotIn(PROLOGO, layers)

    def test_temperature_swing_note(self):
        _, notes = recommend(weather(45, high=60), 2)
        self.assertTrue(any("15°F" in n for n in notes))


def forecast(start, hours, **overrides):
    """Hourly forecast starting at `start`, with constant values."""
    series = {
        "temperature_2m": 50,
        "apparent_temperature": 48,
        "precipitation_probability": 0,
        "precipitation": 0,
        "wind_speed_10m": 5,
        "wind_gusts_10m": 8,
    }
    hourly = {
        "time": [
            int((start + timedelta(hours=i)).timestamp())
            for i in range(hours)
        ],
    }
    for name, value in series.items():
        hourly[name] = [value] * hours
    for name, values in overrides.items():
        hourly[name] = values
    return {"hourly": hourly}


class RideWeatherTest(unittest.TestCase):
    midnight = datetime(2026, 9, 27, tzinfo=TZ)

    def test_rain_only_counts_hours_overlapping_the_ride(self):
        # Rain from 07:00-08:00 is reported at 08:00; a ride from 08:00
        # to 09:00 should only see the 09:00 value.
        rain = [0] * 24
        rain[8] = 0.3
        data = forecast(self.midnight, 24, precipitation=rain)
        start = self.midnight.replace(hour=8)

        self.assertEqual(ride_weather(data, start, 1)["rain_max_hourly"], 0)

        rain[9] = 0.05
        self.assertEqual(ride_weather(data, start, 1)["rain_max_hourly"], 0.05)

    def test_rain_is_max_per_hour_not_total(self):
        data = forecast(self.midnight, 24, precipitation=[0.01] * 24)
        start = self.midnight.replace(hour=8)
        self.assertEqual(ride_weather(data, start, 4)["rain_max_hourly"], 0.01)

    def test_nulls_are_ignored(self):
        wind = [None] * 24
        temps = [50] * 24
        temps[8] = None
        data = forecast(
            self.midnight, 24, wind_speed_10m=wind, temperature_2m=temps
        )
        w = ride_weather(data, self.midnight.replace(hour=8), 1)
        self.assertEqual(w["wind"], 0)
        self.assertEqual(w["low"], 50)

    def test_partial_forecast_is_flagged(self):
        data = forecast(self.midnight, 24)
        late = self.midnight.replace(hour=22)
        self.assertTrue(ride_weather(data, late, 3)["partial"])
        self.assertFalse(ride_weather(data, late, 1)["partial"])

    def test_no_data_raises(self):
        data = forecast(self.midnight, 24)
        with self.assertRaises(RuntimeError):
            ride_weather(data, self.midnight + timedelta(days=3), 1)


class StartTest(unittest.TestCase):
    now = datetime(2026, 9, 27, 14, 0, tzinfo=TZ)

    def test_now(self):
        self.assertEqual(resolve_start(clock_time("now"), self.now), self.now)

    def test_later_today(self):
        start = resolve_start(time(18, 0), self.now)
        self.assertEqual(start, datetime(2026, 9, 27, 18, 0, tzinfo=TZ))

    def test_past_time_means_tomorrow(self):
        start = resolve_start(time(8, 0), self.now)
        self.assertEqual(start, datetime(2026, 9, 28, 8, 0, tzinfo=TZ))

    def test_just_passed_stays_today(self):
        start = resolve_start(time(13, 45), self.now)
        self.assertEqual(start.date(), self.now.date())

    def test_invalid_start(self):
        for value in ("8", "8am", "25:00", ""):
            with self.assertRaises(argparse.ArgumentTypeError, msg=value):
                clock_time(value)

    def test_invalid_hours(self):
        for value in ("0", "-1", "abc", "nan", "inf", "-inf", "1e9", "73"):
            with self.assertRaises(argparse.ArgumentTypeError, msg=value):
                positive_hours(value)

    def test_valid_hours(self):
        self.assertEqual(positive_hours("1.5"), 1.5)
        self.assertEqual(positive_hours("72"), 72)


def fake_urlopen(payload):
    return mock.patch(
        "urllib.request.urlopen",
        return_value=io.BytesIO(json.dumps(payload).encode()),
    )


class PlaceTest(unittest.TestCase):
    seattle = {
        "name": "Seattle",
        "admin1": "Washington",
        "country_code": "US",
        "latitude": 47.60621,
        "longitude": -122.33207,
    }

    def test_place_name(self):
        self.assertEqual(place_name(self.seattle), "Seattle, Washington, US")

    def test_place_name_skips_missing_and_repeated_parts(self):
        result = {"name": "Singapore", "admin1": "Singapore",
                  "country_code": "SG"}
        self.assertEqual(place_name(result), "Singapore, SG")
        self.assertEqual(place_name({"name": "Somewhere"}), "Somewhere")

    def test_geocode_uses_top_result(self):
        with fake_urlopen({"results": [self.seattle]}) as urlopen:
            self.assertEqual(
                geocode("Seattle, WA"),
                ("Seattle, Washington, US", 47.60621, -122.33207),
            )
        self.assertIn("name=Seattle%2C+WA", urlopen.call_args.args[0])

    def test_geocode_no_results(self):
        with fake_urlopen({"generationtime_ms": 0.5}):
            with self.assertRaises(LookupError):
                geocode("Nowhereville123")


    def test_empty_place_is_rejected(self):
        for value in ("", "   "):
            with self.assertRaises(argparse.ArgumentTypeError, msg=value):
                place_arg(value)
        self.assertEqual(place_arg(" Seattle "), "Seattle")


class ApiErrorTest(unittest.TestCase):
    def http_error(self, body):
        return urllib.error.HTTPError(
            "https://api.open-meteo.com", 400, "Bad Request", {},
            io.BytesIO(body),
        )

    def test_reason_from_body(self):
        body = b'{"reason": "Latitude must be in range of -90 to 90", "error": true}'
        self.assertEqual(
            api_error(self.http_error(body)),
            "Latitude must be in range of -90 to 90",
        )

    def test_falls_back_when_body_is_not_json(self):
        self.assertEqual(
            api_error(self.http_error(b"<html>oops</html>")),
            "HTTP Error 400: Bad Request",
        )


if __name__ == "__main__":
    unittest.main()
