class TechText {
  constructor(root, options = {}) {
    this.root = root;
    this.root.classList.add("tech-text");
    this.canvas = document.createElement("canvas");
    this.canvas.className = "tech-text-canvas";
    this.root.appendChild(this.canvas);

    this.settings = {
      text: options.text || "React Bits",
      fontFamily: options.fontFamily || "",
      fontWeight: options.fontWeight ?? 600,
      fontSize: options.fontSize ?? 150,
      letterSpacing: options.letterSpacing ?? -0.05,
      color: options.color || "#ffffff",
      accentColor: options.accentColor || "#ffffff",
      reveal: options.reveal || "letter",
      reach: options.reach ?? 200,
      softness: options.softness ?? 0.7,
      dashLength: options.dashLength ?? 4,
      dashGap: options.dashGap ?? 2,
      strokeWidth: options.strokeWidth ?? 1.5,
      lineStyle: options.lineStyle || "dashed",
      specks: options.specks ?? 15,
      selection: options.selection ?? true,
      labels: options.labels ?? true,
      draggable: options.draggable ?? true,
      sweep: options.sweep ?? true,
      speed: options.speed ?? 1
    };

    this.ctx = this.canvas.getContext("2d");
    this.glyphs = [];
    this.pointer = { x: 0, y: 0, inside: false };
    this.lens = { x: 0, y: 0 };
    this.frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };
    this.presence = 0;
    this.clock = 0;
    this.pulse = 0;
    this.lastFrame = performance.now();
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.raf = 0;
    this.visible = true;
    this.alive = true;
    this.dragging = -1;
    this.dragOffset = { x: 0, y: 0 };
    this.grab = { x: 0, y: 0 };
    this.word = null;
    this.layoutKey = "";
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    this.onPointerMove = (event) => this.locate(event);
    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
    this.onPointerLeave = () => {
      if (this.dragging < 0) this.pointer.inside = false;
    };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.wake();
    });

    root.addEventListener("pointermove", this.onPointerMove, { passive: true });
    root.addEventListener("pointerenter", this.onPointerMove, { passive: true });
    root.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    root.addEventListener("pointerup", this.onPointerUp, { passive: true });
    root.addEventListener("pointercancel", this.onPointerUp, { passive: true });
    root.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
    this.resizeObserver.observe(root);
    this.intersectionObserver.observe(root);
    if (document.fonts) document.fonts.ready.then(() => this.layoutKey = "");
    this.resize();
    this.wake();
  }

  getFontSize() {
    const measured = this.measureText(this.settings.text, this.settings.fontSize);
    const fit = Math.min(
      1,
      (this.width * 0.9) / Math.max(measured.width, 1),
      (this.height * 0.66) / Math.max(measured.height, 1)
    );
    return this.settings.fontSize * fit;
  }

  measureText(text, size) {
    const context = this.ctx;
    context.font = this.fontFor(size);
    const metrics = context.measureText(text);
    return {
      width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
  }

  fontFor(size) {
    const family = this.settings.fontFamily || getComputedStyle(this.root).fontFamily || "sans-serif";
    return `${this.settings.fontWeight} ${size}px ${family}`;
  }

  resize() {
    const rect = this.root.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.layoutKey = "";
  }

  locate(event) {
    const rect = this.root.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    this.pointer.inside = true;
    this.wake();
  }

  handlePointerDown(event) {
    this.locate(event);
    if (this.settings.draggable && (event.pointerType !== "mouse" || event.button === 0)) {
      const index = this.glyphAt(this.pointer.x, this.pointer.y);
      if (index >= 0) {
        this.dragging = index;
        this.grab.x = this.pointer.x - this.glyphs[index].offset.x;
        this.grab.y = this.pointer.y - this.glyphs[index].offset.y;
        this.dragOffset.x = this.glyphs[index].offset.x;
        this.dragOffset.y = this.glyphs[index].offset.y;
        this.root.setPointerCapture?.(event.pointerId);
      }
    }
    this.wake();
  }

  handlePointerUp(event) {
    if (this.dragging >= 0) {
      this.dragging = -1;
      this.root.releasePointerCapture?.(event.pointerId);
    }
    this.pointer.inside = this.root.contains(event.target) && event.clientX >= this.root.getBoundingClientRect().left && event.clientX <= this.root.getBoundingClientRect().right;
    this.wake();
  }

  glyphAt(x, y) {
    if (!this.word || y < this.word.top - 24 || y > this.word.bottom + 24) return -1;
    let best = -1;
    let closest = Infinity;
    this.glyphs.forEach((glyph, index) => {
      const left = glyph.box.x1 + glyph.offset.x;
      const right = glyph.box.x2 + glyph.offset.x;
      const distance = x < left ? left - x : x > right ? x - right : 0;
      if (distance < closest) {
        closest = distance;
        best = index;
      }
    });
    return closest < 28 ? best : -1;
  }

  ensureLayout() {
    const settings = this.settings;
    const family = settings.fontFamily || getComputedStyle(this.root).fontFamily || "sans-serif";
    const key = [settings.text, family, settings.fontWeight, settings.fontSize, settings.letterSpacing, settings.color, settings.dashLength, settings.dashGap, settings.strokeWidth, settings.lineStyle, this.width, this.height, this.dpr].join("|");
    if (key === this.layoutKey && this.word) return;

    this.layoutKey = key;
    this.ctx.font = this.fontFor(settings.fontSize);
    const full = this.ctx.measureText(settings.text);
    const fit = Math.min(
      1,
      (this.width * 0.9) / Math.max(full.actualBoundingBoxLeft + full.actualBoundingBoxRight, 1),
      (this.height * 0.66) / Math.max(full.actualBoundingBoxAscent + full.actualBoundingBoxDescent, 1)
    );
    const size = settings.fontSize * fit;
    this.ctx.font = this.fontFor(size);
    const measured = this.ctx.measureText(settings.text);
    const inkWidth = measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight;
    const inkHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
    const x = (this.width - inkWidth) / 2 + measured.actualBoundingBoxLeft;
    const baseline = (this.height - inkHeight) / 2 + measured.actualBoundingBoxAscent;

    this.word = {
      size,
      baseline,
      left: x - measured.actualBoundingBoxLeft,
      right: x + measured.actualBoundingBoxRight,
      top: baseline - measured.actualBoundingBoxAscent,
      bottom: baseline + measured.actualBoundingBoxDescent
    };

    this.glyphs = Array.from(settings.text).map((char, index) => {
      if (!char.trim()) return null;
      this.ctx.font = this.fontFor(size);
      const charMetrics = this.ctx.measureText(char);
      const prefix = settings.text.slice(0, index);
      const prefixWidth = this.ctx.measureText(prefix).width;
      const glyphX = x + prefixWidth - charMetrics.width;
      return {
        char,
        index,
        offset: { x: 0, y: 0 },
        outline: 0,
        box: {
          x1: glyphX - charMetrics.actualBoundingBoxLeft,
          y1: baseline - charMetrics.actualBoundingBoxAscent,
          x2: glyphX + charMetrics.actualBoundingBoxRight,
          y2: baseline + charMetrics.actualBoundingBoxDescent
        },
        x: glyphX,
        y: baseline
      };
    }).filter(Boolean);
    this.frame.index = -1;
    return this.word;
  }

  drawGlyph(glyph, alpha, dashed = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.fontFor(this.word.size);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.translate(glyph.offset.x, glyph.offset.y);
    if (dashed) {
      ctx.strokeStyle = this.settings.color;
      ctx.lineWidth = this.settings.strokeWidth * 2;
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";
      if (this.settings.lineStyle !== "solid") {
        ctx.setLineDash([this.settings.dashLength, this.settings.dashGap]);
      }
      ctx.strokeText(glyph.char, glyph.x, this.word.baseline);
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.fillText(glyph.char, glyph.x, this.word.baseline);
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = this.settings.color;
      ctx.fillText(glyph.char, glyph.x, this.word.baseline);
    }
    ctx.restore();
  }

  drawBackground() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawReveal() {
    const ctx = this.ctx;
    const radius = this.settings.reach * this.dpr;
    const cx = this.lens.x * this.dpr;
    const cy = this.lens.y * this.dpr;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(0,0,0,${this.presence})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  drawFrame() {
    if (this.frame.alpha < 0.01) return;
    const ctx = this.ctx;
    const x1 = Math.round(this.frame.x1);
    const y1 = Math.round(this.frame.y1);
    const x2 = Math.round(this.frame.x2);
    const y2 = Math.round(this.frame.y2);
    ctx.save();
    ctx.globalAlpha = this.frame.alpha;
    ctx.strokeStyle = this.settings.accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].forEach(([x, y]) => {
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    });
    ctx.fillStyle = this.settings.accentColor;
    ctx.fillStyle = this.settings.accentColor;
    this.ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "bottom";
    const glyph = this.glyphs[this.frame.index];
    if (glyph && this.settings.labels) {
      const label = `${glyph.char} ${Math.round(glyph.box.x2 - glyph.box.x1)} × ${Math.round(glyph.box.y2 - glyph.box.y1)}`;
      ctx.fillText(label, x1, y1 - 7);
    }
    ctx.restore();
  }

  tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const view = this.ensureLayout();
    if (!view) return;

    const sweeping = this.settings.sweep && !this.reducedMotion && !this.pointer.inside && this.dragging < 0;
    if (sweeping) this.clock += dt * this.settings.speed;
    this.pulse += dt;
    let targetX = this.pointer.x;
    let targetY = this.pointer.y;
    if (sweeping) {
      targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(this.clock * 0.45));
      targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(this.clock * 0.8));
    }
    if (this.pointer.inside || sweeping || this.dragging >= 0) {
      this.lens.x += (targetX - this.lens.x) * Math.min(1, dt * (this.pointer.inside ? 20 : 4));
      this.lens.y += (targetY - this.lens.y) * Math.min(1, dt * (this.pointer.inside ? 20 : 4));
    }
    this.presence += (this.settings.reveal === "area" && (this.pointer.inside || sweeping) ? 1 : 0 - this.presence) * Math.min(1, dt * 6);

    this.glyphs.forEach((glyph) => {
      if (this.dragging === glyph.index) {
        glyph.offset.x += (this.pointer.x - this.grab.x - glyph.offset.x) * Math.min(1, dt * 30);
        glyph.offset.y += (this.pointer.y - this.grab.y - glyph.offset.y) * Math.min(1, dt * 30);
        return;
      }
      glyph.offset.x *= Math.pow(0.82, dt * 60);
      glyph.offset.y *= Math.pow(0.82, dt * 60);
    });

    const focus = this.dragging >= 0 ? this.dragging : this.pointer.inside || sweeping ? this.glyphAt(this.lens.x, this.lens.y) : -1;
    if (focus >= 0 && this.settings.selection) {
      const glyph = this.glyphs[focus];
      const bx1 = glyph.box.x1 + glyph.offset.x - 6;
      const by1 = glyph.box.y1 + glyph.offset.y - 6;
      const bx2 = glyph.box.x2 + glyph.offset.x + 6;
      const by2 = glyph.box.y2 + glyph.offset.y + 6;
      this.frame.x1 += (bx1 - this.frame.x1) * Math.min(1, dt * (focus === this.dragging ? 2 : 8));
      this.frame.y1 += (by1 - this.frame.y1) * Math.min(1, dt * (focus === this.dragging ? 2 : 8));
      this.frame.x2 += (bx2 - this.frame.x2) * Math.min(1, dt * (focus === this.dragging ? 2 : 8));
      this.frame.y2 += (by2 - this.frame.y2) * Math.min(1, dt * (focus === this.dragging ? 2 : 8));
      this.frame.index = focus;
    }
    this.frame.alpha += ((focus >= 0 && this.settings.selection) ? 1 : 0 - this.frame.alpha) * Math.min(1, dt * 8);

    this.drawBackground();
    this.glyphs.forEach((glyph) => {
      this.drawGlyph(glyph, 1 - this.glyphs.indexOf(glyph) / Math.max(this.glyphs.length, 1));
    });
    if (this.settings.reveal !== "off" && this.presence > 0.001) this.drawReveal();
    this.drawFrame();

    if (this.visible && this.alive && (this.pointer.inside || this.dragging >= 0 || this.frame.alpha > 0.01 || !this.reducedMotion)) {
      this.raf = requestAnimationFrame((next) => this.tick(next));
    }
  }

  wake() {
    if (!this.raf && this.visible && this.alive) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame((time) => {
        this.raf = 0;
        this.tick(time);
      });
    }
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.root.removeEventListener("pointermove", this.onPointerMove);
    this.root.removeEventListener("pointerenter", this.onPointerMove);
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    this.root.removeEventListener("pointerup", this.onPointerUp);
    this.root.removeEventListener("pointercancel", this.onPointerUp);
    this.root.removeEventListener("pointerleave", this.onPointerLeave);
  }
}

const techTextHosts = document.querySelectorAll("[data-tech-text]");
techTextHosts.forEach((host) => {
  new TechText(host, {
    text: host.dataset.text || "React Bits",
    fontFamily: host.dataset.fontFamily || "",
    fontWeight: Number(host.dataset.fontWeight || 600),
    fontSize: Number(host.dataset.fontSize || 150),
    letterSpacing: Number(host.dataset.letterSpacing || -0.05),
    color: host.dataset.color || "#ffffff",
    accentColor: host.dataset.accentColor || "#ffffff",
    reveal: host.dataset.reveal || "letter",
    reach: Number(host.dataset.reach || 200),
    softness: Number(host.dataset.softness || 0.7),
    dashLength: Number(host.dataset.dashLength || 4),
    dashGap: Number(host.dataset.dashGap || 2),
    strokeWidth: Number(host.dataset.strokeWidth || 1.5),
    lineStyle: host.dataset.lineStyle || "dashed",
    specks: Number(host.dataset.specks || 15),
    selection: host.dataset.selection !== "false",
    labels: host.dataset.labels !== "false",
    draggable: host.dataset.draggable !== "false",
    sweep: host.dataset.sweep !== "false",
    speed: Number(host.dataset.speed || 1)
  });
});
