/* Color Time — main logic */
(function () {
  'use strict';

  const COLORS = [
    '#FF3B5C', // red
    '#FF8A3D', // orange
    '#FFD93D', // yellow
    '#6BCB77', // green
    '#4D96FF', // blue
    '#9B59B6', // purple
    '#FF69B4', // pink
    '#00C9A7', // teal
    '#A0522D', // brown
    '#87CEEB', // sky
    '#FFFFFF', // white
    '#222222', // dark
    'rainbow', // special
    'glitter'  // special
  ];

  const STICKERS = ['⭐', '❤️', '🌸', '🦋', '🌈', '🦄', '🐶', '🐱', '🍎', '🎈', '✨', '☀️', '🌙', '🍀', '🎀', '💎'];

  const BRUSH_SIZES = [12, 24, 40]; // CSS px
  const WALL_ALPHA = 110; // line-mask alpha above this = wall (≈ darker than mid-gray)
  const FILL_TOLERANCE = 48;
  const MIN_PX = 800, MAX_PX = 1600; // internal canvas resolution bounds
  const STORAGE_PREFIX = 'color-time-';
  const INDEX_KEY = 'color-time-index';
  const MAX_UNDO = 10;

  // DOM
  const homeEl = document.getElementById('home');
  const studioEl = document.getElementById('studio');
  const galleryEl = document.getElementById('gallery');
  const categoriesEl = document.getElementById('categories');
  const colorCanvas = document.getElementById('colorCanvas');
  const lineCanvas = document.getElementById('lineCanvas');
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
  const lineCtx = lineCanvas.getContext('2d', { willReadFrequently: true });
  const paletteEl = document.getElementById('palette');
  const brushSizesEl = document.getElementById('brushSizes');
  const stickerRowEl = document.getElementById('stickerRow');
  const canvasWrap = document.getElementById('canvasWrap');
  const modalEl = document.getElementById('confirmModal');
  const toastEl = document.getElementById('toast');

  // State
  let currentCategory = 'animals';
  let currentPage = null; // {id, title, file, category}
  let tool = 'fill'; // fill | draw | sticker
  let color = COLORS[0];
  let brushSize = BRUSH_SIZES[1];
  let sticker = STICKERS[0];
  let undoStack = [];
  let drawing = false;
  let lastPt = null;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let canvasDisplayW = 0;
  let canvasDisplayH = 0;
  let wallMask = null; // Uint8Array, 1 = black line (wall)
  let lineImg = null; // currently loaded line-art Image
  let saveTimer = null;
  let customPages = [];

  // ---------- Utils ----------
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ---------- Autosave (IndexedDB blobs; tiny index in localStorage for badges) ----------
  let dbPromise = null;
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no idb'));
      const req = indexedDB.open('color-time', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('pages');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function idbGet(key) {
    const d = await db();
    return new Promise((res, rej) => {
      const r = d.transaction('pages').objectStore('pages').get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbPut(key, val) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction('pages', 'readwrite');
      tx.objectStore('pages').put(val, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  function savedIndex() {
    try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '{}'); } catch (e) { return {}; }
  }
  function markSaved(id, on) {
    try {
      const idx = savedIndex();
      if (on) idx[id] = Date.now(); else delete idx[id];
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    } catch (e) { /* ignore */ }
  }
  function storageKey(pageId) { return STORAGE_PREFIX + pageId; }
  function hasSaved(pageId) { return !!savedIndex()[pageId]; }

  function saveProgress() {
    if (!currentPage) return Promise.resolve();
    const id = currentPage.id;
    return new Promise((resolve) => {
      colorCanvas.toBlob(async (blob) => {
        try {
          if (blob) { await idbPut(storageKey(id), blob); markSaved(id, true); }
        } catch (e) { console.warn('save failed', e); }
        resolve();
      }, 'image/png');
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProgress, 500);
  }

  function pushUndo() {
    try {
      undoStack.push(colorCtx.getImageData(0, 0, colorCanvas.width, colorCanvas.height));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    } catch (e) { /* ignore */ }
  }

  function undo() {
    if (!undoStack.length) return;
    const img = undoStack.pop();
    colorCtx.putImageData(img, 0, 0);
    scheduleSave();
  }

  // ---------- Rainbow / glitter helpers ----------
  function rainbowAt(x, y) {
    const hue = ((x + y) * 0.5) % 360;
    const c = hslToRgb(hue / 360, 0.85, 0.55);
    return c;
  }

  function glitterAt(x, y) {
    const base = hslToRgb(((x * 0.3 + y * 0.7) % 360) / 360, 0.7, 0.6);
    // sparkle noise
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const spark = n - Math.floor(n);
    if (spark > 0.92) return [255, 255, 220, 255];
    if (spark > 0.85) return [255, 215, 0, 255];
    return base;
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
  }

  function parseColor(c) {
    if (c === 'rainbow' || c === 'glitter') return c;
    const el = document.createElement('canvas');
    el.width = el.height = 1;
    const ctx = el.getContext('2d');
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], 255];
  }

  function getFillColorAt(x, y) {
    if (color === 'rainbow') return rainbowAt(x, y);
    if (color === 'glitter') return glitterAt(x, y);
    return parseColor(color);
  }

  // ---------- Flood fill (scanline, wall mask from line art) ----------
  function floodFill(cx, cy) {
    const w = colorCanvas.width;
    const h = colorCanvas.height;
    const x0 = Math.floor(cx), y0 = Math.floor(cy);
    if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return false;
    if (wallMask && wallMask[y0 * w + x0]) return false;

    const img = colorCtx.getImageData(0, 0, w, h);
    const data = img.data;
    const p0 = (y0 * w + x0) * 4;
    const tr = data[p0], tg = data[p0 + 1], tb = data[p0 + 2];
    const special = color === 'rainbow' || color === 'glitter';
    let solid = null;
    if (!special) {
      solid = parseColor(color);
      if (Math.abs(tr - solid[0]) < 6 && Math.abs(tg - solid[1]) < 6 && Math.abs(tb - solid[2]) < 6) return false;
    }
    const tol = FILL_TOLERANCE;
    const mask = wallMask;
    const done = new Uint8Array(w * h);
    const ok = (i) => {
      if (done[i] || (mask && mask[i])) return false;
      const p = i * 4;
      return Math.abs(data[p] - tr) <= tol && Math.abs(data[p + 1] - tg) <= tol && Math.abs(data[p + 2] - tb) <= tol;
    };

    pushUndo();
    const stack = [x0, y0];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      let i = y * w + x;
      if (!ok(i)) continue;
      let lx = x;
      while (lx > 0 && ok(i - 1)) { lx--; i--; }
      let upOpen = false, downOpen = false;
      for (let xx = lx; xx < w; xx++) {
        const j = y * w + xx;
        if (!ok(j)) break;
        done[j] = 1;
        const p = j * 4;
        const c = special ? (color === 'rainbow' ? rainbowAt(xx, y) : glitterAt(xx, y)) : solid;
        data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
        if (y > 0) {
          const u = ok(j - w);
          if (u && !upOpen) { stack.push(xx, y - 1); upOpen = true; } else if (!u) upOpen = false;
        }
        if (y < h - 1) {
          const d = ok(j + w);
          if (d && !downOpen) { stack.push(xx, y + 1); downOpen = true; } else if (!d) downOpen = false;
        }
      }
    }
    // Grow fill 1-2px under the anti-aliased edge of the lines to avoid white halos
    // (those pixels sit under the semi-transparent line edge, so lines still look crisp).
    if (mask) {
      for (let pass = 0; pass < 2; pass++) {
        const grow = [];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            if (done[i] || !mask[i]) continue;
            if (done[i - 1] === 1 || done[i + 1] === 1 || done[i - w] === 1 || done[i + w] === 1) grow.push(i);
          }
        }
        for (const i of grow) {
          const n = done[i - 1] === 1 ? i - 1 : done[i + 1] === 1 ? i + 1 : done[i - w] === 1 ? i - w : i + w;
          const p = i * 4, q = n * 4;
          data[p] = data[q]; data[p + 1] = data[q + 1]; data[p + 2] = data[q + 2]; data[p + 3] = 255;
        }
        for (const i of grow) done[i] = 2; // 2 = grown, not a seed for next pass
        for (let k = 0; k < done.length; k++) if (done[k] === 2) done[k] = 1;
      }
    }
    colorCtx.putImageData(img, 0, 0);
    scheduleSave();
    return true;
  }

  // ---------- Drawing ----------
  function getCanvasPos(e) {
    const rect = colorCanvas.getBoundingClientRect();
    const clientX = e.clientX, clientY = e.clientY;
    const scaleX = colorCanvas.width / rect.width;
    const scaleY = colorCanvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function drawDot(x, y) {
    const size = brushSize * cssToPx();
    if (color === 'rainbow' || color === 'glitter') {
      colorCtx.save();
      const grad = colorCtx.createRadialGradient(x, y, 0, x, y, size / 2);
      if (color === 'rainbow') {
        const c = rainbowAt(x, y);
        const css = `rgba(${c[0]},${c[1]},${c[2]},0.85)`;
        grad.addColorStop(0, css);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      } else {
        grad.addColorStop(0, 'rgba(255,215,0,0.9)');
        grad.addColorStop(0.4, 'rgba(255,105,180,0.7)');
        grad.addColorStop(1, 'rgba(124,92,255,0)');
      }
      colorCtx.fillStyle = grad;
      colorCtx.beginPath();
      colorCtx.arc(x, y, size / 2, 0, Math.PI * 2);
      colorCtx.fill();
      colorCtx.restore();
    } else {
      colorCtx.save();
      colorCtx.lineCap = 'round';
      colorCtx.lineJoin = 'round';
      colorCtx.strokeStyle = color;
      colorCtx.fillStyle = color;
      colorCtx.beginPath();
      colorCtx.arc(x, y, size / 2, 0, Math.PI * 2);
      colorCtx.fill();
      colorCtx.restore();
    }
  }

  function cssToPx() { return canvasDisplayW ? colorCanvas.width / canvasDisplayW : dpr; }

  function drawStroke(x0, y0, x1, y1) {
    const size = brushSize * cssToPx();
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (size * 0.25)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      drawDot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }

  function placeSticker(x, y) {
    pushUndo();
    const size = Math.round(colorCanvas.width * 0.11);
    colorCtx.save();
    colorCtx.font = `${size}px serif`;
    colorCtx.textAlign = 'center';
    colorCtx.textBaseline = 'middle';
    colorCtx.fillText(sticker, x, y);
    colorCtx.restore();
    scheduleSave();
  }

  // ---------- Canvas sizing & loading ----------
  function sizeCanvases() {
    const wrap = canvasWrap.getBoundingClientRect();
    const pad = 16;
    const side = Math.max(100, Math.min(wrap.width - pad, wrap.height - pad));
    canvasDisplayW = canvasDisplayH = side;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(side * dpr)));
    [colorCanvas, lineCanvas].forEach((c) => {
      if (c.width !== px) { c.width = px; c.height = px; }
      c.style.width = side + 'px';
      c.style.height = side + 'px';
    });
  }

  // ---------- Page image sources ----------
  // A page is either a plain image URL (page.file), or base64 text chunks of a PNG (page.b64),
  // so binary art can live in the repo as plain text. Chunks are joined and turned into a
  // data: URL, which is same-origin-safe (never taints the canvas, so flood fill works).
  const srcCache = new Map();
  function b64Urls(b64, parts) {
    if (Array.isArray(b64)) return b64;
    if (parts > 0) return Array.from({ length: parts }, (_, i) => b64 + '.' + String(i).padStart(2, '0'));
    return [b64];
  }
  function resolvePageSrc(page) {
    if (!page.b64) return Promise.resolve(page.file);
    if (!srcCache.has(page.id)) {
      const p = Promise.all(b64Urls(page.b64, page.parts).map((u) =>
        fetch(u).then((r) => { if (!r.ok) throw new Error('b64 ' + u + ' ' + r.status); return r.text(); })
      )).then((parts) => 'data:' + (page.mime || 'image/png') + ';base64,' + parts.join('').replace(/\s+/g, ''));
      p.catch(() => srcCache.delete(page.id));
      srcCache.set(page.id, p);
    }
    return srcCache.get(page.id);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed: ' + url));
      img.src = url;
    });
  }

  // Draw line art (SVG or PNG) into the line canvas as a pure black alpha mask:
  // alpha = darkness. White/transparent backgrounds become transparent, so colors show through
  // and lines always stay on top. Also builds the wall mask used by flood fill.
  function renderLineArt(img) {
    const s = lineCanvas.width;
    lineCtx.clearRect(0, 0, s, s);
    const iw = img.naturalWidth || s, ih = img.naturalHeight || s;
    const k = Math.min(s / iw, s / ih) * 0.96;
    const dw = iw * k, dh = ih * k;
    lineCtx.drawImage(img, (s - dw) / 2, (s - dh) / 2, dw, dh);
    const id = lineCtx.getImageData(0, 0, s, s);
    const d = id.data;
    wallMask = new Uint8Array(s * s);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const a = Math.round((255 - lum) * (d[i + 3] / 255));
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = a;
      if (a > WALL_ALPHA) wallMask[j] = 1;
    }
    lineCtx.putImageData(id, 0, 0);
  }

  function paintWhite() {
    colorCtx.fillStyle = '#FFFFFF';
    colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
  }

  async function openPage(page) {
    currentPage = page;
    undoStack = [];
    homeEl.classList.add('hidden');
    studioEl.classList.remove('hidden');
    sizeCanvases();
    paintWhite();
    lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
    wallMask = null;
    setTool('fill');
    try {
      lineImg = await loadImage(await resolvePageSrc(page));
      if (currentPage !== page) return;
      renderLineArt(lineImg);
      let blob = null;
      try { blob = await idbGet(storageKey(page.id)); } catch (e) { /* no idb */ }
      if (blob && currentPage === page) {
        const url = URL.createObjectURL(blob);
        const saved = await loadImage(url);
        URL.revokeObjectURL(url);
        colorCtx.drawImage(saved, 0, 0, colorCanvas.width, colorCanvas.height);
      }
    } catch (e) {
      console.warn('Failed to load page', e);
      toast('Could not load picture');
    }
    studioEl.dataset.ready = page.id;
  }

  function goHome() {
    clearTimeout(saveTimer);
    saveProgress();
    currentPage = null;
    delete studioEl.dataset.ready;
    studioEl.classList.add('hidden');
    homeEl.classList.remove('hidden');
    renderGallery();
  }

  // ---------- Clear / Save ----------
  function confirmClear() {
    modalEl.classList.remove('hidden');
  }

  function doClear() {
    modalEl.classList.add('hidden');
    pushUndo();
    colorCtx.fillStyle = '#FFFFFF';
    colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
    scheduleSave();
  }

  async function savePicture() {
    // Composite color + lines into one PNG
    const tmp = document.createElement('canvas');
    tmp.width = colorCanvas.width;
    tmp.height = colorCanvas.height;
    const ctx = tmp.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(colorCanvas, 0, 0);
    ctx.drawImage(lineCanvas, 0, 0);

    const filename = (currentPage ? currentPage.title : 'my') + '-coloring.png';

    tmp.toBlob(async (blob) => {
      if (!blob) return;
      // Prefer Web Share API (iOS Photos via share sheet)
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Color Time' });
            toast('Shared! 📸');
            return;
          }
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      // Fallback: download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
      toast('Saved! 💾');
    }, 'image/png');
  }

  // ---------- UI builders ----------
  function renderCategories() {
    categoriesEl.innerHTML = '';
    Object.keys(window.COLOR_PAGES).forEach((key) => {
      const cat = window.COLOR_PAGES[key];
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (key === currentCategory ? ' active' : '');
      btn.innerHTML = `<span class="emoji">${cat.emoji}</span><span>${cat.label}</span>`;
      btn.addEventListener('click', () => {
        currentCategory = key;
        renderCategories();
        renderGallery();
      });
      categoriesEl.appendChild(btn);
    });
  }

  function renderGallery() {
    galleryEl.innerHTML = '';
    const cat = window.COLOR_PAGES[currentCategory];
    const pages = currentCategory === 'custom' ? customPages : cat.pages;

    if (!pages.length) {
      galleryEl.innerHTML = `
        <div class="empty-custom">
          <div class="big">✨</div>
          <div>No custom pictures yet</div>
          <div style="font-size:13px;margin-top:8px;font-weight:500">Ask a grown-up to add some!</div>
        </div>`;
      return;
    }

    pages.forEach((page) => {
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.setAttribute('aria-label', page.title);
      const img = document.createElement('img');
      if (page.b64) resolvePageSrc(page).then((src) => { img.src = src; }).catch(() => {});
      else img.src = page.file;
      img.alt = page.title;
      img.draggable = false;
      btn.appendChild(img);
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = page.title;
      btn.appendChild(label);
      if (hasSaved(page.id)) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => openPage({ ...page, category: currentCategory }));
      galleryEl.appendChild(btn);
    });
  }

  function renderPalette() {
    paletteEl.innerHTML = '';
    COLORS.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'swatch';
      if (c === 'rainbow') btn.classList.add('rainbow');
      else if (c === 'glitter') btn.classList.add('glitter');
      else btn.style.background = c;
      if (c === '#FFFFFF') btn.style.border = '3px solid #ddd';
      if (c === color) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        color = c;
        renderPalette();
      });
      paletteEl.appendChild(btn);
    });
  }

  function renderBrushSizes() {
    brushSizesEl.innerHTML = '';
    BRUSH_SIZES.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'size-btn' + (s === brushSize ? ' active' : '');
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.width = s + 'px';
      dot.style.height = s + 'px';
      btn.appendChild(dot);
      btn.addEventListener('click', () => {
        brushSize = s;
        renderBrushSizes();
      });
      brushSizesEl.appendChild(btn);
    });
  }

  function renderStickers() {
    stickerRowEl.innerHTML = '';
    STICKERS.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'sticker-btn' + (s === sticker ? ' active' : '');
      btn.textContent = s;
      btn.addEventListener('click', () => {
        sticker = s;
        renderStickers();
      });
      stickerRowEl.appendChild(btn);
    });
  }

  function setTool(t) {
    tool = t;
    document.querySelectorAll('.tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === t);
    });
    brushSizesEl.classList.toggle('visible', t === 'draw');
    stickerRowEl.classList.toggle('visible', t === 'sticker');
    document.getElementById('fillHint').classList.toggle('visible', t === 'fill');
  }

  // ---------- Pointer events (one finger only; ignore extra touches) ----------
  let activePointer = null;
  function onPointerDown(e) {
    if (activePointer !== null) return;
    e.preventDefault();
    activePointer = e.pointerId;
    try { colorCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    const pt = getCanvasPos(e);
    if (tool === 'fill') {
      floodFill(pt.x, pt.y);
    } else if (tool === 'draw') {
      drawing = true;
      lastPt = pt;
      pushUndo();
      drawDot(pt.x, pt.y);
    } else if (tool === 'sticker') {
      placeSticker(pt.x, pt.y);
    }
  }
  function onPointerMove(e) {
    if (e.pointerId !== activePointer || !drawing || tool !== 'draw') return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) {
      const pt = getCanvasPos(ev);
      if (lastPt) drawStroke(lastPt.x, lastPt.y, pt.x, pt.y);
      lastPt = pt;
    }
  }
  function onPointerUp(e) {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    if (drawing) {
      drawing = false;
      lastPt = null;
      scheduleSave();
    }
  }
  colorCanvas.addEventListener('pointerdown', onPointerDown);
  colorCanvas.addEventListener('pointermove', onPointerMove);
  colorCanvas.addEventListener('pointerup', onPointerUp);
  colorCanvas.addEventListener('pointercancel', onPointerUp);
  // Block iOS gestures: pinch-zoom, double-tap zoom, long-press menu, scroll bounce
  ['touchstart', 'touchmove'].forEach((t) =>
    canvasWrap.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  colorCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('#studio')) e.preventDefault(); });

  // ---------- Toolbar ----------
  document.getElementById('btnBack').addEventListener('click', goHome);
  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnClear').addEventListener('click', confirmClear);
  document.getElementById('btnSave').addEventListener('click', savePicture);
  document.querySelectorAll('.tool-btn').forEach((b) => {
    b.addEventListener('click', () => setTool(b.dataset.tool));
  });
  document.getElementById('btnCancelClear').addEventListener('click', () => {
    modalEl.classList.add('hidden');
  });
  document.getElementById('btnConfirmClear').addEventListener('click', doClear);

  // Resize / rotate: keep colors, re-render lines at the new resolution
  let resizeT;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!currentPage || !lineImg) return;
      const snap = document.createElement('canvas');
      snap.width = colorCanvas.width; snap.height = colorCanvas.height;
      snap.getContext('2d').drawImage(colorCanvas, 0, 0);
      const before = colorCanvas.width;
      sizeCanvases();
      if (colorCanvas.width !== before) {
        paintWhite();
        colorCtx.drawImage(snap, 0, 0, colorCanvas.width, colorCanvas.height);
        renderLineArt(lineImg);
        undoStack = [];
      }
    }, 120);
  };
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvasWrap);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && currentPage) saveProgress();
  });

  // ---------- Custom pages ----------
  async function loadCustomPages() {
    try {
      const res = await fetch('custom/pages.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('no custom');
      const list = await res.json();
      // Entry: { id, title, file } (file in custom/), or { id, title, b64, parts?, mime? } where b64 is a
      // site-root path to base64 text (single file, or chunk prefix + parts count => prefix.00..NN, or an array).
      customPages = (list || []).filter((p) => p && p.id && (p.file || p.b64)).map((p) => ({
        id: 'custom-' + p.id,
        title: p.title || p.id,
        file: p.file ? 'custom/' + p.file : null,
        b64: p.b64 || null,
        parts: p.parts || 0,
        mime: p.mime || 'image/png'
      }));
      window.COLOR_PAGES.custom.pages = customPages;
    } catch (e) {
      customPages = [];
      window.COLOR_PAGES.custom.pages = [];
    }
  }

  // ---------- Init ----------
  async function init() {
    await loadCustomPages();
    renderCategories();
    renderGallery();
    renderPalette();
    renderBrushSizes();
    renderStickers();
    setTool('fill');
  }

  init();

  // Expose for tests
  window.__color = {
    openPage,
    floodFill,
    setTool,
    undo,
    goHome,
    get tool() { return tool; },
    get currentPage() { return currentPage; },
    get undoDepth() { return undoStack.length; },
    saveProgress,
    colorCanvas,
    lineCanvas
  };
})();
