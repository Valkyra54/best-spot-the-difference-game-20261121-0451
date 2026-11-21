// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (confirm, pause, hint, switch panel) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost and
// never counted twice. Pointer clicks are queued with panel-local coords.
import { FIELD, PANELS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_HINT = 4;
export const ACTION_SWITCH = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const SHIFT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const held = new Set();
  const clicks = [];
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) held.add('left');
    else if (RIGHT.has(event.code)) held.add('right');
    else if (UP.has(event.code)) held.add('up');
    else if (DOWN.has(event.code)) held.add('down');
    else if (SHIFT.has(event.code)) held.add('shift');
    else if (event.code === 'Tab') {
      if (!event.repeat) actions |= ACTION_SWITCH;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyH') {
      if (!event.repeat) actions |= ACTION_HINT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    // Arrows / Space / Tab would otherwise scroll or move focus.
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) held.delete('left');
    else if (RIGHT.has(event.code)) held.delete('right');
    else if (UP.has(event.code)) held.delete('up');
    else if (DOWN.has(event.code)) held.delete('down');
    else if (SHIFT.has(event.code)) held.delete('shift');
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((event.clientY - rect.top) / rect.height) * FIELD.height;
    if (x >= PANELS.left.x && x <= PANELS.left.x + PANELS.left.w
      && y >= PANELS.left.y && y <= PANELS.left.y + PANELS.left.h) {
      clicks.push({ panel: 0, x: x - PANELS.left.x, y: y - PANELS.left.y });
    } else if (x >= PANELS.right.x && x <= PANELS.right.x + PANELS.right.w
      && y >= PANELS.right.y && y <= PANELS.right.y + PANELS.right.h) {
      clicks.push({ panel: 1, x: x - PANELS.right.x, y: y - PANELS.right.y });
    }
    // Clicks outside both panels are ignored (header, footer, gaps).
  });

  return {
    /** Held direction: { dx, dy } each -1, 0 or 1, plus fast while Shift is held. */
    direction() {
      return {
        dx: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        dy: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
        fast: held.has('shift'),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. Clears the queue. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The oldest queued click as { panel: 0|1, x, y } in panel-local coords, or null. */
    takeClick() {
      return clicks.length ? clicks.shift() : null;
    },
  };
}
