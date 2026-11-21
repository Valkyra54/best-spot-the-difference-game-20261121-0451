// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens live in
// world.screen: title, play, level (cleared), done (all levels cleared),
// over (time up), paused.
//
// ?seed=N is parsed for determinism (levels already carry fixed seeds; the
// world takes no seed argument). ?shot=title|play|late|done stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { CURSOR, PANELS, TIME_BONUS_PER_SECOND, WRONG_PENALTY_SECONDS } from './config.js';
import { LEVELS } from './scenes.js';
import { createWorld } from './world.js';
import {
  createRenderer,
  SCREEN_DONE,
  SCREEN_LEVEL,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './render.js';
import {
  ACTION_CONFIRM,
  ACTION_HINT,
  ACTION_PAUSE,
  ACTION_SWITCH,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const STEP = 1 / 60;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
// Parsed for the record; createWorld() takes no arguments — determinism comes
// from the fixed per-level seeds in scenes.js.
const seed = Number.isInteger(seedParam) ? seedParam : null;
void seed;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const state = world.state ?? world;
const renderer = createRenderer(canvas);
const audio = createAudio();

function announce(message) {
  if (status) status.textContent = message;
}

function levelTotal() {
  const level = LEVELS[state.levelIndex];
  return level && level.differences ? level.differences.length : 0;
}

function diffLabel(id) {
  const level = LEVELS[state.levelIndex];
  const diff = level && level.differences ? level.differences.find((d) => d.id === id) : null;
  return diff ? diff.label || String(diff.id) : String(id ?? '');
}

/** Mark the difference at the cursor (or a click) and react to the result. */
function markAt(panel, x, y) {
  const res = world.markAt(panel, x, y) || {};
  if (res.result === 'found') {
    audio.find();
    announce(`Found: ${diffLabel(res.id)} — ${state.found.size} of ${levelTotal()} in this level.`);
  } else if (res.result === 'already') {
    audio.click();
    announce('Already found that one.');
  } else if (res.result === 'wrong') {
    audio.wrong();
    announce(`Not a difference — ${WRONG_PENALTY_SECONDS} seconds lost.`);
  }
  return res;
}

function startGame() {
  world.reset();
  world.startLevel(0);
  audio.click();
  // The screen-change watcher announces the level once play begins.
}

function retryLevel() {
  world.startLevel(state.levelIndex);
  audio.click();
  // The screen-change watcher announces the level once play begins.
}

function pauseGame() {
  if (state.screen !== SCREEN_PLAY) return;
  state.screen = SCREEN_PAUSED;
  announce('Paused.');
}

function resumeGame() {
  if (state.screen !== SCREEN_PAUSED) return;
  state.screen = SCREEN_PLAY;
  announce('Playing.');
}

/** Confirm does what the current screen asks for, or marks at the cursor. */
function confirm() {
  if (state.screen === SCREEN_TITLE) startGame();
  else if (state.screen === SCREEN_LEVEL) {
    // The time bonus was already banked once, inside levelComplete().
    world.nextLevel();
    audio.click();
  } else if (state.screen === SCREEN_DONE) startGame();
  else if (state.screen === SCREEN_OVER) retryLevel();
  else if (state.screen === SCREEN_PAUSED) resumeGame();
  else if (state.screen === SCREEN_PLAY) markAt(state.cursor.panel, state.cursor.x, state.cursor.y);
}

function runShot(name) {
  const staged = stageShot(name, world);
  if (staged && typeof staged.best === 'number') state.best = staged.best;
  announce(`Lantern Market — ${staged ? staged.screen : name} scene.`);
  let painted = 0;
  function paint() {
    renderer.draw(state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let prevScreen = state.screen;

  function onScreenChange(next, prev) {
    if (next === SCREEN_LEVEL) {
      const bonus = Math.max(0, Math.round(state.timeLeft ?? 0)) * TIME_BONUS_PER_SECOND;
      audio.win();
      announce(`Level clear! Time bonus +${bonus}. Total score ${state.score}. Press Space for the next level.`);
    } else if (next === SCREEN_DONE) {
      audio.win();
      announce(`Market mastered! Total score ${state.score}. Best ${state.best}. Press Space to play again.`);
    } else if (next === SCREEN_OVER) {
      announce(`Time's up. Score ${state.score}. Best ${state.best}. Press Space to retry.`);
    } else if (next === SCREEN_PLAY && prev === SCREEN_PAUSED) {
      announce('Playing.');
    } else if (next === SCREEN_PLAY) {
      const level = LEVELS[state.levelIndex];
      announce(`Playing. ${level ? level.name : 'Level'} — find ${levelTotal()} differences.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_SWITCH) {
      const p = state.cursor.panel;
      state.cursor.panel = p === 'A' ? 'B' : p === 'B' ? 'A' : p === 1 ? 0 : 1;
    }
    if (actions & ACTION_PAUSE) {
      if (state.screen === SCREEN_PLAY) pauseGame();
      else if (state.screen === SCREEN_PAUSED) resumeGame();
    }
    if (actions & ACTION_HINT && state.screen === SCREEN_PLAY) {
      const id = world.useHint();
      audio.hint();
      if (id !== null && id !== undefined) announce(`Hint: look for ${diffLabel(id)}.`);
      else announce('No hints left.');
    }
    if (actions & ACTION_CONFIRM) confirm();
  }

  function handleClicks() {
    let click;
    while ((click = input.takeClick()) !== null) {
      if (state.screen === SCREEN_PLAY) {
        markAt(click.panel, click.x, click.y);
      } else if (state.screen === SCREEN_PAUSED) {
        resumeGame();
      } else if (
        state.screen === SCREEN_TITLE
        || state.screen === SCREEN_LEVEL
        || state.screen === SCREEN_DONE
        || state.screen === SCREEN_OVER
      ) {
        confirm();
      }
    }
  }

  function moveCursor() {
    if (state.screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    if (!dir.dx && !dir.dy) return;
    const step = dir.fast ? CURSOR.stepFast : CURSOR.step;
    state.cursor.x = Math.max(0, Math.min(PANELS.left.w, state.cursor.x + dir.dx * step));
    state.cursor.y = Math.max(0, Math.min(PANELS.left.h, state.cursor.y + dir.dy * step));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClicks();
    while (accumulator >= STEP) {
      moveCursor();
      world.tick(STEP);
      accumulator -= STEP;
    }
    renderer.draw(state);
    if (state.screen !== prevScreen) {
      onScreenChange(state.screen, prevScreen);
      prevScreen = state.screen;
    }
  }

  // Leaving the tab pauses a running game rather than letting the clock run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === SCREEN_PLAY) pauseGame();
  });

  announce('Lantern Market. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
