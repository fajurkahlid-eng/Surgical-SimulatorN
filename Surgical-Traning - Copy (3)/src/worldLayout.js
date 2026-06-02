/**
 * Optional `world-layout.json` beside index.html — overrides WORLD_CONFIG placement fields.
 */

/** @type {readonly string[]} */
export const LAYOUT_KEYS = [
  "patientPosition",
  "bedRotationY",
  "bedScale",
  "patientRotationY",
  "patientOnBedLocal",
  "patientOnBedYOffsetFineTune",
  "patientBedClearance",
  "bedFloorWorldY",
  "bedBottomClearance",
  "spawnOffsetFromPatient",
  "spawnRotation",
  "buildingScale",
  "interactionPromptOffsetFromPatient",
  "interactionPromptWorldPosition",
  "interactionRadius",
  "heartMonitorWorldPosition",
  "heartMonitorUseWorldProjection",
];

/**
 * @param {string} url default `./world-layout.json`
 */
export async function fetchWorldLayout(url = "./world-layout.json") {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    return typeof data === "object" && data !== null ? data : null;
  } catch {
    return null;
  }
}

/**
 * Deep-merge only known layout keys into `base` (mutates base).
 * @param {object} base typically WORLD_CONFIG
 * @param {object} loaded
 */
export function mergeLayoutIntoConfig(base, loaded) {
  if (!loaded || typeof loaded !== "object") return;
  for (let i = 0; i < LAYOUT_KEYS.length; i++) {
    const k = LAYOUT_KEYS[i];
    if (loaded[k] === undefined) continue;
    const v = loaded[k];
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === "object"
    ) {
      base[k] = { ...base[k], ...v };
    } else {
      base[k] = v;
    }
  }
}

/**
 * Snapshot of layout keys from WORLD_CONFIG for JSON export.
 * @param {object} cfg WORLD_CONFIG
 */
export function layoutPayloadFromConfig(cfg) {
  /** @type {Record<string, unknown>} */
  const out = { version: 1 };
  for (let i = 0; i < LAYOUT_KEYS.length; i++) {
    const k = LAYOUT_KEYS[i];
    const v = cfg[k];
    if (v !== undefined && typeof v === "object" && v !== null) {
      out[k] = JSON.parse(JSON.stringify(v));
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Trigger browser download of `world-layout.json`.
 * @param {object} payload
 */
export function downloadLayoutJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "world-layout.json";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
