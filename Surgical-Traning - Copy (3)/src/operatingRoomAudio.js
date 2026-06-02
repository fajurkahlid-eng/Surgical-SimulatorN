/**
 * Short bedside-monitor style tone (Web Audio API — no external file).
 * One brief beep per QRS; resume AudioContext after user gesture on many browsers.
 */

/** One full cardiac cycle (ms) — keep HUD BPM in sync with this. */
export const HEARTBEAT_INTERVAL_MS = 920;

/**
 * @param {{ onBeat?: () => void }} [opts]
 * @returns {{
 *   start: () => void,
 *   stop: () => void,
 *   setVolume: (v: number) => void,
 *   resumeContext: () => Promise<void>,
 * }}
 */
export function createOperatingRoomHeartbeat(opts = {}) {
  const onBeat = typeof opts.onBeat === "function" ? opts.onBeat : null;
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {number | null} */
  let intervalId = null;
  let running = false;
  /** Blocks overlapping start() while resume() is in flight. */
  let pendingStart = false;
  let masterGain = null;
  let volume = 0.32;

  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }

  function monitorBeep(time) {
    if (!ctx || !masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    const t0 = Math.max(time, ctx.currentTime + 0.001);
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.linearRampToValueAtTime(940, t0 + 0.022);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.06);
  }

  function beat() {
    if (!ctx || !masterGain || !running) return;
    const t = ctx.currentTime + 0.015;
    monitorBeep(t);
    if (onBeat) onBeat();
  }

  return {
    resumeContext() {
      const c = ensureCtx();
      if (!c) return Promise.resolve();
      if (c.state === "suspended") return c.resume().then(() => undefined);
      return Promise.resolve();
    },

    start() {
      const c = ensureCtx();
      if (!c || !masterGain) return;
      if (running || pendingStart) return;

      const kick = () => {
        beat();
        if (intervalId != null) window.clearInterval(intervalId);
        intervalId = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
      };

      const launch = () => {
        pendingStart = false;
        if (running) return;
        running = true;
        kick();
      };

      if (c.state === "suspended") {
        pendingStart = true;
        c.resume().then(launch).catch(launch);
      } else {
        launch();
      }
    },

    stop() {
      running = false;
      pendingStart = false;
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (masterGain) masterGain.gain.value = volume;
    },
  };
}
