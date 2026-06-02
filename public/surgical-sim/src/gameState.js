/**
 * Central application states and lightweight pub/sub for UI ↔ 3D orchestration.
 */

export const GameState = {
  START: "START",
  EXPLORING: "EXPLORING",
  SURGERY: "SURGERY",
  LAYERED_PROCEDURE: "LAYERED_PROCEDURE",
  DAMAGE_CONTROL_LAPAROTOMY: "DAMAGE_CONTROL_LAPAROTOMY",
  RESULTS: "RESULTS",
};

export class GameStateManager {
  constructor() {
    this.state = GameState.START;
    this.traineeName = "";
    /** @type {Set<(s: string) => void>} */
    this._listeners = new Set();
  }

  /** @param {(state: string) => void} fn */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** @param {string} next */
  setState(next) {
    if (this.state === next) return;
    this.state = next;
    for (const fn of this._listeners) {
      try {
        fn(next);
      } catch (e) {
        console.error(e);
      }
    }
  }

  setTraineeName(name) {
    this.traineeName = (name && String(name).trim()) || "Trainee";
  }
}
