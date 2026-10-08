import { useEffect, useRef } from "react";

function createCanvasRenderer(root, settings) {
  const canvas = document.createElement("canvas");
  canvas.className = "tech-text-canvas";
  root.appendChild(canvas);
  const context = canvas.getContext("2d");
  const state = {
    root, canvas, context, settings, glyphs: [], word: null, pointer: { x: 0, y: 0, inside: false },
    lens: { x: 0, y: 0 }, frame: { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 },
    presence: 0, clock: 0, lastFrame: performance.now(), width: 1, height: 1, dpr: 1,
    visible: true, alive: true, dragging: -1, grab: { x: 0, y: 0 }, layoutKey: "", raf: 0,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  };

  const locate = (event) => {
    const rect = root.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.inside = true;
    wake();
  };
  const handlePointerDown = (event) => {
    locate(event);
    if (settings.draggable && (event.pointerType !== "mouse" || event.button === 0)) {
      const index = glyphAt(state.pointer.x, state.pointer.y);
      if (index >= 0) {
        state.dragging = index;
        state.grab.x = state.pointer.x - state.glyphs[index].offset.x;
        state.grab.y = state.pointer.y - state.glyphs[index].offset.y;
        root.setPointerCapture?.(event.pointerId);
      }
    }
  };
  const handlePointerUp = (event) => {
    if (state.dragging >= 0) {
      state.dragging = -1;
      root.releasePointerCapture?.(event.pointerId);
    }
    state.pointer.inside = root.contains(event.target);
  };
  const onPointerLeave = () => { if (state.dragging < 0) state.pointer.inside = false; };

  root.addEventListener("pointermove", locate, { passive: true });
  root.addEventListener("pointerdown", handlePointerDown, { passive: true });
  root.addEventListener("pointerup", handlePointerUp, { passive: true });
  root.addEventListener("pointercancel", handlePointerUp, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave);

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    wake();
  });
  resizeObserver.observe(root);
  intersectionObserver.observe(root);

  function fontFor(size) {
    return `${settings.fontWeight} ${size}px ${settings.fontFamily || getComputedStyle(root).fontFamily || "sans-serif"}`;
  }
  function resize() {
    const rect = root.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    state.layoutKey = "";
  }
  function ensureLayout() {
    const key = [settings.text, settings.fontFamily, settings.fontWeight, settings.fontSize, settings.letterSpacing, settings.color, settings.dashLength, settings.dashGap, settings.strokeWidth, settings.lineStyle, state.width, state.height, state.dpr].join("|");
    if (key === state.layoutKey && state.word) return state.word;
    state.layoutKey = key;
    context.font = fontFor(settings.fontSize);
    const full = context.measureText(settings.text);
    const fit = Math.min(1, (state.width * 0.9) / Math.max(full.actualBoundingBoxLeft + full.actualBoundingBoxRight, 1), (state.height * 0.66) / Math.max(full.actualBoundingBoxAscent + full.actualBoundingBoxDescent, 1));
    const size = settings.fontSize * fit;
    context.font = fontFor(size);
    const measured = context.measureText(settings.text);
    const inkWidth = measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight;
    const inkHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
    const x = (state.width - inkWidth) / 2 + measured.actualBoundingBoxLeft;
    const baseline = (state.height - inkHeight) / 2 + measured.actualBoundingBoxAscent;
    state.word = { size, baseline, left: x - measured.actualBoundingBoxLeft, right: x + measured.actualBoundingBoxRight, top: baseline - measured.actualBoundingBoxAscent, bottom: baseline + measured.actualBoundingBoxDescent };
    state.glyphs = Array.from(settings.text).map((char, index) => {
      if (!char.trim()) return null;
      context.font = fontFor(size);
      const metrics = context.measureText(char);
      const prefix = settings.text.slice(0, index);
      const glyphX = x + context.measureText(prefix).width - metrics.width;
      return { char, index, offset: { x: 0, y: 0 }, box: { x1: glyphX - metrics.actualBoundingBoxLeft, y1: baseline - metrics.actualBoundingBoxAscent, x2: glyphX + metrics.actualBoundingBoxRight, y2: baseline + metrics.actualBoundingBoxDescent }, x: glyphX, y: baseline };
    }).filter(Boolean);
    return state.word;
  }
  function glyphAt(x, y) {
    if (!state.word || y < state.word.top - 24 || y > state.word.bottom + 24) return -1;
    let best = -1; let closest = Infinity;
    state.glyphs.forEach((glyph, index) => { const left = glyph.box.x1 + glyph.offset.x; const right = glyph.box.x2 + glyph.offset.x; const distance = x < left ? left - x : x > right ? x - right : 0; if (distance < closest) { closest = distance; best = index; } });
    return closest < 28 ? best : -1;
  }
  function drawGlyph(glyph, alpha) {
    context.save(); context.globalAlpha = alpha; context.font = fontFor(state.word.size); context.textAlign = "left"; context.textBaseline = "alphabetic";
    context.translate(glyph.offset.x, glyph.offset.y); context.fillStyle = settings.color; context.fillText(glyph.char, glyph.x, state.word.baseline); context.restore();
  }
  function drawFrame() {
    if (state.frame.alpha < 0.01) return;
    context.save(); context.globalAlpha = state.frame.alpha; context.strokeStyle = settings.accentColor; context.lineWidth = 1;
    context.strokeRect(state.frame.x1, state.frame.y1, state.frame.x2 - state.frame.x1, state.frame.y2 - state.frame.y1);
    context.fillStyle = settings.accentColor; context.fillRect(Math.round(state.frame.x1) - 2, Math.round(state.frame.y1) - 2, 4, 4); context.fillRect(Math.round(state.frame.x2) - 2, Math.round(state.frame.y1) - 2, 4, 4); context.fillRect(Math.round(state.frame.x2) - 2, Math.round(state.frame.y2) - 2, 4, 4); context.fillRect(Math.round(state.frame.x1) - 2, Math.round(state.frame.y2) - 2, 4, 4); context.restore();
  }
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - state.lastFrame) / 1000)); state.lastFrame = now;
    const view = ensureLayout(); if (!view) return;
    const sweeping = settings.sweep && !state.reducedMotion && !state.pointer.inside && state.dragging < 0;
    state.clock += dt * settings.speed; state.lens.x += (state.pointer.x - state.lens.x) * Math.min(1, dt * 20); state.lens.y += (state.pointer.y - state.lens.y) * Math.min(1, dt * 20);
    state.glyphs.forEach((glyph) => { if (state.dragging === glyph.index) { glyph.offset.x += (state.pointer.x - state.grab.x - glyph.offset.x) * Math.min(1, dt * 30); glyph.offset.y += (state.pointer.y - state.grab.y - glyph.offset.y) * Math.min(1, dt * 30); } else { glyph.offset.x *= Math.pow(0.82, dt * 60); glyph.offset.y *= Math.pow(0.82, dt * 60); } });
    const focus = state.dragging >= 0 ? state.dragging : state.pointer.inside || sweeping ? glyphAt(state.lens.x, state.lens.y) : -1;
    if (focus >= 0) { const glyph = state.glyphs[focus]; state.frame.x1 += (glyph.box.x1 + glyph.offset.x - 6 - state.frame.x1) * Math.min(1, dt * 8); state.frame.y1 += (glyph.box.y1 + glyph.offset.y - 6 - state.frame.y1) * Math.min(1, dt * 8); state.frame.x2 += (glyph.box.x2 + glyph.offset.x + 6 - state.frame.x2) * Math.min(1, dt * 8); state.frame.y2 += (glyph.box.y2 + glyph.offset.y + 6 - state.frame.y2) * Math.min(1, dt * 8); state.frame.index = focus; }
    state.frame.alpha += ((focus >= 0) ? 1 : 0 - state.frame.alpha) * Math.min(1, dt * 8);
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
    state.glyphs.forEach((glyph, index) => drawGlyph(glyph, 1 - index / Math.max(state.glyphs.length, 1)));
    drawFrame();
    if (state.visible && state.alive) state.raf = requestAnimationFrame(tick);
  }
  function wake() { if (!state.raf && state.visible && state.alive) state.raf = requestAnimationFrame(tick); }
  resize(); wake();
  return () => { state.alive = false; cancelAnimationFrame(state.raf); resizeObserver.disconnect(); intersectionObserver.disconnect(); root.removeEventListener("pointermove", locate); root.removeEventListener("pointerdown", handlePointerDown); root.removeEventListener("pointerup", handlePointerUp); root.removeEventListener("pointercancel", handlePointerUp); root.removeEventListener("pointerleave", onPointerLeave); };
}

export default function TechText({ text, className = "", ...settings }) {
  const rootRef = useRef(null);
  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    if (!rootRef.current) return;
    const cleanup = createCanvasRenderer(rootRef.current, { text, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 118, letterSpacing: -0.06, color: "#f4f3ef", accentColor: "#c5f36b", reveal: "letter", reach: 180, softness: 0.7, dashLength: 5, dashGap: 3, strokeWidth: 1.25, lineStyle: "dashed", specks: 14, selection: true, labels: true, draggable: true, sweep: true, speed: 1, ...settings });
    return cleanup;
  }, [text, settingsKey]);
  return <div ref={rootRef} className={`tech-text-host ${className}`} aria-label={`${text} animated wordmark`} role="img" />;
}
