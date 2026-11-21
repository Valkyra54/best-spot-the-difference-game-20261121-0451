// Renderer for Lantern Market — Spot the Difference.
// Paints every frame from world state: backdrop, header + timer bar, the two
// scene panels, found markers, hint pulse, wrong flash, keyboard cursor,
// footer, and the screen overlays. No game logic lives here.
import { FIELD, PANELS, HEADER, FOOTER, PALETTE, FONT, TIME_BONUS_PER_SECOND } from './config.js';
import { LEVELS, drawScene } from './scenes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL = 'level';
export const SCREEN_DONE = 'done';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

const P = PALETTE || {};
const C = {
  backdrop: P.backdrop || '#171224',
  header: P.header || P.roof || '#241a33',
  panel: P.panel || P.roof || '#20242f',
  frame: P.frame || P.panelFrame || '#4a5265',
  text: P.text || '#f2f4f8',
  muted: P.muted || '#9aa3b2',
  accent: P.accent || '#ffb347',
  good: P.good || P.marker || '#43d17c',
  bad: P.bad || P.wrong || '#e5534b',
  card: P.card || P.roof || '#1b2029',
  timer: P.timer || P.accent || '#f2c94c',
  timerLow: P.timerLow || P.wrong || '#e5534b',
  hint: P.hint || P.accent || '#ffb347',
};

const FONT_FAMILY = FONT || 'system-ui, -apple-system, "Segoe UI", sans-serif';
const W = FIELD.width;
const H = FIELD.height;

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function panelRect(panel) {
  if (panel === 1 || panel === 'B' || panel === 'right') return PANELS.right;
  return PANELS.left;
}

function findDiff(levelIndex, id) {
  const level = LEVELS && LEVELS[levelIndex];
  if (!level || !level.differences) return null;
  return level.differences.find((d) => d.id === id) || null;
}

// hintPulse / wrongFlash may be a difference id, { id }, or { x, y, r }.
function resolvePoint(value, levelIndex) {
  if (value == null) return null;
  if (typeof value === 'number' || typeof value === 'string') {
    const d = findDiff(levelIndex, value);
    return d ? { x: d.x, y: d.y, r: d.r } : null;
  }
  if (typeof value.x === 'number' && typeof value.y === 'number') {
    return { x: value.x, y: value.y, r: value.r };
  }
  if (value.id !== undefined) {
    const d = findDiff(levelIndex, value.id);
    return d ? { x: d.x, y: d.y, r: d.r } : null;
  }
  return null;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function text(str, x, y, size, color, weight, align) {
    ctx.font = `${weight || '600'} ${size}px ${FONT_FAMILY}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawCheck(cx, cy, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.lineTo(cx + 10, cy - 8);
    ctx.stroke();
  }

  function drawOverlay(lines) {
    ctx.fillStyle = 'rgba(5, 7, 10, 0.66)';
    ctx.fillRect(0, 0, W, H);
    const cardW = 700;
    const cardH = 96 + lines.reduce((sum, l) => sum + (l.gap || 42), 0);
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;
    ctx.fillStyle = C.card;
    rr(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    let y = cardY + 58;
    for (const line of lines) {
      text(line.t, W / 2, y, line.size, line.color, line.weight || '700', 'center');
      y += line.gap || 42;
    }
  }

  function draw(state) {
    // Accept either the bare state object or a world wrapper carrying .state.
    const s = state && state.state ? state.state : state;
    if (!s || !ctx) return;
    const levelIndex = s.levelIndex ?? 0;
    const level = LEVELS ? LEVELS[levelIndex] : undefined;
    const total = level && level.differences ? level.differences.length : 0;
    const foundCount = s.found ? s.found.size : 0;
    const timeLeft = s.timeLeft ?? (level ? level.time : 0);
    const levelTime = (level && level.time) || Math.max(timeLeft, 1);
    const screen = s.screen || SCREEN_TITLE;

    // ---- Backdrop ----
    ctx.fillStyle = C.backdrop;
    ctx.fillRect(0, 0, W, H);

    // ---- Header bar (HEADER.h covers title rows + timer bar) ----
    ctx.fillStyle = C.header;
    ctx.fillRect(0, 0, W, HEADER.h);
    ctx.fillStyle = C.frame;
    ctx.fillRect(0, HEADER.h, W, 1);
    text('LANTERN MARKET', 40, HEADER.titleY, 26, C.accent, '800');
    text(level ? level.name : `Level ${levelIndex + 1}`, W / 2, 36, 20, C.text, '700', 'center');
    text(`Level ${levelIndex + 1} / ${LEVELS ? LEVELS.length : 3}`, W / 2, 62, 13, C.muted, '600', 'center');
    text(`Score ${s.score ?? 0}  ·  ${fmtTime(timeLeft)}`, W - 40, 36, 20, C.text, '700', 'right');
    text(`Hints: ${s.hintsLeft ?? 0}`, W - 40, 62, 15, C.muted, '600', 'right');

    // ---- Timer bar (shrinks; red under 30s) ----
    const barX = 40;
    const barY = 78;
    const barW = W - 80;
    const barH = 8;
    const frac = Math.max(0, Math.min(1, timeLeft / levelTime));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    rr(ctx, barX, barY, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = timeLeft < 30 ? C.timerLow : C.timer;
    if (frac > 0) {
      rr(ctx, barX, barY, Math.max(8, barW * frac), barH, 4);
      ctx.fill();
    }

    // ---- The two panels ----
    const panels = [
      { key: 'A', rect: PANELS.left },
      { key: 'B', rect: PANELS.right },
    ];
    for (const { key, rect } of panels) {
      ctx.fillStyle = C.panel;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      ctx.translate(rect.x, rect.y);
      try {
        drawScene(ctx, levelIndex, key);
      } catch (err) {
        // A scene failure must never blank the whole frame.
        ctx.fillStyle = C.panel;
        ctx.fillRect(0, 0, rect.w, rect.h);
      }
      ctx.restore();
      // Frame + tag.
      ctx.strokeStyle = C.frame;
      ctx.lineWidth = 3;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      const tag = `PANEL ${key}`;
      ctx.font = `700 13px ${FONT_FAMILY}`;
      const tagW = ctx.measureText(tag).width + 18;
      ctx.fillStyle = 'rgba(5, 7, 10, 0.6)';
      rr(ctx, rect.x + 10, rect.y + 10, tagW, 22, 11);
      ctx.fill();
      text(tag, rect.x + 19, rect.y + 21, 13, '#ffffff', '700');
    }

    // ---- Found markers (green ring + check, on BOTH panels) ----
    // World keeps markers as { id, x, y, r }; fall back to the found set
    // looked up in LEVELS when markers are absent.
    const markers = Array.isArray(s.markers) && s.markers.length
      ? s.markers
      : (s.found ? [...s.found].map((id) => findDiff(levelIndex, id)).filter(Boolean) : []);
    for (const m of markers) {
      for (const { rect } of panels) {
        const cx = rect.x + m.x;
        const cy = rect.y + m.y;
        const r = (m.r ?? 18) + 6;
        ctx.strokeStyle = C.good;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        drawCheck(cx, cy, C.good);
      }
    }

    // ---- Hint pulse (pulsing amber ring at the hinted difference) ----
    const hintPt = resolvePoint(s.hintPulse, levelIndex);
    if (hintPt) {
      const now = typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(now * 5);
      const r = (hintPt.r ?? 18) + 8 + 6 * pulse;
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.45 * pulse;
      ctx.strokeStyle = C.hint;
      ctx.lineWidth = 3;
      for (const { rect } of panels) {
        ctx.beginPath();
        ctx.arc(rect.x + hintPt.x, rect.y + hintPt.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- Wrong flash (red X at the wrong-click spot) ----
    if (s.wrongFlash) {
      const wf = resolvePoint(s.wrongFlash, levelIndex);
      if (wf) {
        const panel = s.wrongFlash.panel !== undefined ? s.wrongFlash.panel : s.cursor?.panel;
        const rect = panelRect(panel);
        const cx = rect.x + wf.x;
        const cy = rect.y + wf.y;
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 12);
        ctx.lineTo(cx + 12, cy + 12);
        ctx.moveTo(cx + 12, cy - 12);
        ctx.lineTo(cx - 12, cy + 12);
        ctx.stroke();
      }
    }

    // ---- Keyboard cursor (crosshair ring, play only) ----
    if (screen === SCREEN_PLAY && s.cursor) {
      const rect = panelRect(s.cursor.panel);
      const cx = rect.x + (s.cursor.x ?? 0);
      const cy = rect.y + (s.cursor.y ?? 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 19, cy);
      ctx.lineTo(cx - 7, cy);
      ctx.moveTo(cx + 7, cy);
      ctx.lineTo(cx + 19, cy);
      ctx.moveTo(cx, cy - 19);
      ctx.lineTo(cx, cy - 7);
      ctx.moveTo(cx, cy + 7);
      ctx.lineTo(cx, cy + 19);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Footer ----
    const footerY = FOOTER.textY;
    text('Click a difference · Arrows move cursor · Enter marks · H to hint · P to pause', 40, footerY, 15, C.muted, '600');
    const remain = Math.max(0, total - foundCount);
    const counter = `Found ${foundCount} / ${total} · ${remain} remain`;
    ctx.font = `800 20px ${FONT_FAMILY}`;
    const counterW = ctx.measureText(counter).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    rr(ctx, W - 40 - counterW - 24, footerY - 20, counterW + 24, 40, 10);
    ctx.fill();
    ctx.strokeStyle = C.frame;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(counter, W - 52, footerY, 20, C.text, '800', 'right');

    // ---- Screen overlays ----
    const best = s.best ?? 0;
    if (screen === SCREEN_TITLE) {
      drawOverlay([
        { t: 'LANTERN MARKET', size: 46, color: C.accent, weight: '800', gap: 52 },
        { t: 'Spot the Difference', size: 24, color: C.text, gap: 44 },
        { t: 'Press Space or click to start', size: 20, color: C.text, gap: 40 },
        { t: `Best score: ${best}`, size: 18, color: C.muted, gap: 44 },
        { t: 'Find every difference between Panel A and Panel B.', size: 16, color: C.muted, gap: 30 },
        { t: 'Click a difference — or move the cursor and press Enter.', size: 16, color: C.muted, gap: 30 },
        { t: 'H for a hint · P to pause · Wrong clicks cost time!', size: 16, color: C.muted, gap: 30 },
      ]);
    } else if (screen === SCREEN_LEVEL) {
      // timeLeft is frozen at the clear moment, so this is the banked bonus.
      const bonus = Math.max(0, Math.round(s.timeLeft ?? 0)) * TIME_BONUS_PER_SECOND;
      drawOverlay([
        { t: 'Level Clear!', size: 44, color: C.good, weight: '800', gap: 52 },
        { t: `Time bonus +${bonus}`, size: 22, color: C.text, gap: 42 },
        { t: `Total score: ${s.score ?? 0}`, size: 20, color: C.muted, gap: 42 },
        { t: 'Press Space for the next level', size: 20, color: C.text, gap: 42 },
      ]);
    } else if (screen === SCREEN_DONE) {
      drawOverlay([
        { t: 'Market Mastered!', size: 44, color: C.accent, weight: '800', gap: 52 },
        { t: `Total score: ${s.score ?? 0}`, size: 22, color: C.text, gap: 42 },
        { t: `Best score: ${best}`, size: 20, color: C.muted, gap: 42 },
        { t: 'Press Space to play again', size: 20, color: C.text, gap: 42 },
      ]);
    } else if (screen === SCREEN_OVER) {
      drawOverlay([
        { t: "Time's Up", size: 44, color: C.bad, weight: '800', gap: 52 },
        { t: `Score: ${s.score ?? 0}`, size: 22, color: C.text, gap: 42 },
        { t: `Best score: ${best}`, size: 20, color: C.muted, gap: 42 },
        { t: 'Press Space to retry', size: 20, color: C.text, gap: 42 },
      ]);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay([
        { t: 'Paused', size: 44, color: C.text, weight: '800', gap: 52 },
        { t: 'P to resume', size: 20, color: C.muted, gap: 42 },
      ]);
    }
  }

  return { draw };
}
