/**
 * Bedside-style HR monitor — only during suturing / layered / damage-control;
 * scrolling ECG + vertical oscillation; HR zones vs displayed BPM.
 */

import { GameState } from "./gameState.js";
import { HEARTBEAT_INTERVAL_MS } from "./operatingRoomAudio.js";

const SETTLE_MS = 2200;
const ECG_SEGMENT_UNITS = 200;
const QRS_PER_SEGMENT = 3;

/** Clinical-style alarm bands (displayed BPM). */
const HR_GREEN_MAX = 106;
const HR_YELLOW_MAX = 110;

/**
 * @param {object} opts
 * @param {() => { state: string }} opts.getGameState
 */
export function createHeartMonitorHud(opts) {
  const getGameState = opts.getGameState;
  let pulseTimer = 0;
  /** True while SURGERY / layered / damage-control (vitals visible). */
  let lastVitalsShown = false;
  let settling = false;
  let settleStart = 0;
  let settleFrom = 0;
  let bpmSmooth = 65;
  const targetBpm = () =>
    Math.max(40, Math.min(180, Math.round(60000 / HEARTBEAT_INTERVAL_MS)));

  const scrollPerMs =
    ECG_SEGMENT_UNITS / QRS_PER_SEGMENT / HEARTBEAT_INTERVAL_MS;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Slow drift + occasional tachycardia-style rise so yellow/red zones can appear. */
  function liveBpmTarget(base, nowMs) {
    const t = nowMs / 1000;
    const drift =
      2.4 * Math.sin(t * 0.95) +
      1.2 * Math.sin(t * 0.31) +
      0.5 * Math.sin(t * 3.8);
    const slowTachy = 52 * Math.max(0, Math.sin(t * 0.036));
    return Math.max(42, Math.min(130, base + drift + slowTachy));
  }

  function applyHrZone(root, bpmRounded) {
    let z = "green";
    if (bpmRounded > HR_YELLOW_MAX) z = "red";
    else if (bpmRounded > HR_GREEN_MAX) z = "yellow";
    root.setAttribute("data-hr-zone", z);
  }

  function isProcedureVitalsState(state) {
    return (
      state === GameState.SURGERY ||
      state === GameState.LAYERED_PROCEDURE ||
      state === GameState.DAMAGE_CONTROL_LAPAROTOMY
    );
  }

  return {
    pulse() {
      const root = document.getElementById("heart-monitor-hud");
      const stripEl = document.getElementById("heart-monitor-strip");
      if (!root) return;
      root.classList.add("heart-monitor-hud--pulse");
      stripEl?.classList.add("heart-monitor-strip--pulse");
      window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => {
        root.classList.remove("heart-monitor-hud--pulse");
        stripEl?.classList.remove("heart-monitor-strip--pulse");
      }, 200);
    },

    tick() {
      const root = document.getElementById("heart-monitor-hud");
      const bpmEl = document.getElementById("heart-monitor-bpm");
      const scrollEl = document.getElementById("heart-monitor-ecg-scroll");
      if (!root || !bpmEl) return;

      const now = performance.now();
      const gs = getGameState();
      const showVitals = gs && isProcedureVitalsState(gs.state);
      root.classList.toggle("hidden", !showVitals);
      root.setAttribute("aria-hidden", showVitals ? "false" : "true");
      if (!showVitals) {
        lastVitalsShown = false;
        settling = false;
        bpmSmooth = targetBpm();
        root.setAttribute("data-hr-zone", "green");
        root.classList.remove("heart-monitor-hud--settling");
        return;
      }
      root.classList.add("heart-monitor-hud--procedure-dock");

      const target = targetBpm();

      if (showVitals && !lastVitalsShown) {
        settling = true;
        settleStart = now;
        settleFrom = target + 28 + Math.random() * 22;
        bpmEl.textContent = String(Math.round(settleFrom));
        root.classList.add("heart-monitor-hud--settling");
      }
      lastVitalsShown = true;

      /* Horizontal scroll + vertical oscillation each cardiac cycle (تردد مع النبض). */
      if (scrollEl) {
        const offset = (now * scrollPerMs) % ECG_SEGMENT_UNITS;
        const beatPhase =
          (now % HEARTBEAT_INTERVAL_MS) / HEARTBEAT_INTERVAL_MS;
        const verticalOsc =
          Math.sin(beatPhase * Math.PI * 2) * 2.85 +
          Math.sin(beatPhase * Math.PI * 4) * 0.45;
        scrollEl.setAttribute(
          "transform",
          `translate(${-offset},${verticalOsc})`
        );
      }

      if (settling) {
        const elapsed = now - settleStart;
        const t = Math.min(1, elapsed / SETTLE_MS);
        const ease = 1 - Math.pow(1 - t, 2.4);
        const damp = (1 - t) * (1 - t);
        const wobble = Math.sin(t * Math.PI * 6) * 5.5 * damp;
        const v = lerp(settleFrom, target, ease) + wobble;
        const rv = Math.round(v);
        bpmEl.textContent = String(rv);
        applyHrZone(root, rv);
        if (t >= 1) {
          settling = false;
          root.classList.remove("heart-monitor-hud--settling");
          bpmSmooth = liveBpmTarget(target, now);
          bpmEl.textContent = String(Math.round(bpmSmooth));
          applyHrZone(root, Math.round(bpmSmooth));
        }
      } else {
        const want = liveBpmTarget(target, now);
        bpmSmooth += (want - bpmSmooth) * 0.14;
        const shown = Math.round(bpmSmooth);
        bpmEl.textContent = String(shown);
        applyHrZone(root, shown);
      }
    },
  };
}
