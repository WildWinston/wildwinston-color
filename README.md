# Color Time

A free, offline-first coloring web app for little kids. No ads, no accounts, no paywall. Static files only.

Open the site in Safari (iPad/iPhone) or Chrome (Android) and use **Add to Home Screen**. It runs full-screen and works offline after the first visit.

## Features

- Tap to fill (respects black line art, SVG or PNG), free draw with 3 brush sizes, stickers
- Bright palette plus rainbow and glitter
- Undo, Clear (with confirm), Save to Photos (share sheet or download)
- Autosaves each picture on the device (IndexedDB). Nothing is uploaded.

## Adding a custom page

1. SVG: put it in `custom/` and add `{ "id": "my-page", "title": "Short Name", "file": "my-page.svg" }` to `custom/pages.json`.
2. PNG (black lines on white/transparent): this repo stores PNGs as base64 text, decoded in the browser.
   Split it into chunks: `base64 -w 76 my-page.png | split -l 15 -d -a 2 - assets-b64/custom__my-page.png.b64.`
   Then add `{ "id": "my-page", "title": "Short Name", "b64": "assets-b64/custom__my-page.png.b64", "parts": N }`
   (N = number of chunk files). A single unsplit `.b64` file also works: omit `parts`.
3. Bump `CACHE_VERSION` in `sw.js`. The service worker caches whatever `custom/pages.json` lists.

Close every outline (gaps let the fill leak), and use thick lines.

## Deploy

Plain static files, no build step. GitHub Pages: Settings > Pages > Source: Deploy from a branch, `main`, `/ (root)`.
`.nojekyll` makes Pages serve every file as-is.
