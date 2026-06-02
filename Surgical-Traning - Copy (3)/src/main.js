/**
 * Entry: Babylon engine, world load, game flow, DOM wiring.
 */

/* global BABYLON */

import { GameState, GameStateManager } from "./gameState.js";
import {
  applySpawnCameraRotation,
  createWorld,
  getInteractionPromptWorldPoint,
  getPlayerSpawnPosition,
  WORLD_CONFIG,
} from "./world.js";
import { fetchWorldLayout, mergeLayoutIntoConfig } from "./worldLayout.js";
import { createPlacementEditor } from "./placementEditor.js";
import { PlayerController } from "./playerController.js";
import { PatientInteraction } from "./patientInteraction.js";
import { DamageControlLaparotomyUI } from "./damageControlLaparotomyUI.js";
import { LayeredClosureUI } from "./layeredClosureUI.js";
import { SuturingUI } from "./suturingUI.js";
import { fillResults, hideResults, showResults } from "./resultsUI.js";
import { createOperatingRoomHeartbeat } from "./operatingRoomAudio.js";
import { createHeartMonitorHud } from "./heartMonitorHud.js";

const B = window.BABYLON;

function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn("Missing element #" + id);
  return el;
}

async function main() {
  const canvas = /** @type {HTMLCanvasElement} */ ($("renderCanvas"));
  if (!B || !canvas) {
    console.error("Babylon.js or canvas missing.");
    return;
  }

  const engine = new B.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });
  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.04, 0.05, 0.08, 1);

  const gameState = new GameStateManager();

  const startScreen = $("start-screen");
  const traineeInput = /** @type {HTMLInputElement} */ ($("trainee-name"));
  const btnStart = /** @type {HTMLButtonElement} */ ($("btn-start"));
  const exploreHud = $("hud-explore");
  const hudName = $("hud-name");
  const interactionPrompt = $("interaction-prompt");
  const resultsScreen = $("results-screen");
  const resultsTitle = $("results-title");
  const resultsBody = $("results-body");
  const btnReturn = /** @type {HTMLButtonElement} */ ($("btn-return-ward"));
  const btnRestart = /** @type {HTMLButtonElement} */ ($("btn-restart-app"));
  const coordDock = $("coord-dock");
  const coordMini = $("coord-mini");
  const coordReader = $("coord-reader");
  const coordText = $("coord-reader-text");
  const coordPatient = $("coord-patient-text");
  const coordCopy = /** @type {HTMLButtonElement} */ ($("coord-copy"));
  const preOpOverlay = $("pre-op-overlay");
  const btnPreOpContinue = /** @type {HTMLButtonElement | null} */ (
    $("pre-op-continue")
  );
  const surgeryChoiceOverlay = $("surgery-choice-overlay");
  const layeredProcedureOverlay = $("layered-procedure-overlay");
  const damageControlOverlay = $("damage-control-overlay");
  const btnChoiceSuture = /** @type {HTMLButtonElement} */ ($("btn-choice-suture"));
  const btnChoiceLayered = /** @type {HTMLButtonElement} */ ($("btn-choice-layered"));
  const btnChoiceDamage = /** @type {HTMLButtonElement} */ ($("btn-choice-damage"));
  let coordVisible = false;
  /** Procedure menu open — blocks repeat F key and movement */
  let wardMenuBlocksInteract = false;

  const suturingDom = {
    overlay: /** @type {HTMLElement} */ ($("suturing-overlay")),
    suturingShell: /** @type {HTMLElement | null} */ (
      document.querySelector("#suturing-overlay .suturing-shell")
    ),
    woundPanel: /** @type {HTMLElement} */ ($("wound-panel")),
    stitchesSvg: /** @type {SVGSVGElement | null} */ (
      document.getElementById("wound-stitches-svg")
    ),
    stitchMarkers: /** @type {HTMLElement} */ ($("stitch-markers")),
    needle: /** @type {HTMLElement} */ ($("needle")),
    threadLine: /** @type {HTMLElement} */ ($("thread-line")),
    instructions: /** @type {HTMLElement} */ ($("suture-instructions")),
    placementHint: /** @type {HTMLElement | null} */ (
      document.getElementById("suture-precision-hint")
    ),
    stitchCounter: /** @type {HTMLElement} */ ($("stitch-counter")),
    mistakeFeedback: /** @type {HTMLElement} */ ($("mistake-feedback")),
    tensionSlider: /** @type {HTMLInputElement} */ ($("tension-slider")),
    tensionValue: /** @type {HTMLElement} */ ($("tension-value")),
    btnConfirmTension: /** @type {HTMLButtonElement} */ ($("btn-confirm-tension")),
    btnFinish: /** @type {HTMLButtonElement} */ ($("btn-finish-procedure")),
    finalReviewBanner: /** @type {HTMLElement | null} */ ($("final-review-banner")),
    tensionBlock: /** @type {HTMLElement | null} */ ($("tension-block")),
    suturingActions: /** @type {HTMLElement | null} */ ($("suturing-actions")),
  };

  btnStart.disabled = true;
  if (btnStart) btnStart.textContent = "Loading scene…";
  traineeInput?.focus();

  let world = null;
  let player = null;
  let patientIx = null;
  let suturing = null;
  /** @type {LayeredClosureUI | null} */
  let layeredClosure = null;
  /** @type {DamageControlLaparotomyUI | null} */
  let damageControl = null;
  let lastReport = null;
  /** @type {ReturnType<typeof createPlacementEditor> | null} */
  let placementEditor = null;
  /** @type {ReturnType<typeof createOperatingRoomHeartbeat> | null} */
  let orHeartbeat = null;
  /** @type {ReturnType<typeof createHeartMonitorHud> | null} */
  let heartMonitor = null;

  function resetPreOpTasks() {
    document.querySelectorAll(".pre-op-task").forEach((li) => {
      li.classList.remove("pre-op-task--done");
      const btn = li.querySelector(".pre-op-task-btn");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Mark complete";
      }
    });
    if (btnPreOpContinue) btnPreOpContinue.disabled = true;
  }

  function closePreOpOverlay() {
    preOpOverlay?.classList.add("hidden");
    preOpOverlay?.setAttribute("aria-hidden", "true");
    wardMenuBlocksInteract = false;
    if (gameState.state === GameState.EXPLORING && player) {
      player.setExplorationEnabled(true);
    }
    patientIx?.refreshProximityUi();
  }

  function openPreOpFromF() {
    resetPreOpTasks();
    preOpOverlay?.classList.remove("hidden");
    preOpOverlay?.setAttribute("aria-hidden", "false");
  }

  function openSurgeryChoiceFromPreOp() {
    preOpOverlay?.classList.add("hidden");
    preOpOverlay?.setAttribute("aria-hidden", "true");
    surgeryChoiceOverlay?.classList.remove("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "false");
  }

  try {
    const layoutJson = await fetchWorldLayout();
    if (layoutJson) mergeLayoutIntoConfig(WORLD_CONFIG, layoutJson);

    world = await createWorld(scene, canvas);
    heartMonitor = createHeartMonitorHud({
      getGameState: () => gameState,
    });
    orHeartbeat = createOperatingRoomHeartbeat({
      onBeat: () => heartMonitor?.pulse(),
    });
    player = new PlayerController(
      world.camera,
      canvas,
      WORLD_CONFIG.eyeHeight
    );
    player.setExplorationEnabled(false);

    placementEditor = createPlacementEditor({
      overlay: /** @type {HTMLElement} */ ($("placement-editor-overlay")),
      scene,
      canvas,
      getWorld: () => world,
      isExploring: () => gameState.state === GameState.EXPLORING,
      setExplorationEnabled: (on) => {
        if (player) player.setExplorationEnabled(on);
      },
    });

    patientIx = new PatientInteraction({
      getPlayerPosition: () => world.camera.position.clone(),
      getPatientPoint: () => getInteractionPromptWorldPoint(world.patientAnchor),
      interactDistance: WORLD_CONFIG.interactionRadius ?? 3.5,
      onProximityChange: (near) => {
        interactionPrompt?.classList.toggle("hidden", !near || wardMenuBlocksInteract);
        if (!near && interactionPrompt) {
          interactionPrompt.classList.remove("interaction-prompt--screen");
          interactionPrompt.style.left = "";
          interactionPrompt.style.top = "";
          interactionPrompt.style.visibility = "";
        }
      },
      isExploring: () => gameState.state === GameState.EXPLORING,
      canInteract: () => !wardMenuBlocksInteract,
      onStartSurgery: () => {
        if (gameState.state !== GameState.EXPLORING) return;
        wardMenuBlocksInteract = true;
        player.setExplorationEnabled(false);
        interactionPrompt?.classList.add("hidden");
        openPreOpFromF();
      },
    });

    preOpOverlay?.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (!t.classList.contains("pre-op-task-btn")) return;
      if (t.disabled) return;
      const li = t.closest(".pre-op-task");
      if (!li || li.classList.contains("pre-op-task--done")) return;
      li.classList.add("pre-op-task--done");
      t.disabled = true;
      t.textContent = "Done";
      if (
        btnPreOpContinue &&
        document.querySelectorAll(".pre-op-task--done").length === 3
      ) {
        btnPreOpContinue.disabled = false;
      }
    });

    btnPreOpContinue?.addEventListener("click", () => {
      if (document.querySelectorAll(".pre-op-task--done").length !== 3) {
        return;
      }
      openSurgeryChoiceFromPreOp();
    });

    suturing = new SuturingUI(suturingDom, (report) => {
      lastReport = report;
      orHeartbeat?.stop();
      suturing.hide();
      gameState.setState(GameState.RESULTS);
      coordDock?.classList.add("hidden");
      coordVisible = false;
      coordReader?.classList.add("hidden");
      showResults(resultsScreen);
      fillResults(report, gameState.traineeName, resultsTitle, resultsBody);
    });

    layeredClosure = new LayeredClosureUI(
      {
        overlay: /** @type {HTMLElement} */ ($("layered-procedure-overlay")),
        titleEl: /** @type {HTMLElement} */ ($("layered-procedure-title")),
        phaseEl: /** @type {HTMLElement} */ ($("layered-procedure-phase")),
        stepEl: /** @type {HTMLElement} */ ($("layered-procedure-step")),
        workspace: /** @type {HTMLElement} */ ($("layered-procedure-workspace")),
        feedback: /** @type {HTMLElement} */ ($("layered-procedure-feedback")),
        footer: /** @type {HTMLElement} */ ($("layered-procedure-footer")),
      },
      (report) => {
        lastReport = report;
        orHeartbeat?.stop();
        layeredClosure?.hide();
        gameState.setState(GameState.RESULTS);
        coordDock?.classList.add("hidden");
        coordVisible = false;
        coordReader?.classList.add("hidden");
        showResults(resultsScreen);
        fillResults(report, gameState.traineeName, resultsTitle, resultsBody);
      },
      wardReturnFromProcedure
    );

    damageControl = new DamageControlLaparotomyUI(
      {
        overlay: /** @type {HTMLElement} */ ($("damage-control-overlay")),
        titleEl: /** @type {HTMLElement} */ ($("damage-control-title")),
        phaseEl: /** @type {HTMLElement} */ ($("damage-control-phase")),
        stepEl: /** @type {HTMLElement} */ ($("damage-control-step")),
        workspace: /** @type {HTMLElement} */ ($("damage-control-workspace")),
        feedback: /** @type {HTMLElement} */ ($("damage-control-feedback")),
        footer: /** @type {HTMLElement} */ ($("damage-control-footer")),
      },
      (report) => {
        lastReport = report;
        orHeartbeat?.stop();
        damageControl?.hide();
        gameState.setState(GameState.RESULTS);
        coordDock?.classList.add("hidden");
        coordVisible = false;
        coordReader?.classList.add("hidden");
        showResults(resultsScreen);
        fillResults(report, gameState.traineeName, resultsTitle, resultsBody);
      },
      wardReturnFromProcedure
    );

  } catch (err) {
    console.error(err);
    alert(
      "Could not load 3D assets.\n\n" +
        "Put these files in assets/models/:\n" +
        "mainbuild.glb, doctor.glb, BodyHuman.glb\n\n" +
        "Use http://localhost (not file://). Check the browser console (F12) for errors."
    );
  } finally {
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.textContent = "Start";
    }
  }

  function startHeartbeatAndHud() {
    if (!orHeartbeat) {
      heartMonitor?.tick();
      return;
    }
    void orHeartbeat.resumeContext().then(() => {
      orHeartbeat.start();
      heartMonitor?.tick();
    });
  }

  if (orHeartbeat && canvas) {
    const unlockAudio = () => {
      void orHeartbeat.resumeContext();
    };
    canvas.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });
  }

  function closeSurgeryChoiceWardMenu() {
    surgeryChoiceOverlay?.classList.add("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "true");
    wardMenuBlocksInteract = false;
    resetPreOpTasks();
    if (gameState.state === GameState.EXPLORING && player) {
      player.setExplorationEnabled(true);
    }
    patientIx?.refreshProximityUi();
  }

  function wardReturnFromProcedure() {
    wardMenuBlocksInteract = false;
    gameState.setState(GameState.EXPLORING);
    player?.setExplorationEnabled(true);
    coordDock?.classList.remove("hidden");
    orHeartbeat?.stop();
    resetPreOpTasks();
    patientIx?.refreshProximityUi();
  }

  function startSuturingFromWardMenu() {
    if (!player || !suturing) return;
    if (gameState.state !== GameState.EXPLORING) return;
    surgeryChoiceOverlay?.classList.add("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "true");
    layeredProcedureOverlay?.classList.add("hidden");
    layeredProcedureOverlay?.setAttribute("aria-hidden", "true");
    damageControlOverlay?.classList.add("hidden");
    damageControlOverlay?.setAttribute("aria-hidden", "true");
    wardMenuBlocksInteract = false;
    gameState.setState(GameState.SURGERY);
    player.setExplorationEnabled(false);
    coordVisible = false;
    coordReader?.classList.add("hidden");
    coordDock?.classList.add("hidden");
    suturing.startSession(gameState.traineeName);
    startHeartbeatAndHud();
  }

  function startLayeredProcedureFromWardMenu() {
    if (!player || !layeredClosure) return;
    if (gameState.state !== GameState.EXPLORING) return;
    surgeryChoiceOverlay?.classList.add("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "true");
    damageControlOverlay?.classList.add("hidden");
    damageControlOverlay?.setAttribute("aria-hidden", "true");
    wardMenuBlocksInteract = false;
    gameState.setState(GameState.LAYERED_PROCEDURE);
    player.setExplorationEnabled(false);
    coordVisible = false;
    coordReader?.classList.add("hidden");
    coordDock?.classList.add("hidden");
    layeredClosure.startSession(gameState.traineeName);
    startHeartbeatAndHud();
  }

  function startDamageControlFromWardMenu() {
    if (!player || !damageControl) return;
    if (gameState.state !== GameState.EXPLORING) return;
    surgeryChoiceOverlay?.classList.add("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "true");
    layeredProcedureOverlay?.classList.add("hidden");
    layeredProcedureOverlay?.setAttribute("aria-hidden", "true");
    wardMenuBlocksInteract = false;
    gameState.setState(GameState.DAMAGE_CONTROL_LAPAROTOMY);
    player.setExplorationEnabled(false);
    coordVisible = false;
    coordReader?.classList.add("hidden");
    coordDock?.classList.add("hidden");
    damageControl.startSession(gameState.traineeName);
    startHeartbeatAndHud();
  }

  btnChoiceSuture?.addEventListener("click", () => startSuturingFromWardMenu());
  btnChoiceLayered?.addEventListener("click", () => startLayeredProcedureFromWardMenu());
  btnChoiceDamage?.addEventListener("click", () => startDamageControlFromWardMenu());

  function buildCoordClipboard() {
    if (!world) return "";
    const p = world.camera.position;
    const r = world.camera.rotation;
    const yawDeg = (r.y * 180) / Math.PI;
    const pa = world.patientAnchor.getAbsolutePosition();
    const ox = p.x - pa.x;
    const oz = p.z - pa.z;
    return [
      "— Surgical-Training simulator coordinates —",
      "",
      `camera: { x: ${p.x.toFixed(3)}, y: ${p.y.toFixed(3)}, z: ${p.z.toFixed(3)} }`,
      `camera.rotation.y (rad): ${r.y.toFixed(4)}  |  yaw (deg): ${yawDeg.toFixed(2)}`,
      `camera.rotation.x (rad): ${r.x.toFixed(4)}  |  pitch (deg): ${((r.x * 180) / Math.PI).toFixed(2)}`,
      "",
      `patientAnchor (world): { x: ${pa.x.toFixed(3)}, y: ${pa.y.toFixed(3)}, z: ${pa.z.toFixed(3)} }`,
      "",
      "For src/world.js — stand where you want spawn, then paste:",
      `spawnOffsetFromPatient: { x: ${ox.toFixed(3)}, z: ${oz.toFixed(3)} }`,
      "",
      "If the bed moved in the GLB, you can instead set patientPosition to the anchor above.",
    ].join("\n");
  }

  scene.registerBeforeRender(() => {
    heartMonitor?.tick();
    if (!world || gameState.state !== GameState.EXPLORING) return;
    const p = world.camera.position;
    const r = world.camera.rotation;
    const yawDeg = (r.y * 180) / Math.PI;
    const pitchDeg = (r.x * 180) / Math.PI;
    if (coordMini) {
      coordMini.textContent =
        `Position (world)\nx ${p.x.toFixed(3)}   y ${p.y.toFixed(3)}   z ${p.z.toFixed(3)}\n` +
        `Camera   yaw ${yawDeg.toFixed(1)}°   pitch ${pitchDeg.toFixed(1)}°`;
    }
    if (coordVisible) {
      const pa = world.patientAnchor.getAbsolutePosition();
      if (coordText) {
        coordText.textContent =
          `Full rotation (rad)\n` +
          `rot.x ${r.x.toFixed(4)}  rot.y ${r.y.toFixed(4)}  rot.z ${r.z.toFixed(4)}`;
      }
      if (coordPatient) {
        coordPatient.textContent =
          `Patient anchor (world)\nx ${pa.x.toFixed(3)}  y ${pa.y.toFixed(3)}  z ${pa.z.toFixed(3)}`;
      }
    }

    if (
      interactionPrompt &&
      !interactionPrompt.classList.contains("hidden")
    ) {
      const wp = getInteractionPromptWorldPoint(world.patientAnchor);
      const cam = world.camera;
      const toPoint = wp.subtract(cam.position);
      const forward = cam.getForwardRay().direction;
      const inFront = B.Vector3.Dot(toPoint, forward) > 0.05;
      if (inFront) {
        const eng = scene.getEngine();
        const projected = B.Vector3.Project(
          wp,
          B.Matrix.Identity(),
          scene.getTransformMatrix(),
          cam.viewport.toGlobal(eng.getRenderWidth(), eng.getRenderHeight())
        );
        interactionPrompt.classList.add("interaction-prompt--screen");
        interactionPrompt.style.left = projected.x + "px";
        interactionPrompt.style.top = projected.y + "px";
        interactionPrompt.style.visibility = "visible";
      } else {
        interactionPrompt.style.visibility = "hidden";
      }
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && placementEditor?.isOpen()) {
      e.preventDefault();
      placementEditor.close();
      return;
    }
    if (e.code === "Escape") {
      const preOpOpen =
        preOpOverlay && !preOpOverlay.classList.contains("hidden");
      if (preOpOpen && gameState.state === GameState.EXPLORING) {
        e.preventDefault();
        closePreOpOverlay();
        resetPreOpTasks();
        return;
      }
      const layeredOpen =
        layeredProcedureOverlay &&
        !layeredProcedureOverlay.classList.contains("hidden");
      const choiceOpen =
        surgeryChoiceOverlay &&
        !surgeryChoiceOverlay.classList.contains("hidden");
      const damageOpen =
        damageControlOverlay &&
        !damageControlOverlay.classList.contains("hidden");
      if (layeredOpen && gameState.state === GameState.LAYERED_PROCEDURE) {
        e.preventDefault();
        layeredClosure?.abort();
        return;
      }
      if (damageOpen && gameState.state === GameState.DAMAGE_CONTROL_LAPAROTOMY) {
        e.preventDefault();
        damageControl?.abort();
        return;
      }
      if (choiceOpen && gameState.state === GameState.EXPLORING) {
        e.preventDefault();
        closeSurgeryChoiceWardMenu();
        return;
      }
    }
    if (gameState.state !== GameState.EXPLORING) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }
    if (e.code === "KeyC" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      coordVisible = !coordVisible;
      coordReader?.classList.toggle("hidden", !coordVisible);
    }
    if (
      e.code === "KeyP" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      placementEditor
    ) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      e.preventDefault();
      placementEditor.toggle();
    }
  });

  coordCopy?.addEventListener("click", async () => {
    const text = buildCoordClipboard();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      coordCopy.textContent = "Copied";
      window.setTimeout(() => {
        coordCopy.textContent = "Copy layout";
      }, 1600);
    } catch {
      console.log(text);
      alert("Clipboard unavailable — copy from the browser console (F12).");
    }
  });

  engine.runRenderLoop(() => {
    patientIx?.tick();
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
    suturing?.onWindowResize();
    layeredClosure?.onWindowResize();
    damageControl?.onWindowResize();
  });

  function showStartUi() {
    orHeartbeat?.stop();
    preOpOverlay?.classList.add("hidden");
    preOpOverlay?.setAttribute("aria-hidden", "true");
    resetPreOpTasks();
    coordVisible = false;
    wardMenuBlocksInteract = false;
    surgeryChoiceOverlay?.classList.add("hidden");
    surgeryChoiceOverlay?.setAttribute("aria-hidden", "true");
    layeredProcedureOverlay?.classList.add("hidden");
    layeredProcedureOverlay?.setAttribute("aria-hidden", "true");
    damageControlOverlay?.classList.add("hidden");
    damageControlOverlay?.setAttribute("aria-hidden", "true");
    coordDock?.classList.add("hidden");
    coordReader?.classList.add("hidden");
    startScreen?.classList.remove("hidden");
    exploreHud?.classList.add("hidden");
    interactionPrompt?.classList.add("hidden");
    resultsScreen && hideResults(resultsScreen);
    suturing?.hide();
    layeredClosure?.hide();
    damageControl?.hide();
    document.body.classList.remove("explore-mode", "surgery-mode");
  }

  function beginExploration() {
    if (!world || !player) {
      alert(
        "The 3D scene did not load. Add the three .glb files to assets/models/ and refresh the page."
      );
      return;
    }
    const raw = traineeInput?.value || "";
    gameState.setTraineeName(raw);
    gameState.setState(GameState.EXPLORING);
    wardMenuBlocksInteract = false;
    startScreen?.classList.add("hidden");
    exploreHud?.classList.remove("hidden");
    if (hudName) hudName.textContent = "Trainee: " + gameState.traineeName;
    world.camera.position.copyFrom(getPlayerSpawnPosition(world.patientAnchor));
    applySpawnCameraRotation(world.camera);
    coordDock?.classList.remove("hidden");
    player.setExplorationEnabled(true);
    orHeartbeat?.stop();
  }

  btnStart?.addEventListener("click", () => beginExploration());
  traineeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") beginExploration();
  });

  btnReturn?.addEventListener("click", () => {
    if (!player || !world) return;
    hideResults(resultsScreen);
    gameState.setState(GameState.EXPLORING);
    coordDock?.classList.remove("hidden");
    player.setExplorationEnabled(true);
    orHeartbeat?.stop();
  });

  btnRestart?.addEventListener("click", () => {
    if (!player || !world) return;
    gameState.setTraineeName("");
    gameState.setState(GameState.START);
    if (traineeInput) traineeInput.value = "";
    showStartUi();
    world.camera.position.copyFrom(getPlayerSpawnPosition(world.patientAnchor));
    applySpawnCameraRotation(world.camera);
    player.setExplorationEnabled(false);
    traineeInput?.focus();
  });

  showStartUi();
}

main();
