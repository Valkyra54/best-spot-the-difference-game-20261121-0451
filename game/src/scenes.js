// Lantern Market — the art and the differences.
//
// drawScene(ctx, levelIndex, panel) paints the level's base scene in
// panel-local coords (0,0)-(580,560). The base is IDENTICAL in both panels;
// only panel 'B' then applies each difference's alter(ctx), which overdraws
// the changed element. All decorative placement is seeded, so a level looks
// the same every time it is drawn.
//
// Every difference is a real, fair change to a visible element — a missing
// lantern, a recolored awning stripe, an extra cat, a missing bird, a changed
// sign character, a moved crate, an extra star, a dark window, a missing
// bunting flag, a different fruit, a missing tassel, a changed price tag.
// No random-noise differences. Hit radius r is always 18..34.
import { createRandom } from './random.js';
import { PALETTE } from './config.js';

// ---------------------------------------------------------------------------
// Shared anchors: the base scene and the differences both read these, so a
// difference always lands exactly on the element it describes.
// ---------------------------------------------------------------------------

/** Lantern string: a quadratic curve from (10,138) to (570,138), sagging mid-way. */
function stringY(x) {
  const t = x / 580;
  return (1 - t) * (1 - t) * 138 + 2 * (1 - t) * t * 198 + t * t * 138;
}
const LANTERN_XS = [70, 150, 235, 320, 405, 490];
const LANTERN_COLORS = ['#ffb347', '#ff8a5c', '#ffd27a', '#ff6b6b', '#ffb347', '#ffd27a'];
/** Lantern body centres (x, stringY(x) + 24). */
const LANTERNS = LANTERN_XS.map((x) => ({ x, y: stringY(x) + 24 }));

/** Birds sit on the wire at y = 118. */
const BIRD_Y = 118;
const BIRD_XS = [120, 210, 300, 390, 470];

/** Lit rooftop windows. */
const WINDOWS = [
  { x: 90, y: 225, w: 26, h: 30 },
  { x: 180, y: 218, w: 26, h: 30 },
  { x: 330, y: 228, w: 26, h: 30 },
  { x: 440, y: 222, w: 26, h: 30 },
  { x: 510, y: 230, w: 24, h: 28 },
];

/** Bunting string from (24,256) to (556,244); 12 flags hang from it. */
function flagAt(i) {
  const t = i / 11;
  return { x: 24 + t * 532, y: 256 - 12 * t };
}

/** Stalls: awnings, counters, signboards, price tags. */
const STALLS = {
  left: { awning: { x: 30, y: 275, w: 225, h: 40 }, sign: { x: 80, y: 318, w: 130, h: 30 }, tag: { x: 100, y: 420, w: 40, h: 26 } },
  right: { awning: { x: 325, y: 275, w: 225, h: 40 }, sign: { x: 380, y: 318, w: 130, h: 30 }, tag: { x: 400, y: 420, w: 40, h: 26 } },
};
/** Fruit bowls on the counters (cy 388, r 11). */
const FRUIT_LEFT = [80, 110, 140, 170, 200];
const FRUIT_RIGHT = [380, 410, 440, 470, 500];

/** Crates. Centre stack: bottom A (268,478,46,44), top B (272,438,38,40). */
const CRATE_B = { x: 272, y: 438, w: 38, h: 40 };
/** The one cat in the base scene sits on the left crate stack. */
const BASE_CAT = { x: 50, y: 432 };

/** Sky gradient stops per level: dusk warms into midnight. */
const SKIES = [
  ['#241f45', '#4a2f5e', '#b5653a'],
  ['#1e1a40', '#3d2a55', '#9c5238'],
  ['#14122e', '#2c2148', '#7a3f30'],
];

// ---------------------------------------------------------------------------
// Small drawing helpers (panel-local coords).
// ---------------------------------------------------------------------------

function skyGradient(ctx, levelIndex) {
  const [top, mid, horizon] = SKIES[levelIndex] || SKIES[0];
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, horizon);
  return g;
}

/** Repaint a patch of sky (used to erase a lantern / bird in panel B). */
function skyPatch(ctx, levelIndex, x, y, w, h) {
  ctx.fillStyle = skyGradient(ctx, levelIndex);
  ctx.fillRect(x, y, w, h);
}

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color || '#ffe9b8';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

function drawLantern(ctx, x, cy, color, withTassel) {
  ctx.save();
  // Warm glow.
  const glow = ctx.createRadialGradient(x, cy, 2, x, cy, 42);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.45)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, 42, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, cy, 15, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ribs + caps.
  ctx.strokeStyle = 'rgba(120, 40, 20, 0.55)';
  ctx.lineWidth = 1.5;
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, cy - 17);
    ctx.quadraticCurveTo(x + dx * 1.4, cy, x + dx, cy + 17);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a1f';
  ctx.fillRect(x - 6, cy - 22, 12, 5);
  ctx.fillRect(x - 6, cy + 17, 12, 5);
  // Tassel.
  if (withTassel) {
    ctx.strokeStyle = '#e07b2e';
    ctx.lineWidth = 2;
    for (const dx of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, cy + 22);
      ctx.lineTo(x + dx, cy + 33);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBird(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#1d1420';
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 6, y - 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1420';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 1);
  ctx.lineTo(x - 13, y - 3);
  ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 5);
  ctx.lineTo(x + 13, y - 3);
  ctx.lineTo(x + 9, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A sitting cat silhouette, facing left, centred at (x, y). */
function drawCat(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color || '#1d1420';
  // Body.
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head + ears.
  ctx.beginPath();
  ctx.arc(x - 6, y - 12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 17);
  ctx.lineTo(x - 12, y - 23);
  ctx.lineTo(x - 7, y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 18);
  ctx.lineTo(x - 2, y - 24);
  ctx.lineTo(x + 1, y - 18);
  ctx.closePath();
  ctx.fill();
  // Tail curling up on the right.
  ctx.strokeStyle = color || '#1d1420';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 6);
  ctx.quadraticCurveTo(x + 18, y + 2, x + 16, y - 8);
  ctx.stroke();
  ctx.restore();
}

function drawCrate(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5e3a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
}

function drawWindow(ctx, win, lit) {
  ctx.fillStyle = lit ? '#ffd27a' : '#2c2438';
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.strokeStyle = lit ? '#8a5a2e' : '#1d1420';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(win.x + win.w / 2, win.y);
  ctx.lineTo(win.x + win.w / 2, win.y + win.h);
  ctx.moveTo(win.x, win.y + win.h / 2);
  ctx.lineTo(win.x + win.w, win.y + win.h / 2);
  ctx.stroke();
}

function drawSign(ctx, stall, text) {
  const s = stall.sign;
  ctx.save();
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 17px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, s.x + s.w / 2, s.y + s.h / 2 + 1);
  ctx.restore();
}

function drawTag(ctx, stall, text) {
  const t = stall.tag;
  ctx.save();
  ctx.fillStyle = '#fff3dd';
  ctx.fillRect(t.x, t.y, t.w, t.h);
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
  ctx.fillStyle = '#3a2417';
  ctx.font = 'bold 15px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, t.x + t.w / 2, t.y + t.h / 2 + 1);
  ctx.restore();
}

function drawFruit(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(x - 3.5, y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f7a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 10);
  ctx.lineTo(x + 9, y - 14);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The base scene (identical in both panels).
// ---------------------------------------------------------------------------

function drawBase(ctx, levelIndex, seed) {
  const rng = createRandom(seed);

  // Sky.
  ctx.fillStyle = skyGradient(ctx, levelIndex);
  ctx.fillRect(0, 0, 580, 320);

  // Stars (seeded; keep clear of the moon).
  for (let i = 0; i < 42; i += 1) {
    const x = 12 + rng() * 556;
    const y = 10 + rng() * 130;
    if (Math.hypot(x - 480, y - 66) < 52) continue;
    drawStar(ctx, x, y, 1.5 + rng() * 2.2, rng() < 0.75 ? '#ffe9b8' : '#bfe8e2');
  }

  // Moon.
  const moonGlow = ctx.createRadialGradient(480, 66, 6, 480, 66, 70);
  moonGlow.addColorStop(0, 'rgba(255, 233, 184, 0.5)');
  moonGlow.addColorStop(1, 'rgba(255, 233, 184, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(480, 66, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath();
  ctx.arc(480, 66, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 178, 120, 0.6)';
  ctx.beginPath();
  ctx.arc(470, 58, 6, 0, Math.PI * 2);
  ctx.arc(490, 74, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Bird wire + birds.
  ctx.strokeStyle = '#1d1420';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, BIRD_Y);
  ctx.lineTo(564, BIRD_Y);
  ctx.stroke();
  for (const x of BIRD_XS) drawBird(ctx, x, BIRD_Y);

  // Lantern string + lanterns.
  ctx.strokeStyle = '#1d1420';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 138);
  ctx.quadraticCurveTo(290, 198, 570, 138);
  ctx.stroke();
  LANTERNS.forEach((lantern, i) => {
    ctx.strokeStyle = '#1d1420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lantern.x, stringY(lantern.x));
    ctx.lineTo(lantern.x, lantern.y - 19);
    ctx.stroke();
    drawLantern(ctx, lantern.x, lantern.y, LANTERN_COLORS[i], true);
  });

  // Rooftops.
  ctx.fillStyle = PALETTE.roof;
  ctx.fillRect(0, 212, 180, 96);
  ctx.fillRect(170, 196, 220, 112);
  ctx.fillRect(380, 206, 200, 102);
  ctx.fillStyle = PALETTE.roofLight;
  ctx.beginPath();
  ctx.moveTo(0, 212);
  ctx.lineTo(90, 188);
  ctx.lineTo(180, 212);
  ctx.closePath();
  ctx.moveTo(170, 196);
  ctx.lineTo(280, 172);
  ctx.lineTo(390, 196);
  ctx.closePath();
  ctx.moveTo(380, 206);
  ctx.lineTo(480, 182);
  ctx.lineTo(580, 206);
  ctx.closePath();
  ctx.fill();
  // Chimney.
  ctx.fillStyle = PALETTE.roofLight;
  ctx.fillRect(340, 168, 18, 34);
  // Lit windows.
  for (const win of WINDOWS) drawWindow(ctx, win, true);

  // Bunting.
  ctx.strokeStyle = '#1d1420';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, 256);
  ctx.lineTo(556, 244);
  ctx.stroke();
  const flagColors = ['#ff6b6b', '#ffb347', '#2fa8a0', '#ffd27a'];
  for (let i = 0; i < 12; i += 1) {
    const f = flagAt(i);
    ctx.fillStyle = flagColors[i % flagColors.length];
    ctx.beginPath();
    ctx.moveTo(f.x - 10, f.y);
    ctx.lineTo(f.x + 10, f.y);
    ctx.lineTo(f.x, f.y + 17);
    ctx.closePath();
    ctx.fill();
  }

  // Street wall + ground.
  ctx.fillStyle = '#33263f';
  ctx.fillRect(0, 300, 580, 170);
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 470, 580, 90);
  // Cobbles (seeded).
  ctx.fillStyle = PALETTE.groundLight;
  for (let i = 0; i < 46; i += 1) {
    const x = 8 + rng() * 564;
    const y = 478 + rng() * 74;
    ctx.beginPath();
    ctx.ellipse(x, y, 12 + rng() * 10, 5 + rng() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stalls.
  for (const [key, stall] of Object.entries(STALLS)) {
    const a = stall.awning;
    // Posts + dark interior.
    ctx.fillStyle = '#3a2417';
    ctx.fillRect(a.x + 4, a.y + a.h, 8, 96);
    ctx.fillRect(a.x + a.w - 12, a.y + a.h, 8, 96);
    ctx.fillStyle = '#241a2e';
    ctx.fillRect(a.x, a.y + a.h, a.w, 86);
    // Awning: alternating amber / teal stripes with a scalloped hem.
    for (let k = 0; k < 9; k += 1) {
      ctx.fillStyle = k % 2 === 0 ? PALETTE.accent : PALETTE.teal;
      ctx.fillRect(a.x + k * 25, a.y, 25, a.h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(a.x, a.y + a.h - 8, a.w, 8);
    for (let k = 0; k < 9; k += 1) {
      ctx.fillStyle = k % 2 === 0 ? PALETTE.accent : PALETTE.teal;
      ctx.beginPath();
      ctx.arc(a.x + k * 25 + 12.5, a.y + a.h, 12.5, 0, Math.PI);
      ctx.fill();
    }
    // Counter.
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(a.x, 400, a.w, 70);
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(a.x - 4, 396, a.w + 8, 12);
    // Goods: fruit row on the counter top.
    const fruitXs = key === 'left' ? FRUIT_LEFT : FRUIT_RIGHT;
    for (const fx of fruitXs) drawFruit(ctx, fx, 388, '#ff8a3c');
    // Jars behind the fruit.
    ctx.fillStyle = '#2fa8a0';
    ctx.fillRect(a.x + 14, 366, 18, 30);
    ctx.fillRect(a.x + a.w - 32, 366, 18, 30);
    // Signboard + price tag.
    drawSign(ctx, stall, key === 'left' ? 'LANTERN' : 'NOODLES');
    drawTag(ctx, stall, key === 'left' ? '5' : '8');
  }

  // Crates + the base cat.
  drawCrate(ctx, 24, 486, 52, 54);
  drawCrate(ctx, 30, 446, 40, 40);
  drawCrate(ctx, 268, 478, 46, 44);
  drawCrate(ctx, CRATE_B.x, CRATE_B.y, CRATE_B.w, CRATE_B.h);
  drawCat(ctx, BASE_CAT.x, BASE_CAT.y);
}

// ---------------------------------------------------------------------------
// Difference alterations (panel B only). Each overdraws the base element it
// describes, using the same anchors, so the change is exactly where it says.
// ---------------------------------------------------------------------------

function alterMissingLantern(levelIndex, i) {
  const lantern = LANTERNS[i];
  return (ctx) => {
    skyPatch(ctx, levelIndex, lantern.x - 26, stringY(lantern.x) - 8, 52, 72);
    ctx.strokeStyle = '#1d1420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lantern.x - 26, stringY(lantern.x - 26));
    ctx.quadraticCurveTo(290, 198, lantern.x + 26, stringY(lantern.x + 26));
    ctx.stroke();
  };
}

function alterMissingBird(levelIndex, x) {
  return (ctx) => {
    skyPatch(ctx, levelIndex, x - 16, BIRD_Y - 14, 32, 26);
    ctx.strokeStyle = '#1d1420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 16, BIRD_Y);
    ctx.lineTo(x + 16, BIRD_Y);
    ctx.stroke();
  };
}

function alterAwningStripe(stallKey, stripeIndex, toColor) {
  const a = STALLS[stallKey].awning;
  const x = a.x + stripeIndex * 25;
  return (ctx) => {
    ctx.fillStyle = toColor;
    ctx.fillRect(x, a.y, 25, a.h);
    ctx.beginPath();
    ctx.arc(x + 12.5, a.y + a.h, 12.5, 0, Math.PI);
    ctx.fill();
  };
}

function alterWindowDark(win) {
  return (ctx) => drawWindow(ctx, win, false);
}

function alterMissingFlag(flagIndex) {
  const f = flagAt(flagIndex);
  return (ctx) => {
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(f.x - 13, f.y - 3, 26, 24);
    // Redraw the string segment across the patch: y = 256 + (x - 24) * (-12 / 532).
    ctx.strokeStyle = '#1d1420';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(f.x - 13, 256 + (f.x - 13 - 24) * (-12 / 532));
    ctx.lineTo(f.x + 13, 256 + (f.x + 13 - 24) * (-12 / 532));
    ctx.stroke();
  };
}

function alterSign(stallKey, newText) {
  return (ctx) => drawSign(ctx, STALLS[stallKey], newText);
}

function alterTag(stallKey, newText) {
  return (ctx) => drawTag(ctx, STALLS[stallKey], newText);
}

function alterFruit(x, color) {
  return (ctx) => drawFruit(ctx, x, 388, color);
}

function alterExtraCat(x, y) {
  return (ctx) => drawCat(ctx, x, y, '#241a2e');
}

function alterExtraStar(x, y) {
  return (ctx) => {
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 16);
    glow.addColorStop(0, 'rgba(255, 233, 184, 0.8)');
    glow.addColorStop(1, 'rgba(255, 233, 184, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    drawStar(ctx, x, y, 6, '#fff3dd');
  };
}

function alterTasselMissing(i) {
  const lantern = LANTERNS[i];
  return (ctx) => {
    // Overpaint the tassel with the lantern's own glow colour, then redraw
    // the body bottom so the lantern simply ends cleanly.
    ctx.fillStyle = LANTERN_COLORS[i];
    ctx.fillRect(lantern.x - 8, lantern.y + 20, 16, 16);
    ctx.fillStyle = '#7a4a1f';
    ctx.fillRect(lantern.x - 6, lantern.y + 17, 12, 5);
  };
}

function alterCrateMoved(newX, newY) {
  return (ctx) => {
    // Erase the old top crate: wall above the ground line, ground below it.
    ctx.fillStyle = '#33263f';
    ctx.fillRect(CRATE_B.x - 4, CRATE_B.y - 4, CRATE_B.w + 8, 470 - CRATE_B.y + 4);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(CRATE_B.x - 4, 470, CRATE_B.w + 8, CRATE_B.y + CRATE_B.h - 470 + 4);
    drawCrate(ctx, newX, newY, CRATE_B.w, CRATE_B.h);
  };
}

// ---------------------------------------------------------------------------
// Levels.
// ---------------------------------------------------------------------------

export const LEVELS = [
  {
    name: 'Lantern Dusk',
    time: 180,
    hints: 3,
    seed: 20261121,
    differences: [
      { id: 'l1-lantern', x: 320, y: 192, r: 26, label: 'Lantern missing from the string', alter: alterMissingLantern(0, 3) },
      { id: 'l1-awning', x: 142, y: 295, r: 24, label: 'Awning stripe recolored', alter: alterAwningStripe('left', 4, PALETTE.teal) },
      { id: 'l1-cat', x: 291, y: 424, r: 26, label: 'Extra cat on the crates', alter: alterExtraCat(291, 424) },
      { id: 'l1-bird', x: 300, y: 118, r: 20, label: 'Bird missing from the wire', alter: alterMissingBird(0, 300) },
      { id: 'l1-sign', x: 145, y: 333, r: 26, label: 'Sign character changed', alter: alterSign('left', 'LANTARN') },
      { id: 'l1-window', x: 343, y: 243, r: 22, label: 'Window gone dark', alter: alterWindowDark(WINDOWS[2]) },
      { id: 'l1-star', x: 250, y: 60, r: 20, label: 'Extra star in the sky', alter: alterExtraStar(250, 60) },
    ],
  },
  {
    name: 'Lantern Row',
    time: 150,
    hints: 3,
    seed: 20261122,
    differences: [
      { id: 'l2-lantern', x: 150, y: 185, r: 26, label: 'Lantern missing from the string', alter: alterMissingLantern(1, 1) },
      { id: 'l2-flag', x: 266, y: 258, r: 20, label: 'Bunting flag missing', alter: alterMissingFlag(5) },
      { id: 'l2-fruit', x: 440, y: 388, r: 22, label: 'Different fruit on the stall', alter: alterFruit(440, '#7ee787') },
      { id: 'l2-crate', x: 349, y: 490, r: 28, label: 'Crate moved', alter: alterCrateMoved(330, 470) },
      { id: 'l2-tassel', x: 405, y: 214, r: 20, label: "Lantern's tassel missing", alter: alterTasselMissing(4) },
      { id: 'l2-tag', x: 420, y: 433, r: 22, label: 'Price tag changed', alter: alterTag('right', '6') },
      { id: 'l2-bird', x: 470, y: 118, r: 20, label: 'Bird missing from the wire', alter: alterMissingBird(1, 470) },
      { id: 'l2-window', x: 103, y: 240, r: 22, label: 'Window gone dark', alter: alterWindowDark(WINDOWS[0]) },
      { id: 'l2-star', x: 430, y: 40, r: 20, label: 'Extra star in the sky', alter: alterExtraStar(430, 40) },
    ],
  },
  {
    name: 'Midnight Market',
    time: 120,
    hints: 2,
    seed: 20261123,
    differences: [
      { id: 'l3-lantern', x: 490, y: 178, r: 26, label: 'Lantern missing from the string', alter: alterMissingLantern(2, 5) },
      { id: 'l3-awning', x: 412, y: 295, r: 24, label: 'Awning stripe recolored', alter: alterAwningStripe('right', 3, PALETTE.accent) },
      { id: 'l3-cat', x: 540, y: 382, r: 26, label: 'Extra cat on the stall counter', alter: alterExtraCat(540, 382) },
      { id: 'l3-bird', x: 210, y: 118, r: 20, label: 'Bird missing from the wire', alter: alterMissingBird(2, 210) },
      { id: 'l3-sign', x: 445, y: 333, r: 26, label: 'Sign character changed', alter: alterSign('right', 'NOODLFS') },
      { id: 'l3-crate', x: 241, y: 498, r: 28, label: 'Crate moved', alter: alterCrateMoved(222, 478) },
      { id: 'l3-star', x: 90, y: 90, r: 20, label: 'Extra star in the sky', alter: alterExtraStar(90, 90) },
      { id: 'l3-window', x: 453, y: 237, r: 22, label: 'Window gone dark', alter: alterWindowDark(WINDOWS[3]) },
      { id: 'l3-flag', x: 411, y: 255, r: 20, label: 'Bunting flag missing', alter: alterMissingFlag(8) },
      { id: 'l3-fruit', x: 140, y: 388, r: 22, label: 'Different fruit on the stall', alter: alterFruit(140, '#b678e8') },
      { id: 'l3-tassel', x: 70, y: 202, r: 20, label: "Lantern's tassel missing", alter: alterTasselMissing(0) },
    ],
  },
];

/**
 * Draw the level's base scene in panel-local coords (0,0)-(580,560).
 * The caller translates/clips the context to the panel first. Panel 'A' is
 * the reference; panel 'B' is the same scene with the differences applied.
 */
export function drawScene(ctx, levelIndex, panel) {
  const level = LEVELS[levelIndex];
  if (!level) return;
  ctx.save();
  drawBase(ctx, levelIndex, level.seed);
  if (panel === 'B') {
    for (const diff of level.differences) diff.alter(ctx);
  }
  ctx.restore();
}
