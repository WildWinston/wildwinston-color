# Color Time

A free, offline-first coloring web app for little kids. No ads, no accounts, no paywall. Static files only.

Open the site in Safari (iPad/iPhone) or Chrome (Android) and use **Add to Home Screen**. It runs full-screen and works offline after the first visit.

## Features

- Tap to fill (respects black line art, SVG or PNG), free draw with 3 brush sizes, stickers
- Bright palette plus rainbow and glitter
- Undo, Clear (with confirm), Save to Photos (share sheet or download)
- Autosaves each picture on the device (IndexedDB). Nothing is uploaded.

## Adding a custom page

1. Add a line-art file to `custom/` (SVG, or PNG with black lines on white/transparent). For PNGs in this repo,
   add the base64 text as `assets-b64/custom__<name>.png.b64` (`base64 -w 76 file.png > ...`); the Pages workflow decodes it.
2. Add an entry to `custom/pages.json`: `{ "id": "my-page", "title": "Short Name", "file": "my-page.png" }`
3. In `sw.js`, bump `CACHE_VERSION` and add `'./custom/my-page.png'` to `ASSETS`.

Close every outline (gaps let the fill leak), and use thick lines.

## Deploy

`.github/workflows/pages.yml` decodes `assets-b64/` into the original PNGs and publishes the site with GitHub Pages (Actions).
