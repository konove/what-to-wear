#!/usr/bin/env python3

import argparse
import json
import math
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


DEFAULT_PLACE = "Redmond, WA"
DEFAULT_LAT = 47.6740
DEFAULT_LON = -122.1215

# Default for --perfetto / --no-perfetto. Use --no-perfetto when the
# Perfetto RoS 3 isn't available (e.g. in the wash).
HAS_PERFETTO = True

# A clock time for --start that is more than this far in the past is taken
# to mean tomorrow.
START_GRACE = timedelta(minutes=30)

# Wardrobe
PROLOGO = "Castelli Prologo 7"
FONDO = "Castelli Fondo 2"
PERFETTO = "Castelli Perfetto RoS 3"
CORE_SEAMLESS = "Core Seamless Long Sleeve"
EMERGENCY = "Emergency 3 Rain Jacket"
BIBS = "Bib shorts"
TIGHTS = "Thermowoven Bibtight"
GLOVES = "Castelli Perfetto RoS 2 Gloves"
SHOE_COVERS = "Castelli Pioggia 4 Shoecovers"

# Thresholds. Apparent temperature only accounts for the ambient wind, not
# the ~15-20 mph of air you create by riding, so the temperature bands below
# are deliberately on the warm side.
WET_PROBABILITY = 45        # %
WET_HOURLY_RAIN = 0.02      # inches in any one hour
HEAVY_HOURLY_RAIN = 0.10    # inches in any one hour
MAYBE_RAIN_PROBABILITY = 20 # %
WINDY_SPEED = 12            # mph sustained
WINDY_GUSTS = 20            # mph
TEMP_SWING = 10             # °F between coldest and warmest reading

FORECAST_DAYS = 3


def fetch_weather(lat, lon):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "wind_speed_10m",
            "wind_gusts_10m",
        ]),
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        # Unix timestamps avoid ambiguous local times at DST changes;
        # "auto" still tells us the location's time zone.
        "timeformat": "unixtime",
        "timezone": "auto",
        # Today, tomorrow, and the day after, so a late ride tomorrow
        # is still fully covered.
        "forecast_days": FORECAST_DAYS,
    }

    url = (
        "https://api.open-meteo.com/v1/forecast?"
        + urllib.parse.urlencode(params)
    )

    with urllib.request.urlopen(url, timeout=10) as r:
        return json.load(r)


def api_error(e):
    """Open-Meteo explains rejected requests in a JSON "reason" field."""
    try:
        return json.load(e)["reason"]
    except (OSError, ValueError, KeyError, TypeError):
        return str(e)


def place_name(result):
    """ "Seattle, Washington, US" from an Open-Meteo geocoding result."""
    parts = []
    for part in (result["name"], result.get("admin1"), result.get("country_code")):
        if part and part not in parts:
            parts.append(part)
    return ", ".join(parts)


def geocode(place):
    """Look up a place name; returns (name, lat, lon) of the best match."""
    params = {
        "name": place,
        "count": 1,
        "language": "en",
        "format": "json",
    }

    url = (
        "https://geocoding-api.open-meteo.com/v1/search?"
        + urllib.parse.urlencode(params)
    )

    with urllib.request.urlopen(url, timeout=10) as r:
        results = json.load(r).get("results")

    if not results:
        raise LookupError(f"Could not find a place called {place!r}.")

    top = results[0]
    return place_name(top), top["latitude"], top["longitude"]


def ride_weather(data, start, duration_hours):
    tz = start.tzinfo
    h = data["hourly"]
    times = [datetime.fromtimestamp(t, tz) for t in h["time"]]

    end = start + timedelta(hours=duration_hours)
    half_hour = timedelta(minutes=30)

    # Temperature and wind are readings at the top of each hour, so use
    # the readings from 30 minutes either side of the ride.
    instant = [
        i for i, t in enumerate(times)
        if start - half_hour <= t <= end + half_hour
    ]

    # Precipitation values cover the hour *before* each timestamp, so use
    # every hour that overlaps the ride.
    preceding = [
        i for i, t in enumerate(times)
        if start < t < end + timedelta(hours=1)
    ]

    def values(name, indices):
        return [h[name][i] for i in indices if h[name][i] is not None]

    temps = values("temperature_2m", instant)
    feels = values("apparent_temperature", instant)

    if not temps or not feels:
        raise RuntimeError("No forecast data available for that ride window.")

    rain_prob = values("precipitation_probability", preceding)
    rain = values("precipitation", preceding)
    wind = values("wind_speed_10m", instant)
    gusts = values("wind_gusts_10m", instant)

    return {
        "low": min(temps),
        "high": max(temps),
        "feels_low": min(feels),
        "rain_probability": max(rain_prob, default=0),
        "rain_max_hourly": max(rain, default=0),
        "wind": max(wind, default=0),
        "gusts": max(gusts, default=0),
        "partial": end > times[-1],
    }


def recommend(w, duration, has_perfetto=HAS_PERFETTO):
    low = w["low"]
    high = w["high"]
    feels = w["feels_low"]
    rain_prob = w["rain_probability"]
    rain_max = w["rain_max_hourly"]

    wet = rain_prob >= WET_PROBABILITY or rain_max >= WET_HOURLY_RAIN
    heavy_rain = rain_max >= HEAVY_HOURLY_RAIN
    maybe_rain = not wet and rain_prob >= MAYBE_RAIN_PROBABILITY
    windy = w["wind"] >= WINDY_SPEED or w["gusts"] >= WINDY_GUSTS
    short = duration <= 1.0

    # Use the colder of actual and apparent temperature when choosing.
    cold = min(low, feels)

    layers = []
    notes = []
    carry = []  # reasons to carry Emergency 3 without wearing it

    #
    # Warm weather
    #
    if cold >= 61:
        layers.append(PROLOGO)
        layers.append(BIBS)

        if wet:
            layers.append(EMERGENCY)

    #
    # Mild / cool
    #
    elif cold >= 54:
        layers.append(FONDO)
        layers.append(BIBS)

        if wet:
            layers.append(EMERGENCY)
        elif windy:
            carry.append("wind")

    #
    # Cool: Perfetto territory
    #
    elif cold >= 46:
        # For short, dry rides, avoid over-layering.
        skip_base = short and not wet and cold >= 50

        if has_perfetto:
            if skip_base:
                notes.append("Skipped Core Seamless because this is a short ride.")
            else:
                layers.append(CORE_SEAMLESS)
            layers.append(PERFETTO)

            if heavy_rain:
                layers.append(EMERGENCY)
        elif wet:
            layers.append(CORE_SEAMLESS)
            layers.append(FONDO)
            layers.append(EMERGENCY)
        else:
            layers.append(FONDO)

            if windy:
                layers.append(EMERGENCY)
                notes.append("Remove Emergency 3 once warmed up.")

        layers.append(BIBS)
        layers.append("Knee warmers")
        layers.append(GLOVES)

        if wet:
            layers.append(SHOE_COVERS)

    #
    # Cold
    #
    elif cold >= 39:
        layers.append(CORE_SEAMLESS)

        if has_perfetto:
            layers.append(PERFETTO)

            if heavy_rain:
                layers.append(EMERGENCY)
        else:
            layers.append(FONDO)

            if wet or windy:
                layers.append(EMERGENCY)

        layers.append(TIGHTS)
        layers.append(GLOVES)
        layers.append(SHOE_COVERS)

    else:
        layers.append(CORE_SEAMLESS)

        if has_perfetto:
            layers.append(PERFETTO)

            if heavy_rain:
                layers.append(EMERGENCY)
        else:
            layers.append(FONDO)
            layers.append(EMERGENCY)

        layers.append(TIGHTS)
        layers.append(GLOVES)
        layers.append(SHOE_COVERS)
        layers.append("Cycling cap / ear coverage")

        notes.append(
            "Below ~39°F you're approaching the lower end of this wardrobe."
        )
        notes.append(
            "Perfetto RoS 2 gloves are thin for this cold;"
            " add liner gloves if you have them."
        )

    if EMERGENCY not in layers:
        if wet:
            carry.append("rain likely")
        elif maybe_rain:
            carry.append("chance of rain")

        if carry:
            notes.append(
                f"Carry Emergency 3 in jersey pocket ({', '.join(carry)})."
            )

    if high - low >= TEMP_SWING:
        notes.append(
            f"Temperature changes by {high - low:.0f}°F during the ride;"
            " wear layers you can take off or put on."
        )

    return layers, notes


def clock_time(value):
    """argparse type for --start: "now" or a 24-hour HH:MM time."""
    if value == "now":
        return None

    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        raise argparse.ArgumentTypeError(
            f'expected "now" or HH:MM (e.g. 08:00), got {value!r}'
        )


def positive_hours(value):
    try:
        hours = float(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a number: {value!r}")

    if not math.isfinite(hours) or hours <= 0:
        raise argparse.ArgumentTypeError("must be a positive number")

    if hours > FORECAST_DAYS * 24:
        raise argparse.ArgumentTypeError(
            f"must be at most {FORECAST_DAYS * 24} (the forecast length)"
        )

    return hours


def place_arg(value):
    value = value.strip()

    if not value:
        raise argparse.ArgumentTypeError("must not be empty")

    return value


def resolve_start(clock, now):
    if clock is None:
        return now

    start = datetime.combine(now.date(), clock, tzinfo=now.tzinfo)

    if start < now - START_GRACE:
        start += timedelta(days=1)

    return start


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--start",
        type=clock_time,
        default="now",
        help='Ride start time, e.g. "08:00" or "now". A time that has'
             " already passed today means tomorrow.",
    )
    parser.add_argument(
        "--hours",
        type=positive_hours,
        default=1.0,
        help="Ride duration in hours (default: 1)",
    )
    parser.add_argument(
        "--perfetto",
        action=argparse.BooleanOptionalAction,
        default=HAS_PERFETTO,
        help=f"Whether the Perfetto RoS 3 is available (default: {HAS_PERFETTO})",
    )
    parser.add_argument(
        "--place",
        type=place_arg,
        help='Place name, e.g. "Seattle" or "Portland, ME"'
             f" (default: {DEFAULT_PLACE})",
    )
    parser.add_argument(
        "--lat",
        type=float,
        help=f"Latitude, instead of --place (default: {DEFAULT_LAT})",
    )
    parser.add_argument(
        "--lon",
        type=float,
        help=f"Longitude, instead of --place (default: {DEFAULT_LON})",
    )

    args = parser.parse_args()

    if args.place is not None and (args.lat is not None or args.lon is not None):
        parser.error("use either --place or --lat/--lon, not both")
    if (args.lat is None) != (args.lon is None):
        parser.error("--lat and --lon must be given together")

    try:
        if args.place is not None:
            place, lat, lon = geocode(args.place)
        elif args.lat is not None:
            place, lat, lon = None, args.lat, args.lon
        else:
            place, lat, lon = DEFAULT_PLACE, DEFAULT_LAT, DEFAULT_LON

        data = fetch_weather(lat, lon)
    except LookupError as e:
        sys.exit(str(e))
    except urllib.error.HTTPError as e:
        sys.exit(f"Open-Meteo rejected the request: {api_error(e)}")
    except (OSError, ValueError) as e:
        sys.exit(f"Could not reach Open-Meteo: {e}")

    now = datetime.now(ZoneInfo(data["timezone"]))
    start = resolve_start(args.start, now)

    try:
        w = ride_weather(data, start, args.hours)
    except RuntimeError as e:
        sys.exit(str(e))

    layers, notes = recommend(w, args.hours, args.perfetto)

    end = start + timedelta(hours=args.hours)
    end_format = "%I:%M %p" if end.date() == start.date() else "%a %I:%M %p"

    location = f"{lat:.4f}, {lon:.4f}"
    if place:
        location = f"{place} ({location})"

    print()
    print(f"Location: {location}")
    print(
        f"Ride: {start:%a %b %d, %I:%M %p}"
        f" – {end:{end_format}}"
    )
    print(
        f"Temperature: {w['low']:.0f}–{w['high']:.0f}°F"
    )
    print(
        f"Feels as low as: {w['feels_low']:.0f}°F"
    )
    print(
        f"Rain probability: {w['rain_probability']:.0f}%"
        f" (up to {w['rain_max_hourly']:.2f} in/hour)"
    )
    print(
        f"Max wind: {w['wind']:.0f} mph, gusts {w['gusts']:.0f} mph"
    )

    if w["partial"]:
        print("\nWARNING: the forecast ends before your ride does.")

    print("\nWEAR:")
    for item in layers:
        print(f"  • {item}")

    if notes:
        print("\nNOTES:")
        for note in notes:
            print(f"  • {note}")

    print()


if __name__ == "__main__":
    main()
