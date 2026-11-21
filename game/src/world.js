// Lantern Market — game state and rules, with no drawing and no browser in it
// beyond localStorage for the best score. The world owns the screen, the
// current level, what has been found, the timer, the score, the cursor, and
// the hint / wrong-click flashes the renderer paints.
//
// Screens: 'title' | 'play' | 'level' (level cleared) | 'over' (time up) |
// 'done' (all three levels cleared).
import {
  BEST_KEY,
  CURSOR,
  FIND_POINTS,
  HINT_DURATION,
  TIME_BONUS_PER_SECOND,
  WRONG_FLASH_DURATION,
  WRONG_PENALTY_SECONDS,
} from './config.js';
import { LEVELS } from './scenes.js';

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

/** Panel argument may be 0 | 1 (cursor style) or 'A' | 'B' (panel style). */
function normalizePanel(panel) {
  if (panel === 'B' || panel === 1) return 1;
  return 0;
}

export function createWorld() {
  // The returned object IS the state (fields below), with the methods
  // attached and `.state` pointing at itself, so both `world.screen` and
  // `world.state.screen` read the same value.
  const world = {
    screen: 'title',
    levelIndex: 0,
    found: new Set(),
    markers: [],
    timeLeft: LEVELS[0].time,
    score: 0,
    levelScore: 0,
    hintsLeft: LEVELS[0].hints,
    cursor: { panel: 0, x: CURSOR.startX, y: CURSOR.startY },
    hintPulse: null,
    wrongFlash: null,
    best: readBest(),
  };
  world.state = world;

  function addScore(points) {
    world.score += points;
    world.levelScore += points;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
  }

  /** Time bonus for the time left when a level is cleared. Added once. */
  function timeBonus() {
    return Math.max(0, Math.round(world.timeLeft)) * TIME_BONUS_PER_SECOND;
  }

  function startLevel(index) {
    const level = LEVELS[index];
    if (!level) return;
    world.levelIndex = index;
    world.found = new Set();
    world.markers = [];
    world.timeLeft = level.time;
    world.levelScore = 0;
    world.hintsLeft = level.hints;
    world.cursor = { panel: 0, x: CURSOR.startX, y: CURSOR.startY };
    world.hintPulse = null;
    world.wrongFlash = null;
    world.screen = 'play';
  }

  /**
   * Click at panel-local (x, y) on either panel — a click on either panel at
   * the same local coords counts. Returns { result, id? }:
   * 'found' (nearest unfound difference within its r), 'already' (nearest
   * difference within its r was found before), or 'wrong'.
   */
  function markAt(panel, x, y) {
    if (world.screen !== 'play') return { result: 'wrong' };
    const level = LEVELS[world.levelIndex];
    const p = normalizePanel(panel);
    let nearestUnfound = null;
    let nearestUnfoundDist = Infinity;
    let nearestFoundDist = Infinity;
    for (const diff of level.differences) {
      const dist = Math.hypot(x - diff.x, y - diff.y);
      if (dist > diff.r) continue;
      if (world.found.has(diff.id)) {
        if (dist < nearestFoundDist) nearestFoundDist = dist;
      } else if (dist < nearestUnfoundDist) {
        nearestUnfound = diff;
        nearestUnfoundDist = dist;
      }
    }
    if (nearestUnfound) {
      world.found.add(nearestUnfound.id);
      world.markers.push({ id: nearestUnfound.id, x: nearestUnfound.x, y: nearestUnfound.y, r: nearestUnfound.r });
      addScore(FIND_POINTS);
      if (world.found.size === level.differences.length) levelComplete();
      return { result: 'found', id: nearestUnfound.id };
    }
    if (nearestFoundDist !== Infinity) return { result: 'already' };
    world.timeLeft = Math.max(0, world.timeLeft - WRONG_PENALTY_SECONDS);
    world.wrongFlash = { x, y, panel: p, until: WRONG_FLASH_DURATION };
    if (world.timeLeft <= 0) world.screen = 'over';
    return { result: 'wrong' };
  }

  /**
   * Spend one hint on a random unfound difference. Returns its id, or null
   * when no hints are left or nothing is unfound. The pulse lasts
   * HINT_DURATION seconds (counted down by tick).
   */
  function useHint() {
    if (world.screen !== 'play' || world.hintsLeft <= 0) return null;
    const level = LEVELS[world.levelIndex];
    const unfound = level.differences.filter((diff) => !world.found.has(diff.id));
    if (unfound.length === 0) return null;
    const picked = unfound[Math.floor(Math.random() * unfound.length)];
    world.hintsLeft -= 1;
    world.hintPulse = { id: picked.id, until: HINT_DURATION };
    return picked.id;
  }

  /**
   * Advance the clock by dt seconds. timeLeft only falls while playing;
   * hint / wrong flashes always count down. At 0 the run is over.
   */
  function tick(dt) {
    if (world.hintPulse) {
      world.hintPulse.until -= dt;
      if (world.hintPulse.until <= 0) world.hintPulse = null;
    }
    if (world.wrongFlash) {
      world.wrongFlash.until -= dt;
      if (world.wrongFlash.until <= 0) world.wrongFlash = null;
    }
    if (world.screen !== 'play') return;
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      world.screen = 'over';
    }
  }

  /**
   * True when every difference in this level is found. On the first call
   * that finds it true (while still playing), banks the time bonus and
   * moves to the 'level' screen. Safe to call as a pure check afterwards.
   */
  function levelComplete() {
    const level = LEVELS[world.levelIndex];
    if (world.found.size !== level.differences.length) return false;
    if (world.screen === 'play') {
      addScore(timeBonus());
      world.screen = 'level';
    }
    return true;
  }

  /**
   * From the 'level' screen: start the next level, or finish the game after
   * L3. (The time bonus is banked once, in levelComplete, not here.)
   */
  function nextLevel() {
    if (world.levelIndex + 1 < LEVELS.length) {
      startLevel(world.levelIndex + 1);
    } else {
      world.screen = 'done';
      if (world.score > world.best) {
        world.best = world.score;
        saveBest(world.best);
      }
    }
  }

  /** Back to the title screen, level 0, score cleared. */
  function reset() {
    world.screen = 'title';
    world.levelIndex = 0;
    world.found = new Set();
    world.markers = [];
    world.timeLeft = LEVELS[0].time;
    world.score = 0;
    world.levelScore = 0;
    world.hintsLeft = LEVELS[0].hints;
    world.cursor = { panel: 0, x: CURSOR.startX, y: CURSOR.startY };
    world.hintPulse = null;
    world.wrongFlash = null;
  }

  world.startLevel = startLevel;
  world.markAt = markAt;
  world.useHint = useHint;
  world.tick = tick;
  world.nextLevel = nextLevel;
  world.reset = reset;
  world.levelComplete = levelComplete;
  return world;
}
