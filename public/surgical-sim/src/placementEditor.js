/**
 * In-world layout editor: <kbd>P</kbd> toggles panel; Apply updates scene; Save downloads JSON.
 */

import {
  layoutPayloadFromConfig,
  downloadLayoutJson,
} from "./worldLayout.js";
import { WORLD_CONFIG, applyWorldLayout } from "./world.js";

/**
 * @param {object} opts
 * @param {HTMLElement} opts.overlay
 * @param {import("@babylonjs/core").Scene} [opts.scene]
 * @param {HTMLCanvasElement} [opts.canvas]
 * @param {() => object | null} opts.getWorld
 * @param {() => boolean} opts.isExploring
 * @param {(on: boolean) => void} opts.setExplorationEnabled
 */
export function createPlacementEditor(opts) {
  const overlay = opts.overlay;
  if (!overlay) {
    return {
      toggle() {},
      isOpen() {
        return false;
      },
      close() {},
    };
  }
  const scene = opts.scene;
  const canvas = opts.canvas;
  const getWorld = opts.getWorld;
  const isExploring = opts.isExploring;
  const setExplorationEnabled = opts.setExplorationEnabled;
  const pickHint = /** @type {HTMLElement | null} */ (
    overlay.querySelector("#placement-pick-hint")
  );

  /** @param {PointerEvent} ev */
  function onCanvasPointerDown(ev) {
    if (!open || !scene || !canvas || ev.target !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const pick = scene.pick(
      x,
      y,
      (mesh) => mesh.isPickable === true,
      false,
      scene.activeCamera
    );
    if (pick?.hit && pick.pickedMesh) {
      let m = pick.pickedMesh;
      const parts = [];
      while (m) {
        if (m.name) parts.push(m.name);
        m = m.parent;
      }
      if (pickHint) {
        pickHint.textContent =
          parts.length > 0
            ? "Picked: " + parts.join(" ← ")
            : "Picked: (unnamed mesh)";
      }
    } else if (pickHint) {
      pickHint.textContent = "No pickable mesh at cursor (click building / bed / patient).";
    }
  }

  /** @type {HTMLInputElement | null} */
  const num = (name) => /** @type {HTMLInputElement} */ (overlay.querySelector(`[name="${name}"]`));

  function readFormIntoConfig() {
    const g = (n, d) => {
      const el = num(n);
      return el ? Number(el.value) : d;
    };
    WORLD_CONFIG.patientPosition = {
      x: g("px", 0),
      y: g("py", 0),
      z: g("pz", 0),
    };
    WORLD_CONFIG.bedRotationY = g("bedRotY", 0);
    WORLD_CONFIG.bedScale = g("bedScale", 1);
    WORLD_CONFIG.patientRotationY = g("patRotY", 0);
    WORLD_CONFIG.patientOnBedLocal = {
      x: g("plx", 0),
      y: g("ply", 0),
      z: g("plz", 0),
    };
    WORLD_CONFIG.patientOnBedYOffsetFineTune = g("patYFine", 0);
    WORLD_CONFIG.patientBedClearance = g("bedClear", 0.04);
    WORLD_CONFIG.spawnOffsetFromPatient = {
      x: g("spx", 0),
      z: g("spz", 0),
    };
    WORLD_CONFIG.spawnRotation = {
      x: g("srx", 0),
      y: g("sry", 0),
      z: g("srz", 0),
    };
    WORLD_CONFIG.buildingScale = g("buildingScale", 1);
    WORLD_CONFIG.interactionPromptOffsetFromPatient = {
      x: g("ipx", 0),
      y: g("ipy", 0),
      z: g("ipz", 0),
    };
    WORLD_CONFIG.interactionRadius = g("ixRadius", 13);
  }

  function writeConfigToForm() {
    const c = WORLD_CONFIG;
    const set = (n, v) => {
      const el = num(n);
      if (el) el.value = String(v);
    };
    set("px", c.patientPosition?.x ?? 0);
    set("py", c.patientPosition?.y ?? 0);
    set("pz", c.patientPosition?.z ?? 0);
    set("bedRotY", c.bedRotationY ?? 0);
    set("bedScale", c.bedScale ?? 1);
    set("patRotY", c.patientRotationY ?? 0);
    set("plx", c.patientOnBedLocal?.x ?? 0);
    set("ply", c.patientOnBedLocal?.y ?? 0);
    set("plz", c.patientOnBedLocal?.z ?? 0);
    set("patYFine", c.patientOnBedYOffsetFineTune ?? 0);
    set("bedClear", c.patientBedClearance ?? 0.04);
    set("spx", c.spawnOffsetFromPatient?.x ?? 0);
    set("spz", c.spawnOffsetFromPatient?.z ?? 0);
    set("srx", c.spawnRotation?.x ?? 0);
    set("sry", c.spawnRotation?.y ?? 0);
    set("srz", c.spawnRotation?.z ?? 0);
    set("buildingScale", c.buildingScale ?? 1);
    set("ipx", c.interactionPromptOffsetFromPatient?.x ?? 0);
    set("ipy", c.interactionPromptOffsetFromPatient?.y ?? 0);
    set("ipz", c.interactionPromptOffsetFromPatient?.z ?? 0);
    set("ixRadius", c.interactionRadius ?? 13);
  }

  let open = false;

  function setOpen(v) {
    open = v;
    overlay.classList.toggle("hidden", !open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    if (canvas && scene) {
      if (open) {
        canvas.addEventListener("pointerdown", onCanvasPointerDown);
      } else {
        canvas.removeEventListener("pointerdown", onCanvasPointerDown);
      }
    }
    if (open) {
      writeConfigToForm();
      if (pickHint) {
        pickHint.textContent =
          "Click the 3D view (not this panel) to show the picked mesh name.";
      }
      setExplorationEnabled(false);
    } else {
      if (isExploring()) setExplorationEnabled(true);
    }
  }

  overlay.querySelector("#placement-editor-close")?.addEventListener("click", () => setOpen(false));
  overlay.querySelector("#placement-editor-apply")?.addEventListener("click", () => {
    readFormIntoConfig();
    const w = getWorld();
    if (w) applyWorldLayout(w);
  });
  overlay.querySelector("#placement-editor-save")?.addEventListener("click", () => {
    readFormIntoConfig();
    downloadLayoutJson(layoutPayloadFromConfig(WORLD_CONFIG));
  });

  return {
    toggle() {
      if (!isExploring()) return;
      setOpen(!open);
    },
    isOpen() {
      return open;
    },
    close() {
      if (open) setOpen(false);
    },
  };
}
