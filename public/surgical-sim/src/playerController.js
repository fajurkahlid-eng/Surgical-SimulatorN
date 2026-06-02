/**
 * Enable / disable first-person exploration (Babylon UniversalCamera controls + optional pointer lock).
 * Hold Shift for a faster, smoothed “brisk walk” (ward-realistic sprint).
 */

/* global BABYLON */

import { WORLD_CONFIG } from "./world.js";

const B = typeof BABYLON !== "undefined" ? BABYLON : window.BABYLON;

export class PlayerController {
  /**
   * @param {BABYLON.UniversalCamera} camera
   * @param {HTMLCanvasElement} canvas
   * @param {number} eyeHeight
   */
  constructor(camera, canvas, eyeHeight) {
    this.camera = camera;
    this.canvas = canvas;
    this.eyeHeight = eyeHeight;
    this._explore = false;
    this._lockHook = () => this._requestLock();

    this._walkSpeed = WORLD_CONFIG.playerWalkSpeed ?? camera.speed ?? 0.11;
    this._sprintSpeed =
      this._walkSpeed * (WORLD_CONFIG.playerSprintMultiplier ?? 1.75);
    this._smoothedSpeed = this._walkSpeed;
    this._shiftHeld = false;
    this._baseInertia = camera.inertia ?? 0.15;

    this._onKeyDown = (e) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        this._shiftHeld = true;
      }
    };
    this._onKeyUp = (e) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        this._shiftHeld = false;
      }
    };
    this._onBlur = () => {
      this._shiftHeld = false;
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);

    this._beforeRender = () => {
      if (!this._explore) {
        this.camera.speed = this._walkSpeed;
        this._smoothedSpeed = this._walkSpeed;
        this.camera.inertia = this._baseInertia;
        return;
      }
      this.camera.position.y = this.eyeHeight;

      const target = this._shiftHeld ? this._sprintSpeed : this._walkSpeed;
      const accel = WORLD_CONFIG.playerAccelSmoothing ?? 0.18;
      const decel = WORLD_CONFIG.playerDecelSmoothing ?? 0.1;
      const k = target > this._smoothedSpeed ? accel : decel;
      this._smoothedSpeed += (target - this._smoothedSpeed) * k;
      this.camera.speed = this._smoothedSpeed;

      const span = Math.max(1e-4, this._sprintSpeed - this._walkSpeed);
      const t = (this._smoothedSpeed - this._walkSpeed) / span;
      this.camera.inertia = this._baseInertia - t * 0.045;
    };
    camera.getScene().registerBeforeRender(this._beforeRender);
  }

  _requestLock() {
    if (!this._explore) return;
    const c = this.canvas;
    if (document.pointerLockElement === c) return;
    c.requestPointerLock?.();
  }

  /**
   * @param {boolean} on
   */
  setExplorationEnabled(on) {
    this._explore = on;
    if (!on) this._shiftHeld = false;
    if (on) {
      this.camera.attachControl(this.canvas, true);
      this.canvas.addEventListener("click", this._lockHook);
      document.body.classList.add("explore-mode");
      document.body.classList.remove("surgery-mode");
      this._smoothedSpeed = this._walkSpeed;
    } else {
      this.canvas.removeEventListener("click", this._lockHook);
      this.camera.detachControl();
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock?.();
      }
    }
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
    this.setExplorationEnabled(false);
    this.camera.getScene().unregisterBeforeRender(this._beforeRender);
  }
}
