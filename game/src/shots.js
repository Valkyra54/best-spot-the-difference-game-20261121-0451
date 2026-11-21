// The screenshot scenes behind ?shot=title|play|late|done. Each one sets the
// real world to a fixed, deterministic state (startLevel plus direct state
// sets — no randomness beyond the levels' own fixed seeds) and returns the
// screen to draw and the best score to show. Any other name behaves as 'title'.
import { LEVELS } from './scenes.js';
import { SCREEN_DONE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function setFound(world, state, levelIndex, count) {
  const diffs = LEVELS[levelIndex].differences.slice(0, count);
  state.found = new Set(diffs.map((d) => d.id));
  state.markers = diffs.map((d) => ({ id: d.id, x: d.x, y: d.y, r: d.r }));
}

/**
 * Set `world` to the named scene and return { screen, best }.
 * 'title': level 0, 0 found, full time, title screen.
 * 'play':  level 1, exactly 4 of its 9 differences found, 100s left, playing.
 * 'late':  level 2, exactly 8 of its 11 differences found, 32s left, playing.
 * 'done':  done screen, score 2450, best 2450.
 */
export function stageShot(name, world) {
  const state = world.state ?? world;
  if (name === 'play') {
    world.startLevel(1);
    setFound(world, state, 1, 4);
    state.timeLeft = 100;
    state.score = 400;
    state.screen = SCREEN_PLAY;
    state.hintPulse = null;
    state.wrongFlash = null;
    return { screen: SCREEN_PLAY, best: state.best ?? 0 };
  }
  if (name === 'late') {
    world.startLevel(2);
    setFound(world, state, 2, 8);
    state.timeLeft = 32;
    state.score = 800;
    state.screen = SCREEN_PLAY;
    state.hintPulse = null;
    state.wrongFlash = null;
    return { screen: SCREEN_PLAY, best: state.best ?? 0 };
  }
  if (name === 'done') {
    world.startLevel(2);
    setFound(world, state, 2, LEVELS[2].differences.length);
    state.score = 2450;
    state.best = 2450;
    state.timeLeft = 45;
    state.screen = SCREEN_DONE;
    state.hintPulse = null;
    state.wrongFlash = null;
    return { screen: SCREEN_DONE, best: 2450 };
  }
  // 'title' and anything else.
  world.reset();
  state.timeLeft = LEVELS[0].time;
  state.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE, best: state.best ?? 0 };
}
