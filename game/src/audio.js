// Tiny WebAudio sound effects, no assets. The AudioContext is created lazily
// on the first sound (inside a user gesture, so it is allowed to start) and
// every effect is silent when audio is unavailable. All sounds are under 0.4s.
export function createAudio() {
  let ctx = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        try {
          const resumed = ctx.resume();
          if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
        } catch {
          // Resuming is best-effort; a suspended context just stays silent.
        }
      }
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, delay, dur, type, vol) {
    const ac = ensure();
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const t0 = ac.currentTime + (delay || 0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // A failed note must never break the game loop.
    }
  }

  return {
    /** Bright two-note chime for a found difference. */
    find() {
      tone(880, 0, 0.14, 'sine', 0.15);
      tone(1318.5, 0.09, 0.18, 'sine', 0.15);
    },
    /** Short low buzz for a wrong click. */
    wrong() {
      tone(110, 0, 0.18, 'sawtooth', 0.1);
    },
    /** Soft blip for a hint. */
    hint() {
      tone(660, 0, 0.12, 'sine', 0.1);
    },
    /** Four-note arpeggio for a cleared level / finished game. */
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], i * 0.08, 0.12, 'sine', 0.14);
    },
    /** Tiny tick for a UI press. */
    click() {
      tone(1200, 0, 0.04, 'square', 0.05);
    },
  };
}
