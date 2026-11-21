// Lantern Market — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The two picture panels. Panel-local coords run (0,0)-(580,560) inside each. */
export const PANELS = {
  left: { x: 40, y: 88, w: 580, h: 560 },
  right: { x: 660, y: 88, w: 580, h: 560 },
};

/** Header band (title + level) and footer band (hints / progress / prompts). */
export const HEADER = { x: 40, y: 0, w: 1200, h: 88, titleY: 52 };
export const FOOTER = { x: 40, y: 648, w: 1200, h: 72, textY: 690 };

/** Warm amber / teal night-market palette. */
export const PALETTE = {
  backdrop: '#171224',
  skyTop: '#241f45',
  skyMid: '#4a2f5e',
  skyHorizon: '#b5653a',
  panelFrame: '#3a2c4d',
  panelFrameInner: '#6b4f2a',
  text: '#fff3dd',
  muted: '#c9b8a3',
  accent: '#ffb347', // amber — lanterns, highlights, primary buttons
  accentDeep: '#e07b2e',
  teal: '#2fa8a0', // awnings, secondary accents
  tealDeep: '#1d6f6a',
  marker: '#7ee787', // found-difference ring
  wrong: '#ff5d5d', // wrong-click flash
  timer: '#ffd27a',
  timerLow: '#ff5d5d',
  hint: '#ffe9a8',
  ground: '#3a2a33',
  groundLight: '#4a3540',
  roof: '#241a33',
  roofLight: '#2e2242',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-market.best';

/** Scoring. */
export const FIND_POINTS = 100;
export const TIME_BONUS_PER_SECOND = 2;
export const WRONG_PENALTY_SECONDS = 5;

/** How long a hint pulse and a wrong-click flash stay visible, in seconds. */
export const HINT_DURATION = 2.5;
export const WRONG_FLASH_DURATION = 1.0;

/** Cursor movement, in panel-local pixels per step. */
export const CURSOR = {
  step: 12, // arrow-key nudge
  stepFast: 36, // arrow-key nudge with Shift held
  startX: 290, // centre of the left panel
  startY: 280,
};
