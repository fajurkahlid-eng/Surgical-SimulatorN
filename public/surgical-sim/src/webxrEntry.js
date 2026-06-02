/**
 * WebXR availability check (immersive VR). Requires secure context (HTTPS or localhost).
 */

export async function isImmersiveVrSupported() {
  if (typeof navigator === "undefined" || !navigator.xr) {
    return false;
  }
  try {
    return await navigator.xr.isSessionSupported("immersive-vr");
  } catch {
    return false;
  }
}
