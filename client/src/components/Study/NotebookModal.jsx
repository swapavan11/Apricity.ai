import React, { useEffect, useRef, useState } from 'react';
import useApi from '../../api/useApi';

export default function NotebookModal({ open, onClose, associatedDocId, initialTitle = 'Notebook' }) {
  const api = useApi();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
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
  const [eraserEnabled, setEraserEnabled] = useState(false);
  const [rulerEnabled, setRulerEnabled] = useState(false);
  // Physical ruler overlay state (panel-relative coordinates)
  const [ruler, setRuler] = useState({ x: 280, y: 200, length: 420, angle: 0 });
  const rulerDragRef = useRef({ dragging: false, rotating: false, offsetX: 0, offsetY: 0 });
  const redoRef = useRef([]);
  const strokesRef = useRef([]); // each stroke: { color, size, points: [{x,y,p}], time }
  const drawingRef = useRef({ active: false, last: null });
  const rafRef = useRef(null); // For throttling canvas redraws
  const applyImageStylesTimerRef = useRef(null);
  const snapshotImageRef = useRef(null);
  const [maximized, setMaximized] = useState(false);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarListRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [switchingNote, setSwitchingNote] = useState(false);
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
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
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
    
    // Check if there are any unprocessed images
    let hasUnprocessed = false;
    imgs.forEach(img => {
      if (!img.__qh_bound) hasUnprocessed = true;
    });
    
    // Skip if no unprocessed images
    if (!hasUnprocessed) return;
    
    // Save current selection before any DOM manipulation
    const selection = window.getSelection();
    let savedRange = null;
    if (selection && selection.rangeCount > 0) {
      try {
        savedRange = selection.getRangeAt(0).cloneRange();
      } catch (e) {
        // Ignore if selection is not valid
      }
    }
    
    imgs.forEach(img => {
      if (img.__qh_bound) return; // Already initialized
      
      let wrapper = img.parentElement;
      const isAlreadyWrapped = wrapper?.classList?.contains('image-wrapper');
      
      // Wrap image in a resizable container if not already wrapped
      if (!isAlreadyWrapped) {
        wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.maxWidth = '100%';
        wrapper.style.margin = '6px 0';
        wrapper.style.cursor = 'default';
        wrapper.style.border = '2px solid transparent';
        wrapper.style.transition = 'border-color 0.2s';
        
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }
      
      // Image styles (apply to both new and existing wrapped images)
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '0';
      img.style.userSelect = 'none';
      img.style.cursor = 'move';
      
      // Clean up existing controls if wrapper was loaded from saved HTML
      if (isAlreadyWrapped) {
        // Remove old delete button and resize handles if they exist
        const oldDeleteBtn = wrapper.querySelector('.image-delete-btn');
        if (oldDeleteBtn) oldDeleteBtn.remove();
        wrapper.querySelectorAll('.resize-handle').forEach(h => h.remove());
      }
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'image-delete-btn';
      deleteBtn.innerHTML = '✕';
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '-10px';
      deleteBtn.style.right = '-10px';
      deleteBtn.style.width = '24px';
      deleteBtn.style.height = '24px';
      deleteBtn.style.borderRadius = '50%';
      deleteBtn.style.background = '#ff4444';
      deleteBtn.style.color = '#fff';
      deleteBtn.style.border = '2px solid #fff';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.display = 'none';
      deleteBtn.style.fontSize = '14px';
      deleteBtn.style.fontWeight = 'bold';
      deleteBtn.style.zIndex = '11';
      deleteBtn.style.padding = '0';
      deleteBtn.style.lineHeight = '1';
      deleteBtn.title = 'Delete image';
      
      deleteBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        setDialog({ 
          type: 'confirm-delete-image', 
          wrapper: wrapper,
          message: 'Delete this image?' 
        });
      });
      
      wrapper.appendChild(deleteBtn);
      
      // Create resize handles
      const handles = ['nw', 'ne', 'sw', 'se'];
      handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${pos}`;
        handle.style.position = 'absolute';
        handle.style.width = '10px';
        handle.style.height = '10px';
        handle.style.background = 'var(--accent)';
        handle.style.border = '1px solid #fff';
        handle.style.borderRadius = '50%';
        handle.style.cursor = `${pos}-resize`;
        handle.style.display = 'none';
        handle.style.zIndex = '10';
        
        // Position handles
        if (pos.includes('n')) handle.style.top = '-5px';
        if (pos.includes('s')) handle.style.bottom = '-5px';
        if (pos.includes('w')) handle.style.left = '-5px';
        if (pos.includes('e')) handle.style.right = '-5px';
        
        wrapper.appendChild(handle);
        
        // Resize logic
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = img.offsetWidth;
          const startHeight = img.offsetHeight;
          const aspectRatio = startWidth / startHeight;
          
          const onMouseMove = (e2) => {
            e2.preventDefault();
            let deltaX = e2.clientX - startX;
            let deltaY = e2.clientY - startY;
            
            if (pos.includes('w')) deltaX = -deltaX;
            if (pos.includes('n')) deltaY = -deltaY;
            
            const newWidth = Math.max(50, startWidth + deltaX);
            const newHeight = newWidth / aspectRatio;
            
            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;
            img.style.maxWidth = 'none';
            adjustPageHeightToContent();
          };
          
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            editorDirtyRef.current = true;
            triggerAutosave();
          };
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      });
      
      // Show handles and delete button on hover
      wrapper.addEventListener('mouseenter', () => {
        wrapper.style.borderColor = 'var(--accent)';
        wrapper.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
        const btn = wrapper.querySelector('.image-delete-btn');
        if (btn) btn.style.display = 'block';
      });
      
      wrapper.addEventListener('mouseleave', () => {
        wrapper.style.borderColor = 'transparent';
        wrapper.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
        const btn = wrapper.querySelector('.image-delete-btn');
        if (btn) btn.style.display = 'none';
      });
      
      // Drag to reposition - attach to img element directly
      let isDragging = false;
      let startDragX, startDragY, startTop, startLeft;
      
      img.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('resize-handle')) return;
          e.preventDefault();
          isDragging = true;
          startDragX = e.clientX;
          startDragY = e.clientY;
          
          // Convert to absolute positioning for free movement
          const rect = wrapper.getBoundingClientRect();
          const edRect = ed.getBoundingClientRect();
          wrapper.style.position = 'absolute';
          wrapper.style.left = `${rect.left - edRect.left}px`;
          wrapper.style.top = `${rect.top - edRect.top}px`;
          startLeft = parseFloat(wrapper.style.left);
          startTop = parseFloat(wrapper.style.top);
          
          const onMouseMove = (e2) => {
            if (!isDragging) return;
            e2.preventDefault();
            const deltaX = e2.clientX - startDragX;
            const deltaY = e2.clientY - startDragY;
            wrapper.style.left = `${startLeft + deltaX}px`;
            wrapper.style.top = `${startTop + deltaY}px`;
          };
          
          const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            editorDirtyRef.current = true;
            triggerAutosave();
          };
          
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
      
      wrapper.__qh_events_bound = true;
      img.__qh_bound = true;
      img.addEventListener('load', () => { adjustPageHeightToContent(); setTimeout(fitCanvas, 0); });
    });    // Restore selection after DOM manipulation
    if (savedRange) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        // Ignore if range is no longer valid
      }
    }
  };
  
  // Debounced wrapper for applyImageStyles - only call when images might have changed
  const applyImageStylesDebounced = () => {
    if (applyImageStylesTimerRef.current) {
      clearTimeout(applyImageStylesTimerRef.current);
    }
    applyImageStylesTimerRef.current = setTimeout(() => {
      applyImageStyles();
    }, 100); // Wait 100ms after last input before checking images
  };

  // Fetch and sync notes quickly with server, keeping most recent on top
  const fetchAndSyncNotes = async () => {
    try {
      const res = await api.listNotes();
      const latest = res.success ? (res.notes || []) : [];
      latest.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
      setNotes(prev => {
        if (!prev || prev.length !== latest.length) return latest;
        let identical = true;
        for (let i=0;i<latest.length;i++) {
          const a = latest[i], b = prev[i];
          if (!b || a._id !== b._id || String(a.updatedAt) !== String(b.updatedAt)) { identical = false; break; }
        }
        return identical ? prev : latest;
      });
      if (currentNoteId && !latest.find(n => n._id === currentNoteId)) {
        setCurrentNoteId(null);
        if (editorRef.current) editorRef.current.innerHTML = '';
        strokesRef.current = [];
        snapshotImageRef.current = null;
        redrawCanvas();
      }
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    applyImageStyles();
    adjustPageHeightToContent();
    setTimeout(fitCanvas, 0);
  }, [open]);

  // Fast refresh while open: poll and refresh on window focus
  // Reduced polling from 5s to 15s to reduce server load
  useEffect(() => {
    if (!open) return;
    // initial refresh after open
    fetchAndSyncNotes();
    const id = setInterval(fetchAndSyncNotes, 15000);
    const onFocus = () => fetchAndSyncNotes();
    window.addEventListener('focus', onFocus);
    return () => {
      try { clearInterval(id); } catch {}
      window.removeEventListener('focus', onFocus);
    };
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
    
    // Calculate position relative to panel, centering palette below button
    let left = b.left - p.left + (b.width / 2) - 130; // 130 is half of palette width (260)
    let top = b.bottom - p.top + 6;
    
    // Keep palette within modal bounds
    const paletteWidth = 260;
    const paletteHeight = 250;
    
    // Adjust horizontal position if going off edges
    if (left < 10) left = 10;
    if (left + paletteWidth > p.width - 10) left = p.width - paletteWidth - 10;
    
    // Adjust vertical position if going off bottom
    if (top + paletteHeight > p.height - 10) {
      top = b.top - p.top - paletteHeight - 6; // Show above button instead
    }
    
    setPalettePos({ left, top });
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

  // Autosave with debounce (3s after last change - increased from 1.5s to reduce server load)
  const saveDebounced = useRef();
  const triggerAutosave = () => {
    clearTimeout(saveDebounced.current);
    saveDebounced.current = setTimeout(saveNow, 3000);
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
    drawStrokes(ctx, strokes);
  };

  // Separate function to draw strokes for reusability
  const drawStrokes = (ctx, strokes) => {
    for (const s of strokes) {
  ctx.save();
  if (s.type === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = s.alpha ?? 1;
    if (s.type === 'highlighter') ctx.globalCompositeOperation = 'multiply';
  }
  ctx.strokeStyle = s.type === 'eraser' ? 'rgba(0,0,0,1)' : s.color;
  ctx.fillStyle = s.type === 'eraser' ? 'rgba(0,0,0,1)' : s.color;
  ctx.lineWidth = s.size;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const pts = s.points;
      if (!pts || pts.length === 0) { ctx.restore(); continue; }
      
      ctx.beginPath();
      if (pts.length === 1) {
        // Single point - draw a dot
        ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pts.length === 2) {
        // Two points - draw a line
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      } else {
        // Multiple points - draw smooth curves using quadratic curves
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        // Draw last segment
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // Optimized redraw - throttle but don't skip frames completely
  let lastDrawTime = 0;
  const drawImmediate = () => {
    const now = performance.now();
    // Throttle to ~60fps max but don't use RAF to avoid frame skipping
    if (now - lastDrawTime < 8) return; // ~120fps max to feel responsive
    lastDrawTime = now;
    redrawCanvas();
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
    // Prefer WEBP with lower quality for smaller file size (0.7 instead of 0.85)
    const webp = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.9));
    if (webp) return webp;
    // Fallback to PNG if WEBP not supported
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  };
  const lastSnapshotAtRef = useRef(0);

  const saveNow = async (opts = {}) => {
    try {
      if (!open) return;
      setSaving(true);
      setError('');
      // Only save when a note is selected; do not implicitly create a new note due to pen usage
      if (!currentNoteId) { setSaving(false); return; }
      const forceSnapshot = !!opts.forceSnapshot;
      // Only snapshot if forced or pen changes since last snapshot (throttled 15s instead of 5s)
      // This reduces Cloudinary uploads by 3x
      const shouldUploadSnapshot = forceSnapshot || (penDirtyRef.current && (Date.now() - (lastSnapshotAtRef.current || 0) > 15000));
      if (shouldUploadSnapshot) redrawCanvas();
      const noteJson = JSON.stringify({ title, html: editorRef.current?.innerHTML || '' });
      const snapshotBlob = shouldUploadSnapshot ? await getSnapshotBlob() : null;
      const res = await api.saveNote({ noteId: currentNoteId, title, docId: associatedDocId || '', noteJson, snapshotBlob });
      if (!res.success) throw new Error(res.message || 'Failed to save');
      const savedNote = res.note;
      setLastSaved(new Date());
      if (shouldUploadSnapshot) lastSnapshotAtRef.current = Date.now();
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
      if (shouldUploadSnapshot) penDirtyRef.current = false;
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
          redrawCanvas(); // Clear canvas immediately
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
            // Add aggressive cache buster with noteId, timestamp, and random component
            const noteId = n._id || '';
            const timestamp = n.updatedAt || Date.now();
            const random = Math.random().toString(36).substring(7);
            img.src = `${n.snapshotUrl}?noteId=${noteId}&t=${timestamp}&r=${random}`;
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
  <div 
    style={{ 
      position: 'fixed', 
      inset: 0, 
      pointerEvents: 'none', 
      zIndex: 50
    }}
  >
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
          gridTemplateColumns: sidebarOpen ? '240px 1fr' : '0px 1fr',
          transition: 'grid-template-columns 0.4s ease-in-out',
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar: Previous Notes */}
        <div style={{
          borderRight: '2px solid rgba(124, 156, 255, 0.2)',
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0,
          overflow: 'hidden',
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, transparent 100%)',
          opacity: sidebarOpen ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}>
            <div style={{ 
              padding: '8px 12px', 
              borderBottom: '2px solid rgba(124, 156, 255, 0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1530 100%)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              minHeight: '44px'
            }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                color: 'var(--text)'
              }}>
                � My Notes
              </span>
              <button 
                className="secondary" 
                onClick={async ()=>{ await fetchAndSyncNotes(); }}
                title="Refresh list"
                style={{ padding: '5px 8px', fontSize: '11px', minWidth: 'auto' }}
              >
                🔄
              </button>
              <button 
                onClick={async ()=>{
                  // Save current note if dirty before creating new
                  try { clearTimeout(saveDebounced.current); } catch {}
                  if ((editorDirtyRef.current || penDirtyRef.current) && currentNoteId) {
                    await saveNow({ forceSnapshot: true });
                  }
                  setDialog({ type: 'new', note: null, value: 'Untitled' });
                }}
                style={{ padding: '5px 10px', fontSize: '11px' }}
                title="Create new note"
              >
                ➕ New
              </button>
            </div>
            
            {/* Search input */}
            <div style={{ 
              padding: '8px 12px', 
              borderBottom: '1px solid rgba(124, 156, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.1)'
            }}>
              <input
                type="text"
                placeholder="🔍 Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(124, 156, 255, 0.2)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.borderColor = 'var(--accent)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.borderColor = 'rgba(124, 156, 255, 0.2)';
                }}
              />
            </div>
            
            <div ref={sidebarListRef} style={{ overflow: 'auto', flex: 1 }}>
              {(notes || []).filter(n => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const title = (n.title || '').toLowerCase();
                const content = (n.contentHtml || '').toLowerCase().replace(/<[^>]*>/g, ''); // Strip HTML tags
                return title.includes(query) || content.includes(query);
              }).length === 0 ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  color: 'var(--muted)',
                  fontSize: '13px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>
                    {searchQuery.trim() ? '🔍' : '📝'}
                  </div>
                  <div>{searchQuery.trim() ? 'No matching notes' : 'No notes yet'}</div>
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    {searchQuery.trim() ? 'Try a different search' : 'Click "New" to create one'}
                  </div>
                </div>
              ) : (notes || []).filter(n => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const title = (n.title || '').toLowerCase();
                const content = (n.contentHtml || '').toLowerCase().replace(/<[^>]*>/g, '');
                return title.includes(query) || content.includes(query);
              }).map((n) => (
                <div key={n._id} style={{ 
                  borderBottom: '1px solid rgba(124, 156, 255, 0.1)',
                  transition: 'all 0.2s'
                }}>
                  <div
                    data-note-id={n._id}
                    role="button"
                    aria-selected={currentNoteId === n._id}
                    onClick={async ()=>{
                    // Don't reload if already viewing this note or currently switching
                    if (currentNoteId === n._id || switchingNote) return;
                    
                    setSwitchingNote(true);
                    try {
                      // Save current note if dirty before switching
                      try { clearTimeout(saveDebounced.current); } catch {}
                      if ((editorDirtyRef.current || penDirtyRef.current) && currentNoteId) {
                        // Force a snapshot of current strokes before switching
                        redrawCanvas();
                        await saveNow({ forceSnapshot: true });
                      }
                      // Switch note content
                      setTitle(n.title || 'Notebook');
                      setCurrentNoteId(n._id);
                      if (editorRef.current) editorRef.current.innerHTML = n.contentHtml || '';
                      
                      applyImageStyles();
                      adjustPageHeightToContent();
                      setTimeout(fitCanvas, 0);
                      // Clear strokes and redo stack for new note context
                      strokesRef.current = [];
                      redoRef.current = [];
                      // Adjust page height baseline when switching
                      setPageHeight(h => Math.max(h, 800));
                      // Immediately clear the old snapshot to prevent flash
                      snapshotImageRef.current = null;
                      redrawCanvas();
                      // Load snapshot image if available
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
                        img.onerror = () => {
                          // If snapshot fails to load, clear it and redraw
                          console.log('Failed to load snapshot for note:', n._id, n.snapshotUrl);
                          snapshotImageRef.current = null;
                          redrawCanvas();
                        };
                        // Add aggressive cache buster with noteId, timestamp, and random component
                        const noteId = n._id || '';
                        const timestamp = n.updatedAt || Date.now();
                        const random = Math.random().toString(36).substring(7);
                        const finalUrl = `${n.snapshotUrl}?noteId=${noteId}&t=${timestamp}&r=${random}`;
                        console.log('Loading snapshot for note:', noteId, 'URL:', finalUrl);
                        img.src = finalUrl;
                      }
                      editorDirtyRef.current = false;
                      penDirtyRef.current = false;
                    } finally {
                      setSwitchingNote(false);
                    }
                  }}
                    style={{
                      padding: '12px',
                      cursor: switchingNote ? 'wait' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      background: currentNoteId === n._id 
                        ? 'linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(124, 156, 255, 0.08) 100%)' 
                        : 'transparent',
                      borderLeft: currentNoteId === n._id ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: switchingNote ? 0.5 : 1,
                      pointerEvents: switchingNote ? 'none' : 'auto'
                    }}
                    onMouseEnter={(e) => {
                      if (currentNoteId !== n._id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentNoteId !== n._id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: currentNoteId === n._id ? 'var(--accent)' : 'var(--text)', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          marginBottom: 4
                        }}>
                          {currentNoteId === n._id && '📌 '}
                          {n.title || 'Untitled Note'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>🕐</span>
                          <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(n.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      
                      {/* Action buttons at bottom - stopPropagation to prevent triggering note load */}
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e)=> e.stopPropagation()}>
                        <button 
                          title="Download as PDF" 
                          className="secondary" 
                          onClick={async ()=>{
                            const noteObj = (currentNoteId === n._id)
                              ? { ...n, contentHtml: editorRef.current?.innerHTML ?? n.contentHtml }
                              : n;
                            await exportNotePdf(noteObj);
                          }}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '12px', 
                            minWidth: 'auto',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          ⬇️
                        </button>
                        <button 
                          title="Rename note" 
                          className="secondary" 
                          onClick={()=>{
                            setDialog({ type: 'rename', note: n, value: n.title || 'Notebook' });
                          }}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '12px', 
                            minWidth: 'auto',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          ✏️
                        </button>
                        <button 
                          title="Delete note" 
                          className="secondary" 
                          onClick={()=>{
                            setDialog({ type: 'delete', note: n, value: '' });
                          }}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '12px', 
                            minWidth: 'auto',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ff4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.color = '';
                          }}
                        >
                          🗑️
                        </button>
                      </div>
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
            padding: '8px 12px',
            background: 'var(--panel)',
            borderBottom: '1px solid rgba(124, 156, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'sticky',
            top: 0,
            zIndex: 3,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
            minHeight: '44px'
          }}
        >
          {/* Left Section: Sidebar Toggle + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 0 }}>
            {/* Sidebar Folder Toggle */}
            <button 
              className="secondary" 
              onClick={(e)=>{ e.stopPropagation(); setSidebarOpen(v => !v); }}
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              style={{ 
                padding: '6px 8px', 
                fontSize: '16px', 
                minWidth: 'auto',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(124, 156, 255, 0.2)'
              }}
            >
              {sidebarOpen ? '📂' : '📁'}
            </button>
            
            <span title="Drag to move" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 24, 
              height: 24, 
              opacity: 0.5,
              cursor: 'grab',
              transition: 'opacity 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
              </svg>
            </span>
            <input 
              value={title} 
              onChange={(e) => { setTitle(e.target.value); triggerAutosave(); }} 
              style={{ 
                flex: 1, 
                minWidth: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(124, 156, 255, 0.2)',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text)',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(124, 156, 255, 0.2)';
              }}
            />
            <div style={{ 
              fontSize: 10, 
              color: saving ? 'var(--accent)' : 'var(--muted)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 6px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 3,
              flexShrink: 0
            }}>
              {saving && <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: 'var(--accent)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}/>}
              {saving ? 'Saving…' : (lastSaved ? `${lastSaved.toLocaleTimeString()}` : 'Auto')}
            </div>
          </div>

          {/* Right Section: Action Buttons - Grouped */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Zoom Controls Group */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 2,
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '2px 4px',
              borderRadius: 4,
              border: '1px solid rgba(124, 156, 255, 0.15)'
            }}>
              <button className="secondary" onClick={(e)=>{ e.stopPropagation(); zoomOut(); }} title="Zoom out" style={{ padding: '3px 6px', fontSize: '12px', minWidth: 'auto' }}>−</button>
              <span style={{ minWidth: 38, textAlign: 'center', fontSize: 10, color: 'var(--text)', fontWeight: 600 }}>{Math.round(zoom*100)}%</span>
              <button className="secondary" onClick={(e)=>{ e.stopPropagation(); zoomIn(); }} title="Zoom in" style={{ padding: '3px 6px', fontSize: '12px', minWidth: 'auto' }}>+</button>
              <div style={{ width: 1, height: 12, background: 'rgba(124, 156, 255, 0.2)', margin: '0 1px' }}/>
              <button className="secondary" onClick={(e)=>{ e.stopPropagation(); fitWidth(); }} title="Fit to width" style={{ padding: '3px 6px', fontSize: '10px', minWidth: 'auto' }}>Fit</button>
            </div>

            {/* Toolbar Toggle */}
            <button 
              className="secondary" 
              onClick={(e)=>{ e.stopPropagation(); setToolsHidden(v=>!v); }}
              title={toolsHidden ? 'Show toolbar' : 'Hide toolbar'}
              style={{ padding: '4px 8px', fontSize: '11px', minWidth: 'auto' }}
            >
              {toolsHidden ? '🔧' : '✕🔧'}
            </button>

            {/* Window Controls (like Windows OS) */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 0,
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 4,
              border: '1px solid rgba(124, 156, 255, 0.15)',
              overflow: 'hidden'
            }}>
              <button 
                className="secondary" 
                onClick={(e)=>{ e.stopPropagation(); setMaximized(m => !m); }}
                title={maximized ? 'Restore' : 'Maximize'}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '14px', 
                  minWidth: 'auto',
                  borderRadius: 0,
                  border: 'none',
                  borderRight: '1px solid rgba(124, 156, 255, 0.15)'
                }}
              >
                {maximized ? '🗗' : '🗖'}
              </button>
              <button 
                className={closing ? '' : 'secondary'} 
                style={closing ? { 
                  background: '#ff4444', 
                  color: 'white', 
                  border: 'none',
                  transition: 'all 0.3s ease',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: 0,
                  minWidth: 'auto'
                } : { 
                  padding: '4px 8px', 
                  fontSize: '14px',
                  borderRadius: 0,
                  border: 'none',
                  minWidth: 'auto',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontWeight: 400
                }}
                disabled={closing}
                onClick={(e)=>{ 
                  e.stopPropagation(); 
                  setClosing(true);
                  try{ clearTimeout(saveDebounced.current); }catch{}; 
                  (async()=>{ 
                    try { 
                      await saveNow({ forceSnapshot: true }); 
                    } finally { 
                      setClosing(false);
                      onClose && onClose(); 
                    } 
                  })(); 
                }}
                title={closing ? 'Saving and closing...' : 'Close'}
              >
                {closing ? 'Closing...' : '✕'}
              </button>
            </div>
          </div>

          <style>
            {`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
              }
            `}
          </style>
        </div>

        {/* Toolbar - can be hidden */}
  {!toolsHidden && (
    <div style={{ 
      padding: '4px 10px', 
      borderBottom: '1px solid rgba(124, 156, 255, 0.2)', 
      display: 'flex', 
      gap: 6, 
      alignItems: 'center', 
      flexWrap: 'wrap', 
      position: 'sticky', 
      top: 0, 
      zIndex: 2, 
      background: 'linear-gradient(to bottom, var(--panel) 0%, var(--panel) 90%, transparent 100%)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      minHeight: '32px'
    }}>
          {/* Text Formatting Group */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '2px',
            borderRadius: 4,
            border: '1px solid rgba(124, 156, 255, 0.15)'
          }}>
            <button className="nav-button" style={{ padding: '2px 5px', minWidth: 20, fontWeight: 'bold', fontSize: '9px' }} onClick={() => { document.execCommand('bold'); triggerAutosave(); }} title="Bold">B</button>
            <button className="nav-button" style={{ padding: '2px 5px', minWidth: 20, fontStyle: 'italic', fontSize: '9px' }} onClick={() => { document.execCommand('italic'); triggerAutosave(); }} title="Italic">I</button>
            <button className="nav-button" style={{ padding: '2px 5px', minWidth: 20, textDecoration: 'underline', fontSize: '9px' }} onClick={() => { document.execCommand('underline'); triggerAutosave(); }} title="Underline">U</button>
            <div style={{ width: 1, height: 12, background: 'rgba(124, 156, 255, 0.2)', margin: '0 1px' }}/>
            <button className="nav-button" style={{ padding: '2px 5px', fontSize: '8px' }} title="Decrease font size" onClick={() => adjustSelectionFontSize(-1)}>A−</button>
            <button className="nav-button" style={{ padding: '2px 5px', fontSize: '10px' }} title="Increase font size" onClick={() => adjustSelectionFontSize(1)}>A+</button>
          </div>

          {/* Drawing Tools Group */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '2px',
            borderRadius: 4,
            border: '1px solid rgba(124, 156, 255, 0.15)'
          }}>
            <button 
              className={penEnabled ? '' : 'secondary'} 
              style={{ padding: '2px 6px', fontSize: '9px', background: penEnabled ? 'var(--accent)' : undefined, color: penEnabled ? '#0a0f25' : undefined, fontWeight: penEnabled ? 600 : 400 }} 
              onClick={() => { setPenEnabled(v => !v); setHighlighterEnabled(false); setEraserEnabled(false); }} 
              title="Pen tool"
            >
              ✒️ Pen
            </button>
            <button 
              className={highlighterEnabled ? '' : 'secondary'} 
              style={{ padding: '2px 6px', fontSize: '9px', background: highlighterEnabled ? '#ffd166' : undefined, color: highlighterEnabled ? '#0a0f25' : undefined, fontWeight: highlighterEnabled ? 600 : 400 }} 
              onClick={() => { setHighlighterEnabled(v => !v); if (!highlighterEnabled) { setPenEnabled(false); setEraserEnabled(false); } }} 
              title="Highlighter tool"
            >
              🖍️ Highlighter
            </button>
            <button 
              className={eraserEnabled ? '' : 'secondary'} 
              style={{ padding: '2px 6px', fontSize: '9px', background: eraserEnabled ? '#ff6b6b' : undefined, color: eraserEnabled ? '#fff' : undefined, fontWeight: eraserEnabled ? 600 : 400 }} 
              onClick={() => { setEraserEnabled(v => !v); if (!eraserEnabled) { setPenEnabled(false); setHighlighterEnabled(false); } }} 
              title="Eraser tool"
            >
              🧹 Eraser
            </button>
            <button 
              className={rulerEnabled ? '' : 'secondary'} 
              style={{ padding: '2px 6px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: 2 }} 
              onClick={() => setRulerEnabled(v => !v)} 
              title="Ruler tool"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18v6H3z"/>
                <path d="M6 6v6M9 6v6M12 6v6M15 6v6M18 6v6"/>
              </svg>
              Ruler
            </button>
          </div>

          {/* Undo/Redo/Clear Group */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '2px',
            borderRadius: 4,
            border: '1px solid rgba(124, 156, 255, 0.15)'
          }}>
            <button className="secondary" onClick={() => { const s = strokesRef.current.pop(); if (s) { redoRef.current.push(s); } redrawCanvas(); triggerAutosave(); }} title="Undo" style={{ padding: '2px 5px', fontSize: '9px' }}>↶</button>
            <button className="secondary" onClick={() => { const s = redoRef.current.pop(); if (s) { strokesRef.current.push(s); } redrawCanvas(); triggerAutosave(); }} title="Redo" style={{ padding: '2px 5px', fontSize: '9px' }}>↷</button>
            <button className="secondary" onClick={() => { strokesRef.current = []; redoRef.current = []; redrawCanvas(); triggerAutosave(); }} title="Clear pen" style={{ padding: '2px 5px', fontSize: '9px' }}>Clear</button>
          </div>

          {/* Image Upload */}
          <label className="nav-button" title="Insert image" style={{ 
            padding: '3px 8px', 
            cursor: 'pointer', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 3, 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(124, 156, 255, 0.2)', 
            borderRadius: 4,
            fontSize: '10px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(124, 156, 255, 0.2)';
          }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 3v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 19l4.5-4.5 3 3L16 13l4 6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <span>📷 Image</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                // Ensure editor is focused
                const editor = editorRef.current;
                if (!editor) return;
                editor.focus();
                
                // Convert file to base64 data URL (persists when saved)
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                  const dataUrl = readerEvent.target.result;
                  
                  // Create image element
                  const img = document.createElement('img');
                  img.src = dataUrl;
                  
                  // Add error handler for broken images
                  img.onerror = () => {
                    console.error('Image failed to load:', dataUrl?.substring(0, 50));
                    // Optionally remove the broken image
                    if (img.parentNode) {
                      img.parentNode.remove();
                    }
                  };
                  
                  // Insert at cursor or at end
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(img);
                    // Move cursor after image
                    range.setStartAfter(img);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  } else {
                    // Insert at end if no selection
                    editor.appendChild(img);
                  }
                  
                  // Wait for image to load, then apply interactive styles
                  img.onload = () => {
                    applyImageStyles();
                    adjustPageHeightToContent();
                    setTimeout(() => { fitCanvas(); triggerAutosave(); }, 0);
                  };
                  
                  // Trigger immediate update
                  editorDirtyRef.current = true;
                  setTimeout(() => {
                    applyImageStyles();
                    adjustPageHeightToContent();
                    fitCanvas();
                  }, 100);
                };
                
                // Read file as data URL
                reader.readAsDataURL(file);
              } catch (err) {
                console.error('Failed to insert image:', err);
              }
              try { e.target.value = ''; } catch {}
            }} />
          </label>

          <div style={{ flex: 1 }}/>

          {/* Color Palette Button */}
          <button ref={paletteBtnRef} className="secondary" title="Choose custom color (RGB)" onClick={openPaletteAtButton} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '10px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a9.99 9.99 0 0 0-9.95 9.09c-.33 3.22 1.47 6.14 4.35 7.47A3 3 0 0 0 9 21h5a4 4 0 0 0 4-4v-.5a2.5 2.5 0 0 0-2.5-2.5H15a2 2 0 1 1 0-4h.5A2.5 2.5 0 0 0 18 7.5v-.02A10 10 0 0 0 12 2z"/></svg>
            Palette
          </button>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {[
              {c:'#ff3b30',name:'Red'},{c:'#28a745',name:'Green'},{c:'#007bff',name:'Blue'},
              {c:'#ffd400',name:'Yellow'},{c:'#6f42c1',name:'Purple'},{c:'#000000',name:'Black'},{c:'#ffffff',name:'White'}
            ].map(({c,name}) => (
              <button key={c} title={name} onClick={()=> setPenColor(c)} style={{ width: 12, height: 12, borderRadius: 999, border: '1px solid var(--border)', background: c, boxShadow: c==='#ffffff'? 'inset 0 0 0 1px #ccc' : 'none' }} />
            ))}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 80px', alignItems: 'center', gap: 4 }}>
              <div title="Size preview" style={{ position: 'relative', width: 18, height: 18, borderRadius: 999, border: '1px solid var(--border)', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50%/10px 10px' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: Math.max(2, penSize), height: Math.max(2, penSize), borderRadius: 999, background: penColor, opacity: penAlpha }} />
              </div>
              <input type="range" min={1} max={20} value={penSize} onChange={(e)=> setPenSize(parseInt(e.target.value,10))} title="Pen size" style={{ height: '14px' }} />
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 80px', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>Opacity</span>
              <input type="range" min={0.05} max={1} step={0.05} value={penAlpha} onChange={(e)=> setPenAlpha(parseFloat(e.target.value))} style={{ height: '14px' }} />
            </div>
          </div>
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
  <div ref={editorContainerRef} style={{ position: 'relative', flex: 1, overflowX: 'auto', overflowY: 'auto', background: 'var(--surface)' }}
    onTouchStart={(e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        pinchRef.current = { active: true, startDist: dist, startZoom: zoom };
      }
    }}
    onTouchMove={(e) => {
      if (pinchRef.current.active && e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const scale = dist / pinchRef.current.startDist;
        const newZoom = clampZoom(pinchRef.current.startZoom * scale);
        setZoom(newZoom);
      }
    }}
    onTouchEnd={(e) => {
      if (e.touches.length < 2) {
        pinchRef.current.active = false;
      }
    }}
  >
          {/* Zoom wrapper defines scroll area to match visual scale */}
          <div style={{ position: 'relative', width: docWidth ? Math.round(docWidth * zoom) : '100%', height: Math.round(pageHeight * zoom) }}>
            <div
              ref={surfaceRef}
              style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                height: pageHeight, 
                width: docWidth || '100%', 
                touchAction: 'none', 
                transform: `scale(${zoom})`, 
                transformOrigin: 'top left', 
                background: 'var(--panel)',
                cursor: eraserEnabled ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjZmY2YjZiIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMS41Ii8+PHBhdGggZD0iTTggMTJMMTYgMTJNOCAxNUwxNiAxNSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+") 12 12, pointer' 
                  : (penEnabled || highlighterEnabled) ? 'crosshair' 
                  : 'text'
              }}
            onPointerDown={(e)=>{
              const wantDraw = highlighterEnabled || penEnabled || eraserEnabled || (e.pointerType && e.pointerType !== 'mouse');
              if (!wantDraw) return;
              e.preventDefault();
              const rect = surfaceRef.current?.getBoundingClientRect();
              if (!rect) return;
              let x = (e.clientX - rect.left) / zoom; let y = (e.clientY - rect.top) / zoom;
              if (rulerEnabled && !eraserEnabled) {
                const p = projectToRulerSurfacePoint(e.clientX, e.clientY);
                if (p) { x = p.x; y = p.y; }
              }
              drawingRef.current.active = true;
              redoRef.current = [];
              const stroke = {
                type: eraserEnabled ? 'eraser' : (highlighterEnabled ? 'highlighter' : 'pen'),
                color: penColor,
                alpha: highlighterEnabled ? Math.min(0.5, penAlpha) : penAlpha,
                size: eraserEnabled ? Math.max(penSize * 2, 20) : (highlighterEnabled ? Math.max(penSize, 12) : penSize),
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
              if (rulerEnabled && !eraserEnabled) {
                const p = projectToRulerSurfacePoint(e.clientX, e.clientY);
                if (p) { x = p.x; y = p.y; }
              }
              const strokes = strokesRef.current;
              const stroke = strokes[strokes.length - 1];
              if (!stroke) return;
              if (rulerEnabled && !eraserEnabled) stroke.points = [stroke.points[0], { x, y, p: e.pressure || 0.5 }]; else stroke.points.push({ x, y, p: e.pressure || 0.5 });
              if (y > pageHeight - 80) {
                setPageHeight(h => h + PAGE_INCREMENT);
                // keep current scroll position; do not auto-scroll to bottom during drawing
              }
              // Redraw immediately with throttling for smooth continuous curves
              drawImmediate();
            }}
            onPointerUp={(e)=>{
              if (!drawingRef.current.active) return;
              drawingRef.current.active = false;
              // Final redraw to ensure consistency
              redrawCanvas();
              penDirtyRef.current = true;
              triggerAutosave();
            }}
            onPointerCancel={()=>{ drawingRef.current.active = false; }}
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => { editorDirtyRef.current = true; adjustPageHeightToContent(); setTimeout(fitCanvas, 0); triggerAutosave(); applyImageStylesDebounced(); }}
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
          style={{ 
            position: 'absolute', 
            right: 0, 
            bottom: 0, 
            width: 24, 
            height: 24, 
            cursor: maximized ? 'default' : 'nwse-resize', 
            background: maximized ? 'transparent' : 'linear-gradient(135deg, transparent 0%, transparent 50%, rgba(124, 156, 255, 0.3) 50%, rgba(124, 156, 255, 0.5) 100%)', 
            borderRadius: '0 0 8px 0',
            display: maximized ? 'none' : 'flex', 
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '2px',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
            <path d="M21 21H3v-2h18v2zM5.4 16l9-9L16 8.6l-9 9H5.4zm12-12l2.6 2.6L18.4 8 16 5.6l1.4-1.6z"/>
          </svg>
        </div>

        {/* In-modal dialog overlay */}
        {dialog.type && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.5)', 
            backdropFilter: 'blur(2px)',
            display: 'grid', 
            placeItems: 'center', 
            zIndex: 10 
          }}>
            <div style={{ 
              width: 400, 
              maxWidth: '90%', 
              background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1530 100%)', 
              border: '2px solid rgba(124, 156, 255, 0.3)', 
              borderRadius: 12, 
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '2px solid rgba(124, 156, 255, 0.2)', 
                fontWeight: 600,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'linear-gradient(to right, rgba(124, 156, 255, 0.1), transparent)'
              }}>
                {dialog.type === 'new' && '➕ Create New Note'}
                {dialog.type === 'rename' && '✏️ Rename Note'}
                {dialog.type === 'delete' && '⚠️ Delete Note'}
                {dialog.type === 'confirm-delete-image' && '🗑️ Delete Image'}
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
                {dialog.type === 'confirm-delete-image' && (
                  <div style={{ fontSize: 14 }}>
                    {dialog.message || 'Delete this image?'}
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
                      redoRef.current = [];
                      snapshotImageRef.current = null;
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
                  <button 
                    style={{ 
                      background: '#ff4444', 
                      color: 'white', 
                      border: '1px solid #cc0000',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                    onClick={async ()=>{
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
                    }}
                  >
                    Delete
                  </button>
                )}
                {dialog.type === 'confirm-delete-image' && (
                  <button 
                    style={{ 
                      background: '#ff4444', 
                      color: 'white', 
                      border: '1px solid #cc0000',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                    onClick={()=>{
                      const wrapper = dialog.wrapper;
                      if (wrapper && wrapper.parentNode) {
                        wrapper.remove();
                        editorDirtyRef.current = true;
                        // Adjust editor height after removing image
                        adjustEditorHeight();
                        // Trigger autosave
                        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                        autosaveTimerRef.current = setTimeout(() => saveNow(), 3000);
                      }
                      setDialog({ type: null, note: null, value: '', wrapper: null, message: '' });
                    }}
                  >
                    Delete
                  </button>
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
