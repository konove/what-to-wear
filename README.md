# What to Wear

Picks cycling kit from my wardrobe for a ride's forecast
([Open-Meteo](https://open-meteo.com/)).

**Web app:** https://konove.github.io/what-to-wear/. It runs entirely in the
browser. Settings, chosen colors and photos are saved on each device.

**Command line:**

```sh
./what_to_wear.py --start 08:00 --hours 2 --place Seattle
```

## Files

- `what_to_wear.py`: the CLI and the source of truth for the rules.
- `wear.js`: a port of the forecast and recommendation logic for the web app.
- `index.html`, `app.js`: the web app.

## Tests

```sh
python3 -m unittest
node --test   # also checks wear.js against what_to_wear.py
```
