/**
 * Babylon scene setup + GLB loading. Tweak WORLD_CONFIG after first run if scales/positions are off.
 */

/* global BABYLON */

/** @type {typeof BABYLON} */
const B = typeof BABYLON !== "undefined" ? BABYLON : window.BABYLON;

export const WORLD_CONFIG = {
  modelsPath: "./assets/models/",
  files: {
    building: "mainbuild.glb",
    bed: "surgical_bed.glb",
    doctor: "doctor.glb",
    patient: "BodyHuman.glb",
  },
  /**
   * If false (recommended for GLB with huge colliders): walk through bed rails / props.
   * If true: Babylon mesh-vs-camera collision (often blocks you near the bed).
   */
  useMeshCollisions: false,
  /** Lock eye height during exploration (simple alternative to full physics). */
  eyeHeight: 1.65,
  /**
   * Bed anchor in world space (`surgical_bed.glb`). Patient is parented to the bed and lifted onto the mattress.
   * Raise `y` to lift the whole bed slightly off the floor plane.
   */
  /** Bed anchor: with `patientOnBedLocal` below, patient world origin sits near (0, y, 0). */
  patientPosition: { x: 3.3, y: 0.26, z: 2.2 },
  bedRotationY: 0,
  bedScale: 1,
  /** Patient rotation on the mattress (local, radians). */
  patientRotationY: 0,
  /**
   * Local offset from bed anchor (same parent as the bed GLB). Use x=z=0 for same horizontal
   * placement as the bed; Y lifts the patient model above the anchor (metres). Tune in editor.
   */
  /** Local to bed anchor — offsets patient so bedside F / spawn land near (-3.3, 0, -2.2) world XZ. */
  patientOnBedLocal: { x: -3.3, y: 0, z: -2.2 },
  /** Extra Y added after `patientOnBedLocal` (fine tune). */
  patientOnBedYOffsetFineTune: 0,
  /** Legacy — kept for layout JSON / UI; no longer used (placement is manual via patientOnBedLocal Y). */
  patientBedClearance: 0.04,
  /**
   * World Y of the visible floor plane (mainbuild). Used only by `alignBedBottomToFloor`.
   * Change if your room floor is not at y=0.
   */
  bedFloorWorldY: 0,
  /**
   * After placing the bed anchor, raise it so the lowest vertex of the bed mesh sits
   * at least this far above `bedFloorWorldY`. GLB pivots are often mid-mattress, so
   * geometry can extend below the anchor into the floor without this step.
   */
  bedBottomClearance: 0.06,
  /**
   * Spawn: patient anchor world XZ + this offset; Y = eyeHeight.
   * (Pasted from coord copy at desired stand position.)
   */
  /** Spawn XZ = patient anchor world XZ + this; Y uses `eyeHeight` (matches coord HUD). */
  spawnOffsetFromPatient: { x: -1.915, z: 2.088 },
  /** Initial camera rotation (radians): pitch x, yaw y, roll z. */
  spawnRotation: {
    x: (18.8 * Math.PI) / 180,
    y: (145.1 * Math.PI) / 180,
    z: 0,
  },
  /** Applied to `mainbuild.glb` root (1 = scene units as exported). */
  buildingScale: 1,
  /**
   * Patient size: if `patientAutoNormalize` is true, bounds are measured after load and
   * scaled so the largest axis ≈ `patientTargetMaxDimensionMeters` (human scale vs building).
   * Then multiplied by `patientScale` for fine tuning.
   */
  patientAutoNormalize: true,
  /** Metres — typical supine body length / max extent (vs mainbuild 1u≈1m). */
  patientTargetMaxDimensionMeters: 1.78,
  /** Extra multiplier after auto-normalize (1 = default). */
  patientScale: 1,
  /** Used only if `doctorParentedToCamera` is true (usually leave false for real first-person). */
  doctorScale: 0.26,
  /**
   * If true, `doctor.glb` is parented under the camera (often fills the screen — model is not
   * an FPS arms-only rig). If false, the mesh is loaded but hidden — normal first-person.
   */
  doctorParentedToCamera: false,
  doctorLocalPosition: { x: 0, y: -1.22, z: 0.04 },
  doctorLocalRotationY: Math.PI,
  /**
   * World-space delta from patient anchor for Press F (used when `interactionPromptWorldPosition` is null).
   */
  interactionPromptOffsetFromPatient: { x: -3.3, y: 0, z: -2.2 },
  /**
   * If set (x,y,z numbers), Press F anchor + proximity use this world position (paste from coord HUD).
   * If null, uses patient anchor + `interactionPromptOffsetFromPatient`.
   */
  interactionPromptWorldPosition: { x: 1.542, y: 1.65, z: 0.736 },
  /** Metres — must cover distance from configured spawn to bedside (~12 m). */
  interactionRadius: 13,
  /** Reserved for future use (world-anchored vitals). Heart monitor uses fixed HUD only. */
  heartMonitorWorldPosition: { x: 0.245, y: 1.65, z: -1.118 },
  heartMonitorUseWorldProjection: false,
  /** First-person move speed (UniversalCamera `speed`). */
  playerWalkSpeed: 0.11,
  /** Sprint = walk × this (brisk ward pace, not a full run). */
  playerSprintMultiplier: 1.82,
  /** Smooth ramp-up toward sprint (per frame, higher = quicker). */
  playerAccelSmoothing: 0.2,
  /** Smooth ramp-down when releasing Shift (lower = less “skid”). */
  playerDecelSmoothing: 0.11,
};

/**
 * Fit patient meshes to a realistic size (mainbuild / scene assumed ~1 unit = 1 metre).
 * @param {BABYLON.TransformNode} anchor
 * @param {BABYLON.AbstractMesh[]} meshes
 * @param {number} targetMaxDimMeters
 * @param {number} multiplier WORLD_CONFIG.patientScale
 */
function computePatientUniformScale(anchor, meshes, targetMaxDimMeters, multiplier) {
  let min = new B.Vector3(Infinity, Infinity, Infinity);
  let max = new B.Vector3(-Infinity, -Infinity, -Infinity);
  let any = false;
  anchor.computeWorldMatrix(true);
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (!mesh.getBoundingInfo || !mesh.getTotalVertices) continue;
    if (mesh.getTotalVertices() === 0) continue;
    mesh.refreshBoundingInfo(true);
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min = B.Vector3.Minimize(min, box.minimumWorld);
    max = B.Vector3.Maximize(max, box.maximumWorld);
    any = true;
  }
  if (!any) return Math.max(0.001, multiplier);
  const size = max.subtract(min);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim < 1e-5) return Math.max(0.001, multiplier);
  return (targetMaxDimMeters * multiplier) / maxDim;
}

/**
 * @param {BABYLON.TransformNode} bedAnchor
 * @param {BABYLON.AbstractMesh[]} bedMeshes
 */
function alignBedBottomToFloor(bedAnchor, bedMeshes) {
  const floorY = WORLD_CONFIG.bedFloorWorldY ?? 0;
  const clearance = WORLD_CONFIG.bedBottomClearance ?? 0.05;
  bedAnchor.computeWorldMatrix(true);
  let minY = Infinity;
  for (let i = 0; i < bedMeshes.length; i++) {
    const mesh = bedMeshes[i];
    if (!mesh.getBoundingInfo || !mesh.getTotalVertices) continue;
    if (mesh.getTotalVertices() === 0) continue;
    mesh.refreshBoundingInfo(true);
    mesh.computeWorldMatrix(true);
    minY = Math.min(
      minY,
      mesh.getBoundingInfo().boundingBox.minimumWorld.y
    );
  }
  if (minY === Infinity) return;
  const target = floorY + clearance;
  if (minY < target) {
    bedAnchor.position.y += target - minY;
  }
}

/**
 * First-person spawn beside the patient (XZ from patient anchor world + offset).
 * @param {BABYLON.TransformNode} patientAnchor
 */
export function getPlayerSpawnPosition(patientAnchor) {
  const o = WORLD_CONFIG.spawnOffsetFromPatient;
  const pw = patientAnchor.getAbsolutePosition();
  return new B.Vector3(pw.x + o.x, WORLD_CONFIG.eyeHeight, pw.z + o.z);
}

/** Look-at point toward upper torso (uses patient anchor world XZ). */
export function getPatientLookTarget(patientAnchor) {
  const pw = patientAnchor.getAbsolutePosition();
  return new B.Vector3(pw.x, WORLD_CONFIG.eyeHeight * 0.88, pw.z);
}

/** Apply configured spawn yaw/pitch to the camera after position is set. */
export function applySpawnCameraRotation(camera) {
  const rot = WORLD_CONFIG.spawnRotation;
  if (!rot || typeof rot.y !== "number") return;
  camera.rotation.x = rot.x ?? 0;
  camera.rotation.y = rot.y;
  camera.rotation.z = rot.z ?? 0;
}

/**
 * Apply current `WORLD_CONFIG` placement to the loaded scene (editor / after JSON load).
 * @param {object} world return value of `createWorld`
 */
export function applyWorldLayout(world) {
  if (!world || !world.bedAnchor || !world.patientAnchor) return;
  const cfg = WORLD_CONFIG;
  const p = cfg.patientPosition || { x: 0, y: 0, z: 0 };
  world.bedAnchor.position.copyFromFloats(p.x, p.y, p.z);
  world.bedAnchor.rotation.y = cfg.bedRotationY ?? 0;

  const bs = cfg.bedScale ?? 1;
  if (world.bedRoot && world.bedRoot.scaling && world._appliedBedScale != null) {
    const r = bs / world._appliedBedScale;
    if (Math.abs(r - 1) > 1e-6) {
      world.bedRoot.scaling.scaleInPlace(r);
      world._appliedBedScale = bs;
    }
  }

  const pl = cfg.patientOnBedLocal || { x: 0, y: 0, z: 0 };
  world.patientAnchor.position.copyFromFloats(pl.x, pl.y, pl.z);
  world.patientAnchor.rotation.y = cfg.patientRotationY ?? 0;

  const bg = cfg.buildingScale ?? 1;
  if (world.buildingRoot && world.buildingRoot.scaling && world._appliedBuildingScale != null) {
    const r = bg / world._appliedBuildingScale;
    if (Math.abs(r - 1) > 1e-6) {
      world.buildingRoot.scaling.scaleInPlace(r);
      world._appliedBuildingScale = bg;
    }
  }

  alignBedBottomToFloor(world.bedAnchor, world.bedMeshes);

  world.patientAnchor.position.y += cfg.patientOnBedYOffsetFineTune ?? 0;

  if (world.camera) {
    world.camera.position.copyFrom(getPlayerSpawnPosition(world.patientAnchor));
    applySpawnCameraRotation(world.camera);
  }
}

/**
 * @param {BABYLON.Scene} scene
 * @param {HTMLCanvasElement} canvas
 */
export async function createWorld(scene, canvas) {
  const useCol = !!WORLD_CONFIG.useMeshCollisions;
  scene.collisionsEnabled = useCol;
  scene.gravity = new B.Vector3(0, 0, 0);

  const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  const dir = new B.DirectionalLight("dir", new B.Vector3(-0.4, -1, -0.2), scene);
  dir.intensity = 0.55;

  const buildingResult = await B.SceneLoader.ImportMeshAsync(
    "",
    WORLD_CONFIG.modelsPath,
    WORLD_CONFIG.files.building,
    scene
  );
  buildingResult.meshes.forEach((m) => {
    m.checkCollisions = useCol;
    m.isPickable = true;
  });
  const rootBuilding =
    buildingResult.transformNodes[0] ||
    buildingResult.meshes[0] ||
    null;
  if (rootBuilding && rootBuilding.scaling) {
    rootBuilding.scaling.scaleInPlace(WORLD_CONFIG.buildingScale);
  }

  const bedAnchor = new B.TransformNode("BedAnchor", scene);
  bedAnchor.position.copyFromFloats(
    WORLD_CONFIG.patientPosition.x,
    WORLD_CONFIG.patientPosition.y,
    WORLD_CONFIG.patientPosition.z
  );
  bedAnchor.rotation.y = WORLD_CONFIG.bedRotationY ?? 0;

  const bedResult = await B.SceneLoader.ImportMeshAsync(
    "",
    WORLD_CONFIG.modelsPath,
    WORLD_CONFIG.files.bed,
    scene
  );
  bedResult.meshes.forEach((m) => {
    m.checkCollisions = useCol;
    m.isPickable = true;
  });
  const bs = WORLD_CONFIG.bedScale ?? 1;
  if (bedResult.transformNodes && bedResult.transformNodes.length) {
    bedResult.transformNodes.forEach((tn) => tn.setParent(bedAnchor));
  } else if (bedResult.meshes.length) {
    bedResult.meshes[0].setParent(bedAnchor);
  }
  const bedRoot =
    bedResult.transformNodes[0] || bedResult.meshes[0] || null;
  if (bedRoot && bedRoot.scaling && bs !== 1) {
    bedRoot.scaling.scaleInPlace(bs);
  }

  alignBedBottomToFloor(bedAnchor, bedResult.meshes);

  const patientAnchor = new B.TransformNode("PatientAnchor", scene);
  patientAnchor.parent = bedAnchor;
  const pl = WORLD_CONFIG.patientOnBedLocal || { x: 0, y: 0, z: 0 };
  patientAnchor.position.copyFromFloats(pl.x, pl.y, pl.z);
  patientAnchor.rotation.y = WORLD_CONFIG.patientRotationY ?? 0;
  patientAnchor.scaling.copyFromFloats(1, 1, 1);

  const patientResult = await B.SceneLoader.ImportMeshAsync(
    "",
    WORLD_CONFIG.modelsPath,
    WORLD_CONFIG.files.patient,
    scene
  );
  if (patientResult.transformNodes && patientResult.transformNodes.length) {
    patientResult.transformNodes[0].setParent(patientAnchor);
  } else if (patientResult.meshes.length) {
    patientResult.meshes[0].setParent(patientAnchor);
  }
  patientResult.meshes.forEach((m) => {
    m.checkCollisions = useCol;
    m.isPickable = true;
  });

  const mult = WORLD_CONFIG.patientScale ?? 1;
  if (WORLD_CONFIG.patientAutoNormalize !== false) {
    const target = WORLD_CONFIG.patientTargetMaxDimensionMeters ?? 1.78;
    const u = computePatientUniformScale(
      patientAnchor,
      patientResult.meshes,
      target,
      mult
    );
    patientAnchor.scaling.copyFromFloats(u, u, u);
  } else {
    patientAnchor.scaling.copyFromFloats(mult, mult, mult);
  }

  patientAnchor.position.y += WORLD_CONFIG.patientOnBedYOffsetFineTune ?? 0;

  const doctorResult = await B.SceneLoader.ImportMeshAsync(
    "",
    WORLD_CONFIG.modelsPath,
    WORLD_CONFIG.files.doctor,
    scene
  );
  doctorResult.meshes.forEach((m) => {
    m.isPickable = false;
    m.checkCollisions = false;
  });

  const spawn = getPlayerSpawnPosition(patientAnchor);
  const camera = new B.UniversalCamera("playerCam", spawn, scene);
  if (WORLD_CONFIG.spawnRotation && typeof WORLD_CONFIG.spawnRotation.y === "number") {
    applySpawnCameraRotation(camera);
  } else {
    camera.setTarget(getPatientLookTarget(patientAnchor));
  }
  camera.attachControl(canvas, true);
  camera.minZ = 0.05;
  camera.checkCollisions = useCol;
  camera.applyGravity = false;
  camera.ellipsoid = new B.Vector3(0.35, 0.9, 0.35);
  camera.speed = WORLD_CONFIG.playerWalkSpeed;
  camera.angularSensibility = 3500;
  camera.inertia = 0.15;
  camera.keysUp = [87];
  camera.keysDown = [83];
  camera.keysLeft = [65];
  camera.keysRight = [68];

  if (WORLD_CONFIG.doctorParentedToCamera && doctorResult.meshes.length) {
    const holder = new B.TransformNode("DoctorVis", scene);
    holder.parent = camera;
    holder.position = new B.Vector3(
      WORLD_CONFIG.doctorLocalPosition.x,
      WORLD_CONFIG.doctorLocalPosition.y,
      WORLD_CONFIG.doctorLocalPosition.z
    );
    holder.rotation.y = WORLD_CONFIG.doctorLocalRotationY;
    holder.scaling.scaleInPlace(WORLD_CONFIG.doctorScale);
    if (doctorResult.transformNodes && doctorResult.transformNodes.length) {
      doctorResult.transformNodes[0].setParent(holder);
    } else {
      doctorResult.meshes[0].setParent(holder);
    }
  } else {
    doctorResult.meshes.forEach((m) => {
      m.setEnabled(false);
    });
  }

  scene.activeCamera = camera;

  return {
    camera,
    scene,
    bedAnchor,
    bedRoot,
    bedMeshes: bedResult.meshes,
    patientAnchor,
    patientMeshes: patientResult.meshes,
    buildingRoot: rootBuilding,
    doctorMeshes: doctorResult.meshes,
    _appliedBedScale: bs,
    _appliedBuildingScale: WORLD_CONFIG.buildingScale,
  };
}

/**
 * @param {BABYLON.TransformNode} patientAnchor
 */
export function getPatientInteractionPoint(patientAnchor) {
  const world = patientAnchor.getAbsolutePosition().clone();
  world.y += 0.9;
  return world;
}

/**
 * Bedside interaction anchor for F prompt projection.
 * @param {BABYLON.TransformNode} patientAnchor
 */
export function getInteractionPromptWorldPoint(patientAnchor) {
  const abs = WORLD_CONFIG.interactionPromptWorldPosition;
  if (
    abs &&
    typeof abs.x === "number" &&
    typeof abs.y === "number" &&
    typeof abs.z === "number"
  ) {
    return new B.Vector3(abs.x, abs.y, abs.z);
  }
  const off = WORLD_CONFIG.interactionPromptOffsetFromPatient || {
    x: 0,
    y: 1.15,
    z: 0,
  };
  const p = patientAnchor.getAbsolutePosition();
  return new B.Vector3(p.x + off.x, p.y + off.y, p.z + off.z);
}
