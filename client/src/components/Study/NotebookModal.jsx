import React, { useEffect, useRef, useState } from 'react';
import useApi from '../../api/useApi';

export default function NotebookModal({ open, onClose, associatedDocId, initialTitle = 'Notebook' }) {
  const api = useApi();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: Math.min(window.innerWidth - 80, 900), height: Math.min(window.innerHeight - 120, 600) });
  const editorRef = useRef(null);
  const panelRef = useRef(null);
  const isPointerDown = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [position, setPosition] = useState({ left: 40, top: 40 });
  const canvasRef = useRef(null);
  const editorContainerRef = useRef(null);
  const surfaceRef = useRef(null);
  const [penEnabled, setPenEnabled] = useState(false);
  const [penColor, setPenColor] = useState('#ffd166');
  const [penSize, setPenSize] = useState(3);
  const [penAlpha, setPenAlpha] = useState(1);
  const [highlighterEnabled, setHighlighterEnabled] = useState(false);
  const [rulerEnabled, setRulerEnabled] = useState(false);
  // Physical ruler overlay state (panel-relative coordinates)
  const [ruler, setRuler] = useState({ x: 280, y: 200, length: 420, angle: 0 });
  const rulerDragRef = useRef({ dragging: false, rotating: false, offsetX: 0, offsetY: 0 });
  const redoRef = useRef([]);
  const strokesRef = useRef([]); // each stroke: { color, size, points: [{x,y,p}], time }
  const drawingRef = useRef({ active: false, last: null });
  const snapshotImageRef = useRef(null);
  const [maximized, setMaximized] = useState(false);
  const [notes, setNotes] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarListRef = useRef(null);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const editorDirtyRef = useRef(false);
  const penDirtyRef = useRef(false);
  const PAGE_INCREMENT = 600;
  const [pageHeight, setPageHeight] = useState(() => Math.max(600, Math.min(window.innerHeight - 120, 1000)));
  // Fixed document width to preserve drawing scale across resizes
  const [docWidth, setDocWidth] = useState(null);
  const LINE_GAP = 28;
  const EDITOR_PADDING = 16;
  // Remove global editor font size; we'll adjust selection/line font size inline
  // Show/hide toolbar
  const [toolsHidden, setToolsHidden] = useState(false);
  // View zoom (visual scale only; drawing scale stays fixed to docWidth)
  const [zoom, setZoom] = useState(1);
  const clampZoom = (z) => Math.max(0.25, Math.min(4, z));
  const zoomIn = () => setZoom(z => clampZoom(Math.round((z + 0.1) * 10) / 10));
  const zoomOut = () => setZoom(z => clampZoom(Math.round((z - 0.1) * 10) / 10));
  const resetZoom = () => setZoom(1);
  const fitWidth = () => {
    const cont = editorContainerRef.current;
    const w = cont ? cont.clientWidth : null;
    if (!w || !docWidth) return;
    setZoom(clampZoom(w / docWidth));
  };

  // Helper: adjust font size for current selection or current line by inline style
  const adjustSelectionFontSize = (delta) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Helper to find nearest element ancestor within editor
    const nearestElInEditor = (node) => {
      let n = node;
      while (n && n !== ed && n.nodeType !== 1) n = n.parentNode;
      if (!n || n === ed) return null;
      return n.nodeType === 1 ? n : n.parentElement;
    };

    if (range.collapsed) {
      // No selection: adjust the current block/inline container (but not the whole editor)
      const el = nearestElInEditor(sel.anchorNode);
      if (!el) {
        // Insert a zero-width span with adjusted size at caret
        const base = ed;
        const cur = parseInt(window.getComputedStyle(base).fontSize, 10) || 16;
        const next = Math.max(12, Math.min(28, cur + delta));
        const span = document.createElement('span');
        span.textContent = '\u200b';
        span.style.fontSize = `${next}px`;
        range.insertNode(span);
        // move caret after span
        sel.removeAllRanges();
        const r = document.createRange();
        r.setStartAfter(span);
        r.collapse(true);
        sel.addRange(r);
      } else {
        try {
          const cs = window.getComputedStyle(el);
          const cur = parseInt(cs.fontSize, 10) || 16;
          const next = Math.max(12, Math.min(28, cur + delta));
          el.style.fontSize = `${next}px`;
        } catch {}
      }
    } else {
      // There is a selection: wrap extracted contents in a styled span
      const baseEl = nearestElInEditor(range.commonAncestorContainer) || ed;
      const cur = parseInt(window.getComputedStyle(baseEl).fontSize, 10) || 16;
      const next = Math.max(12, Math.min(28, cur + delta));
      const frag = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = `${next}px`;
      span.appendChild(frag);
      range.insertNode(span);
      // Keep selection around updated text
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(span);
      sel.addRange(r);
    }
    editorDirtyRef.current = true;
    triggerAutosave();
  };

  // Ensure page height follows content growth (typing/images)
  const adjustPageHeightToContent = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const needed = Math.ceil((ed.scrollHeight || ed.clientHeight || 0) + EDITOR_PADDING * 2);
    if (needed > pageHeight) setPageHeight(h => Math.max(h, needed));
  };

  // Apply styles to images inside editor and adjust height once they load
  const applyImageStyles = () => {
    const ed = editorRef.current; if (!ed) return;
    const imgs = ed.querySelectorAll('img');
    imgs.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '6px 0';
      if (!img.__qh_bound) {
        img.addEventListener('load', () => { adjustPageHeightToContent(); setTimeout(fitCanvas, 0); });
        img.__qh_bound = true;
      }
    });
  };

  useEffect(() => {
    if (!open) return;
    applyImageStyles();
    adjustPageHeightToContent();
    setTimeout(fitCanvas, 0);
  }, [open]);
  // Custom palette popover
  const paletteBtnRef = useRef(null);
  const paletteRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palettePos, setPalettePos] = useState({ left: 0, top: 0 });
  const [paletteHSV, setPaletteHSV] = useState({ h: 0, s: 1, v: 1 });
  const paletteDragRef = useRef({ mode: null }); // mode: 'sv' | 'hue' | null

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
    const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return { r: 0, g: 0, b: 0 };
    const v = m[1];
    return { r: parseInt(v.slice(0,2),16), g: parseInt(v.slice(2,4),16), b: parseInt(v.slice(4,6),16) };
  };
  const rgbToHex = (r,g,b) => `#${clamp(r,0,255).toString(16).padStart(2,'0')}${clamp(g,0,255).toString(16).padStart(2,'0')}${clamp(b,0,255).toString(16).padStart(2,'0')}`;
  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
  };
  const hsvToRgb = (h, s, v) => {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let rp=0, gp=0, bp=0;
    if (h >= 0 && h < 60) { rp=c; gp=x; bp=0; }
    else if (h < 120) { rp=x; gp=c; bp=0; }
    else if (h < 180) { rp=0; gp=c; bp=x; }
    else if (h < 240) { rp=0; gp=x; bp=c; }
    else if (h < 300) { rp=x; gp=0; bp=c; }
    else { rp=c; gp=0; bp=x; }
    return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
  };
  const openPaletteAtButton = () => {
    const btn = paletteBtnRef.current; const panel = panelRef.current;
    if (!btn || !panel) return;
    const b = btn.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    setPalettePos({ left: b.left - p.left, top: b.bottom - p.top + 6 });
    const { r, g, b: bb } = hexToRgb(penColor);
    const { h, s, v } = rgbToHsv(r, g, bb);
    setPaletteHSV({ h, s, v });
    setPaletteOpen(true);
  };
  useEffect(() => {
    if (!paletteOpen) return;
    const onDocClick = (e) => {
      const pal = paletteRef.current; const btn = paletteBtnRef.current;
      if (!pal || pal.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      setPaletteOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setPaletteOpen(false); };
    const onMove = (e) => {
      if (!paletteOpen || !paletteRef.current) return;
      const pal = paletteRef.current;
      if (paletteDragRef.current.mode === 'sv') {
        const sv = pal.querySelector('[data-sv]');
        if (!sv) return;
        const rect = sv.getBoundingClientRect();
        const sx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const sy = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        setPaletteHSV(prev => ({ ...prev, s: sx, v: 1 - sy }));
      } else if (paletteDragRef.current.mode === 'hue') {
        const hs = pal.querySelector('[data-hue]');
        if (!hs) return;
        const rect = hs.getBoundingClientRect();
        const hx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        setPaletteHSV(prev => ({ ...prev, h: Math.round(hx * 360) }));
      }
    };
    const onUp = () => { paletteDragRef.current.mode = null; };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onEsc); };
  }, [paletteOpen]);

  // In-modal dialog state
  const [dialog, setDialog] = useState({ type: null, note: null, value: '' });

  useEffect(() => {
    const onResize = () => {
      setSize((s) => ({ width: s.width, height: Math.min(window.innerHeight - 120, s.height) }));
      setTimeout(fitCanvas, 0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Autosave with debounce (1.5s after last change)
  const saveDebounced = useRef();
  const triggerAutosave = () => {
    clearTimeout(saveDebounced.current);
    saveDebounced.current = setTimeout(saveNow, 1500);
  };

  const fitCanvas = () => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas) return;
    const rect = (surface || canvas).getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Use fixed document width to avoid scaling drawings on panel resize
    const w = (docWidth ?? Math.floor(rect.width));
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(pageHeight * dpr));
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(pageHeight) + 'px';
    redrawCanvas();
    // Do not force scroll position here; preserve user scroll during resizes
  };

  useEffect(() => { setTimeout(fitCanvas, 0); }, [size, open]);
  useEffect(() => { setTimeout(fitCanvas, 0); }, [maximized]);
  useEffect(() => { setTimeout(fitCanvas, 0); }, [sidebarOpen]);
  useEffect(() => { setTimeout(fitCanvas, 0); }, [pageHeight]);
  useEffect(() => { setTimeout(fitCanvas, 0); }, [zoom]);

  // Observe surface size changes to keep canvas in sync
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { fitCanvas(); });
    ro.observe(surface);
    return () => { try { ro.disconnect(); } catch {} };
  }, [surfaceRef.current]);

  // Initialize fixed document width on open (first render) and keep it stable
  useEffect(() => {
    if (!open) return;
    if (docWidth != null) return;
    const surface = surfaceRef.current;
    const rect = surface ? surface.getBoundingClientRect() : null;
    const initial = rect ? Math.max(600, Math.floor(rect.width * 1.05)) : Math.floor(900 * 1.05);
    setDocWidth(initial);
    setTimeout(fitCanvas, 0);
  }, [open, docWidth]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw persisted snapshot image first, if any
    const img = snapshotImageRef.current;
    if (img && img.complete) {
      try {
        // Preserve aspect ratio: fit snapshot to the fixed document width, not the dynamic height
        const targetW = (docWidth ?? canvas.width / dpr);
        const targetH = img.naturalWidth > 0 ? (img.naturalHeight * (targetW / img.naturalWidth)) : (canvas.height / dpr);
        ctx.drawImage(img, 0, 0, targetW, targetH);
      } catch {}
    }
    // Right-edge max-width guide (faint vertical line)
    try {
      ctx.save();
      const wcss = canvas.width / dpr;
      ctx.strokeStyle = 'rgba(120,120,120,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(Math.max(0.5, wcss - 0.5), 0);
      ctx.lineTo(Math.max(0.5, wcss - 0.5), pageHeight);
      ctx.stroke();
      ctx.restore();
    } catch {}
    // Ruled lines removed per request; keep a clean canvas background otherwise
    const strokes = strokesRef.current || [];
    for (const s of strokes) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = s.alpha ?? 1;
  if (s.type === 'highlighter') ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const pts = s.points;
      if (!pts || pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  };

  // Project a client (screen) point onto the physical ruler line, returning surface-relative coords
  const projectToRulerSurfacePoint = (clientX, clientY) => {
    const panel = panelRef.current; const surface = surfaceRef.current;
    if (!panel || !surface) return null;
    const prect = panel.getBoundingClientRect();
    const srect = surface.getBoundingClientRect();
    // Ruler line origin (left-center) in client space
    const rx = prect.left + ruler.x;
    const ry = prect.top + ruler.y;
    const v = { x: Math.cos(ruler.angle), y: Math.sin(ruler.angle) };
    const px = clientX - rx; const py = clientY - ry;
    const t = (px * v.x + py * v.y); // projection scalar along v
    const projX = rx + t * v.x; const projY = ry + t * v.y;
    // Convert client coordinates to unscaled surface coordinates using current zoom
    return { x: (projX - srect.left) / zoom, y: (projY - srect.top) / zoom };
  };

  const getSnapshotBlob = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  };

  const saveNow = async () => {
    try {
      if (!open) return;
      setSaving(true);
      setError('');
      // Only save when a note is selected; do not implicitly create a new note due to pen usage
      if (!currentNoteId) { setSaving(false); return; }
      // Ensure canvas reflects latest strokes before snapshot
      redrawCanvas();
      const noteJson = JSON.stringify({ title, html: editorRef.current?.innerHTML || '' });
      const snapshotBlob = await getSnapshotBlob();
      const res = await api.saveNote({ noteId: currentNoteId, title, docId: associatedDocId || '', noteJson, snapshotBlob });
      if (!res.success) throw new Error(res.message || 'Failed to save');
      const savedNote = res.note;
      setLastSaved(new Date());
      // Update sidebar list immediately
      if (savedNote && savedNote._id) {
        setNotes(prev => {
          const arr = [...(prev || [])];
          const idx = arr.findIndex(x => x._id === savedNote._id);
          const merged = { ...(arr[idx] || {}), ...savedNote };
          merged.updatedAt = merged.updatedAt || new Date().toISOString();
          if (idx >= 0) arr[idx] = merged; else arr.unshift(merged);
          arr.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
          return arr;
        });
      }
      editorDirtyRef.current = false;
      penDirtyRef.current = false;
    } catch (e) {
      setError(e.message || 'Autosave failed');
    } finally {
      setSaving(false);
    }
  };

  // Export a note (current or from list) to PDF by rendering an offscreen copy of the page
  const exportNotePdf = async (note) => {
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const titleSafe = (note?.title || title || 'Notebook').replace(/[\\/:*?"<>|]+/g, '_');
      // Determine target width (document width in CSS px)
      const targetW = Math.floor((docWidth) || (surfaceRef.current ? surfaceRef.current.clientWidth / (zoom || 1) : 900));

      // Build offscreen surface
      const root = document.createElement('div');
      root.style.position = 'fixed';
      root.style.left = '-100000px';
      root.style.top = '0';
      root.style.zIndex = '-1';
      root.style.pointerEvents = 'none';
      const page = document.createElement('div');
      page.style.position = 'relative';
      page.style.width = `${targetW}px`;
      page.style.background = getComputedStyle(surfaceRef.current || document.body).getPropertyValue('--panel') || '#fff';
      // Editor layer
      const ed = document.createElement('div');
      ed.style.position = 'relative';
      ed.style.padding = `${EDITOR_PADDING}px`;
      ed.style.color = 'var(--text)';
      ed.style.background = 'transparent';
      ed.innerHTML = note?.contentHtml ?? editorRef.current?.innerHTML ?? '';
      // Canvas layer
      const cnv = document.createElement('canvas');
      cnv.style.position = 'absolute';
      cnv.style.inset = '0';
      cnv.style.pointerEvents = 'none';
      // Append and place in DOM so layout/loads work
      page.appendChild(ed);
      page.appendChild(cnv);
      root.appendChild(page);
      document.body.appendChild(root);

      // Ensure images within content load
      const imgs = Array.from(ed.querySelectorAll('img'));
      const waitImage = (img) => new Promise((resolve) => {
        if (img.complete) return resolve();
        const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
        img.addEventListener('load', done); img.addEventListener('error', done);
      });
      await Promise.race([
        Promise.all(imgs.map(waitImage)),
        new Promise(r => setTimeout(r, 5000))
      ]);

      // Compute page height from content
      const contentH = ed.scrollHeight + EDITOR_PADDING * 2;

      // Prepare pen layer canvas size (DPR-aware but we'll snapshot via html2canvas later)
      const dpr = window.devicePixelRatio || 1;
      const ctx = cnv.getContext('2d');
      cnv.width = Math.max(1, Math.floor(targetW * dpr));
      cnv.height = Math.max(1, Math.floor(contentH * dpr));
      cnv.style.width = `${targetW}px`;
      cnv.style.height = `${contentH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Draw snapshot/pen layer
      if (note && note._id === currentNoteId && canvasRef.current) {
        // Use live canvas to capture current strokes (not yet saved)
        try {
          ctx.drawImage(canvasRef.current, 0, 0, canvasRef.current.width / (window.devicePixelRatio || 1), canvasRef.current.height / (window.devicePixelRatio || 1));
        } catch {}
      } else if (note?.snapshotUrl) {
        // Load snapshot image and draw preserving aspect ratio at doc width
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const targetH = img.naturalWidth ? (img.naturalHeight * (targetW / img.naturalWidth)) : contentH;
              ctx.drawImage(img, 0, 0, targetW, targetH);
            } catch {}
            resolve();
          };
          img.onerror = () => resolve();
          img.src = note.snapshotUrl;
        });
      }

      // Set final page height as max of content and ink
      const finalH = Math.max(contentH, cnv.height / (window.devicePixelRatio || 1));
      page.style.height = `${finalH}px`;

      // Capture with html2canvas (ignore current zoom, use scale 2 for clarity)
      const snapshot = await html2canvas(page, { scale: 2, backgroundColor: null, useCORS: true });
      const imgData = snapshot.toDataURL('image/png');

      // Build PDF pages as A4 portrait in px units
      const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = snapshot.width;
      const imgH = snapshot.height;
      const scale = pageW / imgW;
      const outW = pageW;
      const outH = imgH * scale;

      let y = 0;
      while (y < outH - 0.1) {
        pdf.addImage(imgData, 'PNG', 0, -y, outW, outH, undefined, 'FAST');
        y += pageH;
        if (y < outH - 0.1) pdf.addPage();
      }

      pdf.save(`${titleSafe}.pdf`);

      // Cleanup
      document.body.removeChild(root);
    } catch (err) {
      console.error('Export PDF failed', err);
      setError('Failed to export PDF.');
      setTimeout(() => setError(''), 4000);
    }
  };

  useEffect(() => {
    return () => clearTimeout(saveDebounced.current);
  }, []);

  // Load notes when opening; select latest or create a default one so edits save immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      try {
        const res = await api.listNotes();
        const list = res.success ? (res.notes || []) : [];
        if (cancelled) return;
        setNotes(list);
        if (list.length > 0) {
          const n = list[0]; // list is sorted by updatedAt desc on server
          setCurrentNoteId(n._id);
          setTitle(n.title || 'Notebook');
          if (editorRef.current) editorRef.current.innerHTML = n.contentHtml || '';
          applyImageStyles();
          adjustPageHeightToContent();
          setTimeout(fitCanvas, 0);
          // reset drawing context and load snapshot if present
          strokesRef.current = [];
          snapshotImageRef.current = null;
          if (n.snapshotUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (!cancelled) {
                snapshotImageRef.current = img;
                // Expand page height to fit snapshot aspect at current doc width
                try {
                  const w = docWidth || img.naturalWidth || (surfaceRef.current?.clientWidth || 900);
                  const targetH = img.naturalWidth ? Math.ceil(img.naturalHeight * (w / img.naturalWidth)) : img.naturalHeight;
                  setPageHeight(h => Math.max(h, targetH + 16));
                } catch {}
                redrawCanvas();
              }
            };
            img.src = n.snapshotUrl;
          } else {
            redrawCanvas();
          }
          editorDirtyRef.current = false;
          penDirtyRef.current = false;
        } else {
          // Create a default note immediately
          const created = await api.newNote({ title: initialTitle || 'Untitled', docId: associatedDocId || '' });
          if (cancelled) return;
          if (created?.success && created.note) {
            const newNote = created.note;
            setNotes([newNote]);
            setCurrentNoteId(newNote._id);
            setTitle(newNote.title || 'Untitled');
            if (editorRef.current) editorRef.current.innerHTML = '';
            strokesRef.current = [];
            snapshotImageRef.current = null;
            redrawCanvas();
            editorDirtyRef.current = false;
            penDirtyRef.current = false;
          }
        }
      } catch {
        if (!cancelled) setNotes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  return (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Panel (draggable + resizable). We keep pointerEvents on panel only so background remains interactive where modal isn't. */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          left: maximized ? 10 : position.left,
          top: maximized ? 10 : position.top,
          width: maximized ? (window.innerWidth - 20) : size.width,
          height: maximized ? (window.innerHeight - 20) : size.height,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'grid',
          gridTemplateColumns: sidebarOpen ? '220px 1fr' : '0px 1fr',
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar: Previous Notes */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', minWidth: 0,
          overflow: 'hidden'
        }}>
            <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.8 }}>🗂️ Notes</span>
              <button className="secondary" onClick={async ()=>{
                const res = await api.listNotes();
                setNotes(res.success ? (res.notes || []) : []);
              }}>Refresh</button>
              <button onClick={async ()=>{
                // Save current note if dirty before creating new
                try { clearTimeout(saveDebounced.current); } catch {}
                if ((editorDirtyRef.current || penDirtyRef.current) && currentNoteId) {
                  await saveNow();
                }
                setDialog({ type: 'new', note: null, value: 'Untitled' });
              }}>New</button>
            </div>
            <div ref={sidebarListRef} style={{ overflow: 'auto', flex: 1 }}>
              {(notes || []).map((n) => (
                <div key={n._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div data-note-id={n._id} onClick={async ()=>{
                    // Save current note if dirty before switching
                    try { clearTimeout(saveDebounced.current); } catch {}
                    if ((editorDirtyRef.current || penDirtyRef.current) && currentNoteId) {
                      // Force a snapshot of current strokes before switching
                      redrawCanvas();
                      await saveNow();
                    }
                    // Switch note content
                    setTitle(n.title || 'Notebook');
                    setCurrentNoteId(n._id);
                    if (editorRef.current) editorRef.current.innerHTML = n.contentHtml || '';
                    applyImageStyles();
                    adjustPageHeightToContent();
                    setTimeout(fitCanvas, 0);
                    // Clear strokes for new note context
                    strokesRef.current = [];
                    // Adjust page height baseline when switching
                    setPageHeight(h => Math.max(h, 800));
                    // Load snapshot image if available
                    snapshotImageRef.current = null;
                    if (n.snapshotUrl) {
                      const img = new Image();
                      img.crossOrigin = 'anonymous';
                      img.onload = () => {
                        snapshotImageRef.current = img;
                        try {
                          const w = docWidth || img.naturalWidth || (surfaceRef.current?.clientWidth || 900);
                          const targetH = img.naturalWidth ? Math.ceil(img.naturalHeight * (w / img.naturalWidth)) : img.naturalHeight;
                          setPageHeight(h => Math.max(h, targetH + 16));
                        } catch {}
                        redrawCanvas();
                      };
                      img.src = n.snapshotUrl;
                    } else {
                      redrawCanvas();
                    }
                    editorDirtyRef.current = false;
                    penDirtyRef.current = false;
                  }} style={{ padding: '10px 12px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Notebook'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(n.updatedAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e)=> e.stopPropagation()}>
                      <button title="Download PDF" className="secondary" onClick={async ()=>{
                        // Build a minimal note object with current HTML if selected
                        const noteObj = (currentNoteId === n._id)
                          ? { ...n, contentHtml: editorRef.current?.innerHTML ?? n.contentHtml }
                          : n;
                        await exportNotePdf(noteObj);
                      }}>⬇️</button>
                      <button title="Rename" className="secondary" onClick={()=>{
                        setDialog({ type: 'rename', note: n, value: n.title || 'Notebook' });
                      }}>✏️</button>
                      <button title="Delete" className="secondary" onClick={()=>{
                        setDialog({ type: 'delete', note: n, value: '' });
                      }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'none', gap: 6, padding: '0 10px 10px' }}>
                    <button className="secondary" onClick={async ()=>{
                      const ok = confirm('Delete this note permanently?');
                      if (!ok) return;
                      const r = await api.deleteNote(n._id);
                      if (r.success) {
                        setNotes((prev)=> (prev||[]).filter(x=> x._id !== n._id));
                        if (currentNoteId === n._id) {
                          setCurrentNoteId(null);
                          if (editorRef.current) editorRef.current.innerHTML = '';
                          strokesRef.current = [];
                          redrawCanvas();
                        }
                      }
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

  {/* Main column */}
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
        {/* Header (drag handle) */}
        <div
          onPointerDown={(e) => {
            if (e.button !== 0 || maximized) return;
            // Ignore drags when starting from interactive controls
            const t = e.target;
            const tag = (t && t.tagName) ? t.tagName.toUpperCase() : '';
            if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t?.closest?.('button, input, select, textarea')) return;
            isPointerDown.current = true;
            dragOrigin.current = { x: e.clientX, y: e.clientY, left: position.left, top: position.top };
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          }}
          onPointerMove={(e) => {
            if (!isPointerDown.current) return;
            const dx = e.clientX - dragOrigin.current.x;
            const dy = e.clientY - dragOrigin.current.y;
            setPosition({ left: Math.max(10, dragOrigin.current.left + dx), top: Math.max(10, dragOrigin.current.top + dy) });
          }}
          onPointerUp={(e) => {
            isPointerDown.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          }}
          style={{
            cursor: 'move',
            padding: '6px 10px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'sticky',
            top: 0,
            zIndex: 3
          }}
        >
          <span title="Move" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, opacity: 0.9 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 3l3.89 3.89-1.41 1.41L13 6.83V11h4.17l-1.47-1.47 1.41-1.41L21 12l-3.89 3.89-1.41-1.41L17.17 13H13v4.17l1.47-1.47 1.41 1.41L13 21l-3.89-3.89 1.41-1.41L11 17.17V13H6.83l1.47 1.47-1.41 1.41L3 13l3.89-3.89 1.41 1.41L6.83 11H11V6.83L9.53 8.3 8.12 6.89 13 3z"/>
            </svg>
          </span>
          <input value={title} onChange={(e) => { setTitle(e.target.value); triggerAutosave(); }} style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {saving ? 'Saving…' : (lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave on')}
          </div>
          <button className="secondary" onClick={(e)=>{ e.stopPropagation(); setToolsHidden(v=>!v); }}>{toolsHidden ? 'Show Tools' : 'Hide Tools'}</button>
          {/* Quick zoom controls in header for convenience */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button className="secondary" onClick={(e)=>{ e.stopPropagation(); zoomOut(); }} title="Zoom out">-</button>
            <span style={{ minWidth: 44, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{Math.round(zoom*100)}%</span>
            <button className="secondary" onClick={(e)=>{ e.stopPropagation(); zoomIn(); }} title="Zoom in">+</button>
            <button className="secondary" onClick={(e)=>{ e.stopPropagation(); resetZoom(); }} title="Reset zoom">100%</button>
            <button className="secondary" onClick={(e)=>{ e.stopPropagation(); fitWidth(); }} title="Fit to width">Fit</button>
          </div>
          <button className="secondary" onClick={(e)=>{ e.stopPropagation(); setSidebarOpen(v => !v); }}>{sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}</button>
          <button className="secondary" onClick={(e)=>{ e.stopPropagation(); setMaximized(m => !m); }}>{maximized ? 'Restore' : 'Maximize'}</button>
          <button className="secondary" title="Download current note as PDF" onClick={(e)=>{ e.stopPropagation(); const cur = notes.find(x=> x._id === currentNoteId); const noteObj = cur ? { ...cur, contentHtml: editorRef.current?.innerHTML ?? cur.contentHtml } : { _id: currentNoteId, title, contentHtml: editorRef.current?.innerHTML || '' }; exportNotePdf(noteObj); }}>Download</button>
          <button className="secondary" onClick={(e)=>{ e.stopPropagation(); try{ clearTimeout(saveDebounced.current); }catch{}; (async()=>{ try { await saveNow(); } finally { onClose && onClose(); } })(); }}>Close</button>
        </div>

        {/* Toolbar - can be hidden */}
  {!toolsHidden && (
    <div style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 2, background: 'var(--panel)' }}>
          <label className="nav-button" title="Add from gallery" style={{ padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid var(--border)', borderRadius: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z" stroke="#333" strokeWidth="1.5" fill="#fff"/>
              <path d="M14 3v4a2 2 0 0 0 2 2h4" stroke="#333" strokeWidth="1.5"/>
              <circle cx="9" cy="11" r="2" stroke="#333" strokeWidth="1.5"/>
              <path d="M4 19l4.5-4.5 3 3L16 13l4 6" stroke="#333" strokeWidth="1.5" fill="none"/>
            </svg>
            <span style={{ color: '#333' }}>Add from Gallery</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              // insert as <img>
              const url = URL.createObjectURL(file);
              document.execCommand('insertImage', false, url);
              applyImageStyles();
              adjustPageHeightToContent();
              setTimeout(() => { fitCanvas(); triggerAutosave(); }, 0);
              try { e.target.value = ''; } catch {}
            }} />
          </label>
          <button className="nav-button" style={{ padding: '6px 10px', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => { document.execCommand('bold'); triggerAutosave(); }} title="Bold"><b>B</b></button>
          <button className="nav-button" style={{ padding: '6px 10px', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => { document.execCommand('italic'); triggerAutosave(); }} title="Italic"><i>I</i></button>
          <button className="nav-button" style={{ padding: '6px 10px', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => { document.execCommand('underline'); triggerAutosave(); }} title="Underline"><u>U</u></button>
          <button className="nav-button" style={{ padding: '6px 10px' }} title="Font smaller" onClick={() => adjustSelectionFontSize(-1)}>A-</button>
          <button className="nav-button" style={{ padding: '6px 10px' }} title="Font larger" onClick={() => adjustSelectionFontSize(1)}>A+</button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 6px' }} />
          <button className={penEnabled ? '' : 'secondary'} style={{ padding: '6px 10px' }} onClick={() => { setPenEnabled(v => !v); setHighlighterEnabled(false); }} title="Pen">✒️ Pen</button>
          <button className={highlighterEnabled ? '' : 'secondary'} style={{ padding: '6px 10px' }} onClick={() => { setHighlighterEnabled(v => !v); if (!highlighterEnabled) setPenEnabled(false); }} title="Highlighter">🖍️ Highlighter</button>
          <button className={rulerEnabled ? '' : 'secondary'} style={{ padding: '6px 10px' }} onClick={() => setRulerEnabled(v => !v)} title="Ruler">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18v6H3z"/><path d="M6 6v6M9 6v6M12 6v6M15 6v6M18 6v6"/></svg>
              Ruler
            </span>
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <button ref={paletteBtnRef} className="secondary" title="Choose custom color (RGB)" onClick={openPaletteAtButton} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a9.99 9.99 0 0 0-9.95 9.09c-.33 3.22 1.47 6.14 4.35 7.47A3 3 0 0 0 9 21h5a4 4 0 0 0 4-4v-.5a2.5 2.5 0 0 0-2.5-2.5H15a2 2 0 1 1 0-4h.5A2.5 2.5 0 0 0 18 7.5v-.02A10 10 0 0 0 12 2z"/></svg>
            Palette
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[
              {c:'#ff3b30',name:'Red'},{c:'#28a745',name:'Green'},{c:'#007bff',name:'Blue'},
              {c:'#ffd400',name:'Yellow'},{c:'#6f42c1',name:'Purple'},{c:'#000000',name:'Black'},{c:'#ffffff',name:'White'}
            ].map(({c,name}) => (
              <button key={c} title={name} onClick={()=> setPenColor(c)} style={{ width: 22, height: 22, borderRadius: 999, border: '1px solid var(--border)', background: c, boxShadow: c==='#ffffff'? 'inset 0 0 0 1px #ccc' : 'none' }} />
            ))}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 120px', alignItems: 'center', gap: 8 }}>
              <div title="Size preview" style={{ position: 'relative', width: 28, height: 28, borderRadius: 999, border: '1px solid var(--border)', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50%/10px 10px' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: Math.max(2, penSize), height: Math.max(2, penSize), borderRadius: 999, background: penColor, opacity: penAlpha }} />
              </div>
              <input type="range" min={1} max={20} value={penSize} onChange={(e)=> setPenSize(parseInt(e.target.value,10))} title="Pen size" />
            </div>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 120px', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Opacity</span>
              <input type="range" min={0.05} max={1} step={0.05} value={penAlpha} onChange={(e)=> setPenAlpha(parseFloat(e.target.value))} />
            </div>
          </div>
          <button className="secondary" onClick={() => { const s = strokesRef.current.pop(); if (s) { redoRef.current.push(s); } redrawCanvas(); triggerAutosave(); }} title="Undo">↶ Undo</button>
          <button className="secondary" onClick={() => { const s = redoRef.current.pop(); if (s) { strokesRef.current.push(s); } redrawCanvas(); triggerAutosave(); }} title="Redo">↷ Redo</button>
          <button className="secondary" onClick={() => { strokesRef.current = []; redoRef.current = []; redrawCanvas(); triggerAutosave(); }} title="Clear pen">Clear</button>
        </div>
  )}

        {/* Anchored Color Palette Popover (SV square + Hue slider) */}
        {paletteOpen && (
          <div ref={paletteRef} style={{ position: 'absolute', left: palettePos.left, top: palettePos.top, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 12, zIndex: 20, minWidth: 260 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {/* SV (saturation/value) square */}
              <div
                onMouseDown={(e)=>{
                  const rect = e.currentTarget.getBoundingClientRect();
                  const sx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                  const sy = clamp((e.clientY - rect.top) / rect.height, 0, 1);
                  setPaletteHSV(prev => ({ ...prev, s: sx, v: 1 - sy }));
                  paletteDragRef.current = { mode: 'sv' };
                }}
                data-sv
                style={{ position: 'relative', width: 240, height: 150, borderRadius: 6, overflow: 'hidden', cursor: 'crosshair', background: `hsl(${Math.round(paletteHSV.h)}deg, 100%, 50%)` }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0))' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #000, rgba(0,0,0,0))' }} />
                <div style={{
                  position: 'absolute',
                  left: `${paletteHSV.s * 240}px`,
                  top: `${(1 - paletteHSV.v) * 150}px`,
                  transform: 'translate(-50%, -50%)',
                  width: 12, height: 12, borderRadius: 999, border: '2px solid #fff', boxShadow: '0 0 0 1px #0003', pointerEvents: 'none'
                }} />
              </div>
              {/* Hue slider */}
              <div
                onMouseDown={(e)=>{
                  const rect = e.currentTarget.getBoundingClientRect();
                  const hx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                  setPaletteHSV(prev => ({ ...prev, h: Math.round(hx * 360) }));
                  paletteDragRef.current = { mode: 'hue' };
                }}
                data-hue
                style={{ position: 'relative', width: 240, height: 14, borderRadius: 7, background: 'linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
              >
                <div style={{ position: 'absolute', left: `${(paletteHSV.h/360) * 240}px`, top: 0, transform: 'translate(-50%, 0)', width: 2, height: 14, background: '#fff', boxShadow: '0 0 0 1px #0003' }} />
              </div>
              {/* Footer with preview + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {(() => { const { r, g, b } = hsvToRgb(paletteHSV.h, paletteHSV.s, paletteHSV.v); const hx = rgbToHex(r,g,b); return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 999, border: '1px solid var(--border)', background: hx }} />
                    <code style={{ fontSize: 12, color: 'var(--muted)' }}>{hx}</code>
                  </div>
                ); })()}
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <button className="secondary" onClick={()=> setPaletteOpen(false)}>Cancel</button>
                  <button onClick={()=> { const { r, g, b } = hsvToRgb(paletteHSV.h, paletteHSV.s, paletteHSV.v); setPenColor(rgbToHex(r,g,b)); setPaletteOpen(false); }}>Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor with zoomable surface */}
  <div ref={editorContainerRef} style={{ position: 'relative', flex: 1, overflowX: 'auto', overflowY: 'auto', background: 'var(--surface)' }}>
          {/* Zoom wrapper defines scroll area to match visual scale */}
          <div style={{ position: 'relative', width: docWidth ? Math.round(docWidth * zoom) : '100%', height: Math.round(pageHeight * zoom) }}>
            <div
              ref={surfaceRef}
              style={{ position: 'absolute', left: 0, top: 0, height: pageHeight, width: docWidth || '100%', touchAction: 'none', transform: `scale(${zoom})`, transformOrigin: 'top left', background: 'var(--panel)' }}
            onPointerDown={(e)=>{
              const wantDraw = highlighterEnabled || penEnabled || (e.pointerType && e.pointerType !== 'mouse');
              if (!wantDraw) return;
              e.preventDefault();
              const rect = surfaceRef.current?.getBoundingClientRect();
              if (!rect) return;
              let x = (e.clientX - rect.left) / zoom; let y = (e.clientY - rect.top) / zoom;
              if (rulerEnabled) {
                const p = projectToRulerSurfacePoint(e.clientX, e.clientY);
                if (p) { x = p.x; y = p.y; }
              }
              drawingRef.current.active = true;
              redoRef.current = [];
              const stroke = {
                type: highlighterEnabled ? 'highlighter' : 'pen',
                color: penColor,
                alpha: highlighterEnabled ? Math.min(0.5, penAlpha) : penAlpha,
                size: highlighterEnabled ? Math.max(penSize, 12) : penSize,
                points: [{ x, y, p: e.pressure || 0.5 }],
                time: Date.now()
              };
              strokesRef.current.push(stroke);
              if (y > pageHeight - 80) {
                setPageHeight(h => h + PAGE_INCREMENT);
              }
              redrawCanvas();
            }}
            onPointerMove={(e)=>{
              if (!drawingRef.current.active) return;
              e.preventDefault();
              const rect = surfaceRef.current?.getBoundingClientRect();
              if (!rect) return;
              let x = (e.clientX - rect.left) / zoom; let y = (e.clientY - rect.top) / zoom;
              if (rulerEnabled) {
                const p = projectToRulerSurfacePoint(e.clientX, e.clientY);
                if (p) { x = p.x; y = p.y; }
              }
              const strokes = strokesRef.current;
              const stroke = strokes[strokes.length - 1];
              if (!stroke) return;
              if (rulerEnabled) stroke.points = [stroke.points[0], { x, y, p: e.pressure || 0.5 }]; else stroke.points.push({ x, y, p: e.pressure || 0.5 });
              if (y > pageHeight - 80) {
                setPageHeight(h => h + PAGE_INCREMENT);
                // keep current scroll position; do not auto-scroll to bottom during drawing
              }
              redrawCanvas();
            }}
            onPointerUp={(e)=>{
              if (!drawingRef.current.active) return;
              drawingRef.current.active = false;
              penDirtyRef.current = true;
              triggerAutosave();
            }}
            onPointerCancel={()=>{ drawingRef.current.active = false; }}
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => { editorDirtyRef.current = true; adjustPageHeightToContent(); setTimeout(fitCanvas, 0); triggerAutosave(); applyImageStyles(); }}
              style={{
                position: 'absolute', inset: 0,
                padding: EDITOR_PADDING,
                outline: 'none',
                color: 'var(--text)',
                background: 'transparent',
                // Keep editor interactive for text while pen/touch draws on the surface
                pointerEvents: 'auto',
                lineHeight: `${LINE_GAP}px`
              }}
              placeholder="Start taking notes…"
            />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: 8, color: '#ff7c7c', borderTop: '1px solid var(--border)', fontSize: 12 }}>{error}</div>
        )}

        {/* Physical movable ruler overlay */}
        {rulerEnabled && (
          <div
            onPointerDown={(e)=>{
              e.stopPropagation();
              const t = e.target;
              if (t && t.getAttribute && t.getAttribute('data-rot-handle') === '1') {
                // Start rotating
                rulerDragRef.current = { dragging: false, rotating: true };
              } else {
                // Start dragging
                const rect = panelRef.current.getBoundingClientRect();
                rulerDragRef.current = { dragging: true, rotating: false, offsetX: e.clientX - (rect.left + ruler.x), offsetY: e.clientY - (rect.top + ruler.y) };
              }
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
            }}
            onPointerMove={(e)=>{
              if (!rulerEnabled) return;
              const rect = panelRef.current.getBoundingClientRect();
              if (rulerDragRef.current.dragging) {
                const nx = e.clientX - rect.left - rulerDragRef.current.offsetX;
                const ny = e.clientY - rect.top - rulerDragRef.current.offsetY;
                setRuler(r => ({ ...r, x: Math.max(0, Math.min(nx, rect.width)), y: Math.max(0, Math.min(ny, rect.height)) }));
              } else if (rulerDragRef.current.rotating) {
                const cx = rect.left + ruler.x;
                const cy = rect.top + ruler.y;
                const dx = e.clientX - cx; const dy = e.clientY - cy;
                const ang = Math.atan2(dy, dx);
                setRuler(r => ({ ...r, angle: ang }));
              }
            }}
            onPointerUp={(e)=>{
              rulerDragRef.current = { dragging: false, rotating: false, offsetX: 0, offsetY: 0 };
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            }}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
          >
            <div
              style={{
                position: 'absolute',
                left: ruler.x, top: ruler.y,
                width: ruler.length, height: 28,
                transform: `rotate(${ruler.angle}rad)`, transformOrigin: '0 50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,240,240,0.98))',
                border: '1px solid var(--border)', borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                color: '#333',
                display: rulerEnabled ? 'flex' : 'none', alignItems: 'center',
                pointerEvents: 'auto',
                padding: '0 6px', gap: 8
              }}
            >
              {/* Tick layers */}
              <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 8, background: 'repeating-linear-gradient(90deg, #9aa0a6 0 1px, transparent 1px 10px)' }} />
              <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 12, background: 'repeating-linear-gradient(90deg, #6b7280 0 1.5px, transparent 1.5px 50px)' }} />
              {/* Ruler hole */}
              <div aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 999, border: '1px solid #cfcfcf', background: 'radial-gradient(circle at 30% 30%, #ffffff 0 40%, #e8e8e8 75% 100%)' }} />
              <div style={{ flex: 1 }} />
              <button className="secondary" data-rot-handle="1" title="Rotate" style={{ cursor: 'grab' }}>⟳</button>
            </div>
          </div>
        )}

        {/* Resize handle (bottom-right) */}
        <div
          onPointerDown={(e) => {
            if (e.button !== 0 || maximized) return;
            isPointerDown.current = true;
            dragOrigin.current = { x: e.clientX, y: e.clientY, left: size.width, top: size.height };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isPointerDown.current) return;
            const dx = e.clientX - dragOrigin.current.x;
            const dy = e.clientY - dragOrigin.current.y;
            setSize({ width: Math.max(420, dragOrigin.current.left + dx), height: Math.max(320, dragOrigin.current.top + dy) });
          }}
          onPointerUp={(e) => {
            isPointerDown.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            triggerAutosave();
          }}
          style={{ position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, cursor: maximized ? 'default' : 'nwse-resize', background: 'transparent', border: maximized ? '1px solid transparent' : '1px solid var(--border)', borderRadius: 4, display: maximized ? 'none' : 'grid', placeItems: 'center', color: 'var(--muted)' }}
        >
          ↘
        </div>

        {/* In-modal dialog overlay */}
        {dialog.type && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center', zIndex: 10 }}>
            <div style={{ width: 360, maxWidth: '90%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 10px 24px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                {dialog.type === 'new' && 'Create Note'}
                {dialog.type === 'rename' && 'Rename Note'}
                {dialog.type === 'delete' && 'Delete Note'}
              </div>
              <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                {(dialog.type === 'new' || dialog.type === 'rename') && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)' }}>Name</label>
                    <input autoFocus value={dialog.value} onChange={(e)=> setDialog({ ...dialog, value: e.target.value })} />
                  </div>
                )}
                {dialog.type === 'delete' && (
                  <div style={{ fontSize: 14 }}>
                    Are you sure you want to delete “{dialog.note?.title || 'Notebook'}”? This cannot be undone.
                  </div>
                )}
              </div>
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="secondary" onClick={()=> setDialog({ type: null, note: null, value: '' })}>Cancel</button>
                {dialog.type === 'new' && (
                  <button onClick={async ()=>{
                    const name = (dialog.value || '').trim() || 'Untitled';
                    const res = await api.newNote({ title: name, docId: associatedDocId || '' });
                    if (res.success) {
                      const nowIso = new Date().toISOString();
                      const newNote = { ...res.note, updatedAt: res.note?.updatedAt || nowIso };
                      setNotes(prev => {
                        const arr = [newNote, ...((prev||[]).filter(x=> x._id !== newNote._id))];
                        // Keep most recent at top
                        arr.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
                        return arr;
                      });
                      setCurrentNoteId(newNote._id);
                      setTitle(newNote.title || 'Untitled');
                      if (editorRef.current) editorRef.current.innerHTML = '';
                      strokesRef.current = [];
                      redrawCanvas();
                      editorDirtyRef.current = false;
                      penDirtyRef.current = false;
                      setDialog({ type: null, note: null, value: '' });
                      // Scroll the newly created note into view and focus editor
                      setTimeout(() => {
                        try {
                          const el = sidebarListRef.current?.querySelector(`[data-note-id="${newNote._id}"]`);
                          el?.scrollIntoView({ block: 'nearest' });
                        } catch {}
                        try {
                          editorRef.current?.focus();
                        } catch {}
                      }, 0);
                    }
                  }}>Create</button>
                )}
                {dialog.type === 'rename' && (
                  <button onClick={async ()=>{
                    const newTitle = (dialog.value || '').trim();
                    if (!newTitle) return;
                    const n = dialog.note;
                    const resp = await api.saveNote({ noteId: n._id, title: newTitle, docId: n.docId || '' });
                    if (resp.success) {
                      const saved = resp.note || { _id: n._id, title: newTitle };
                      setNotes(prev => {
                        const arr = [...(prev || [])];
                        const idx = arr.findIndex(x => x._id === n._id);
                        const merged = { ...(arr[idx] || {}), ...saved };
                        merged.updatedAt = merged.updatedAt || new Date().toISOString();
                        if (idx >= 0) arr[idx] = merged;
                        arr.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
                        return arr;
                      });
                      if (currentNoteId === n._id) setTitle(newTitle);
                      setDialog({ type: null, note: null, value: '' });
                    }
                  }}>Save</button>
                )}
                {dialog.type === 'delete' && (
                  <button onClick={async ()=>{
                    const n = dialog.note;
                    const r = await api.deleteNote(n._id);
                    if (r.success) {
                      setNotes(prev => (prev||[]).filter(x => x._id !== n._id));
                      if (currentNoteId === n._id) {
                        setCurrentNoteId(null);
                        if (editorRef.current) editorRef.current.innerHTML = '';
                        strokesRef.current = [];
                        redrawCanvas();
                      }
                      setDialog({ type: null, note: null, value: '' });
                    }
                  }}>Delete</button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
