/**
 * Proximity check + F key to start surgery during exploration.
 */

export class PatientInteraction {
  /**
   * @param {object} opts
   * @param {() => { x: number, y: number, z: number }} opts.getPlayerPosition
   * @param {() => { x: number, y: number, z: number }} opts.getPatientPoint
   * @param {number} [opts.interactDistance]
   * @param {(near: boolean) => void} opts.onProximityChange
   * @param {() => boolean} opts.isExploring
   * @param {() => boolean} [opts.canInteract] return false to ignore F (e.g. menu open)
   * @param {() => void} opts.onStartSurgery
   */
  constructor(opts) {
    this.getPlayerPosition = opts.getPlayerPosition;
    this.getPatientPoint = opts.getPatientPoint;
    this.interactDistance = opts.interactDistance ?? 3.5;
    this.onProximityChange = opts.onProximityChange;
    this.isExploring = opts.isExploring;
    this.canInteract = opts.canInteract ?? (() => true);
    this.onStartSurgery = opts.onStartSurgery;
    this._near = false;

    this._keydown = (e) => {
      if (!this.isExploring()) return;
      if (!this.canInteract()) return;
      if (e.code === "KeyF" || e.key === "f" || e.key === "F") {
        if (this._near) {
          e.preventDefault();
          this.onStartSurgery();
        }
      }
    };
    window.addEventListener("keydown", this._keydown);
  }

  tick() {
    if (!this.isExploring()) {
      if (this._near) {
        this._near = false;
        this.onProximityChange(false);
      }
      return;
    }
    const p = this.getPlayerPosition();
    const t = this.getPatientPoint();
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const dz = p.z - t.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const near = dist <= this.interactDistance;
    if (near !== this._near) {
      this._near = near;
      this.onProximityChange(near);
    }
  }

  dispose() {
    window.removeEventListener("keydown", this._keydown);
  }

  /** After closing the F menu — refresh prompt if still within interaction range */
  refreshProximityUi() {
    this.onProximityChange(this._near);
  }
}
