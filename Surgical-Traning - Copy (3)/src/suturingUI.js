/**
 * 2D suturing: layered wound, persistent SVG sutures, progressive closure, final review before scoring.
 */

import {
  aggregateScores,
  buildFeedback,
  DEFAULT_PROCEDURE_NAME,
} from "./scoring.js";

/** @typedef {{ x: number, y: number }} NormPoint */

const SVG_NS = "http://www.w3.org/2000/svg";
const WOUND_GAP_START_PCT = 14;
const WOUND_GAP_END_PCT = 4;
const FINAL_REVIEW_MS = 2800;

/**
 * @typedef {object} StitchRecord
 * @property {number} index
 * @property {NormPoint | null} entry
 * @property {NormPoint | null} exit
 * @property {number} entryError
 * @property {number} exitError
 * @property {number} tension
 * @property {number} tensionScore
 * @property {number} symmetryScore
 * @property {number} spacingScore
 * @property {number} centerY
 * @property {number} [mistakesThisStitch]
 * @property {number} [bitePlaneScore]
 */

/**
 * @typedef {object} CompletedStitch
 * @property {number} index
 * @property {NormPoint} entry
 * @property {NormPoint} exit
 * @property {number} tension
 * @property {number} entryError
 * @property {number} exitError
 * @property {number} tensionScore
 * @property {number} symmetryScore
 * @property {number} spacingScore
 * @property {number} mistakesThisStitch
 * @property {boolean} valid
 * @property {number} centerY
 * @property {number} [bitePlaneScore]
 */

export class SuturingUI {
  /**
   * @param {object} dom
   * @param {HTMLElement} dom.overlay
   * @param {HTMLElement} dom.woundPanel
   * @param {SVGSVGElement | null} dom.stitchesSvg
   * @param {HTMLElement} dom.stitchMarkers
   * @param {HTMLElement} dom.needle
   * @param {HTMLElement} dom.threadLine
   * @param {HTMLElement} dom.instructions
   * @param {HTMLElement | null} [dom.placementHint]
   * @param {HTMLElement} dom.stitchCounter
   * @param {HTMLElement} dom.mistakeFeedback
   * @param {HTMLInputElement} dom.tensionSlider
   * @param {HTMLElement} dom.tensionValue
   * @param {HTMLButtonElement} dom.btnConfirmTension
   * @param {HTMLButtonElement} dom.btnFinish
   * @param {HTMLElement | null} [dom.finalReviewBanner]
   * @param {HTMLElement | null} [dom.tensionBlock]
   * @param {HTMLElement | null} [dom.suturingActions]
   * @param {HTMLElement | null} [dom.suturingShell]
   * @param {(report: object) => void} onComplete
   */
  constructor(dom, onComplete) {
    this.dom = dom;
    this.onComplete = onComplete;
    this._shell =
      dom.suturingShell ||
      (dom.overlay && dom.overlay.querySelector(".suturing-shell")) ||
      null;

    this.stitchCount = 8;
    /** Bites hug wound lips (vertical laceration — lateral dermal entry/exit). */
    this.entryIdealX = 0.235;
    this.exitIdealX = 0.765;
    /** Tighter click tolerance (norm units) — smaller = more precise placement. */
    this.hitRadius = 0.042;
    this.idealTension = 0.5;
    /** Narrower band around 50% scores best (see _tensionScoreFromValue). */
    this.idealTensionHalfWidth = 0.04;
    this.symmetryTolerance = 0.048;
    /** Max mean horizontal drift from planned lip X still “acceptable” for bite-plane score. */
    this.bitePlaneTolerance = 0.048;
    /** Reject entry/exit on wrong side of midline (dermal lips discipline). */
    this.entryHemisphereMaxX = 0.465;
    this.exitHemisphereMinX = 0.535;
    this.procedureName = DEFAULT_PROCEDURE_NAME;
    this.idealSecondsPerStitch = 11;

    this._phase = "IDLE";
    this._currentIndex = 0;
    this._plan = [];
    /** @type {StitchRecord[]} */
    this._records = [];
    /** @type {CompletedStitch[]} */
    this._completedStitches = [];
    this._orderErrors = 0;
    this._wrongClicks = 0;
    this._mistakesThisStitch = 0;
    this._sessionStart = 0;
    this._traineeName = "";
    this._mistakeTimer = 0;
    this._needleNorm = { x: 0.5, y: 0.5 };
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._finalReviewTimer = null;
    /** @type {object | null} */
    this._pendingReport = null;

    this._boundPanelClick = (e) => this._onPanelClick(e);
    this._boundMove = (e) => this._onPanelMove(e);
    this._boundTensionInput = () => this._onTensionInput();
    this._boundConfirm = () => this._confirmTension();
    this._boundFinish = () => this._finishProcedure();

    dom.woundPanel.addEventListener("click", this._boundPanelClick);
    dom.woundPanel.addEventListener("mousemove", this._boundMove);
    dom.tensionSlider.addEventListener("input", this._boundTensionInput);
    dom.btnConfirmTension.addEventListener("click", this._boundConfirm);
    dom.btnFinish.addEventListener("click", this._boundFinish);

    this._docKey = (e) => {
      if (this.dom.overlay.classList.contains("hidden")) return;
      if (this._phase !== "TENSION") return;
      if (
        e.code === "KeyN" ||
        e.key === "n" ||
        e.key === "N" ||
        e.code === "Enter"
      ) {
        e.preventDefault();
        this._confirmTension();
      }
    };
    window.addEventListener("keydown", this._docKey);
  }

  dispose() {
    this._clearFinalReviewTimer();
    const d = this.dom;
    d.woundPanel.removeEventListener("click", this._boundPanelClick);
    d.woundPanel.removeEventListener("mousemove", this._boundMove);
    d.tensionSlider.removeEventListener("input", this._boundTensionInput);
    d.btnConfirmTension.removeEventListener("click", this._boundConfirm);
    d.btnFinish.removeEventListener("click", this._boundFinish);
    window.removeEventListener("keydown", this._docKey);
  }

  _clearFinalReviewTimer() {
    if (this._finalReviewTimer) {
      clearTimeout(this._finalReviewTimer);
      this._finalReviewTimer = null;
    }
  }

  /**
   * @param {string} traineeName
   */
  startSession(traineeName) {
    this._clearFinalReviewTimer();
    this._traineeName = traineeName || "Trainee";
    this._sessionStart = performance.now() / 1000;
    this._phase = "ENTRY";
    this._currentIndex = 0;
    this._plan = [];
    this._records = [];
    this._completedStitches = [];
    this._orderErrors = 0;
    this._wrongClicks = 0;
    this._mistakesThisStitch = 0;
    this._pendingReport = null;

    this._buildPlan();
    if (this.dom.stitchesSvg) {
      this.dom.stitchesSvg.innerHTML = "";
      this._ensureSutureDefs(this.dom.stitchesSvg);
    }
    this._setWoundVisual(0);
    this._renderMarkers();

    this.dom.overlay.classList.remove("hidden");
    this.dom.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("surgery-mode");
    document.body.classList.remove("explore-mode");

    this.dom.woundPanel.style.pointerEvents = "";
    this.dom.btnFinish.disabled = true;
    this.dom.btnConfirmTension.disabled = true;
    this.dom.tensionSlider.value = "50";
    this._updateTensionReadout();
    this._clearMistakeSoon();

    if (this.dom.finalReviewBanner) {
      this.dom.finalReviewBanner.classList.add("hidden");
      this.dom.finalReviewBanner.textContent = "";
    }
    this._shell?.classList.remove("is-final-review");

    this._updateHUD();
    this._layoutActivePreview();
  }

  hide() {
    this._clearFinalReviewTimer();
    this._shell?.classList.remove("is-final-review");
    if (this.dom.woundPanel) this.dom.woundPanel.style.pointerEvents = "";
    this.dom.overlay.classList.add("hidden");
    this.dom.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("surgery-mode");
    this._phase = "IDLE";
  }

  onWindowResize() {
    this._layoutActivePreview();
  }

  /**
   * @param {number} completedCount
   */
  _setWoundVisual(completedCount) {
    const n = this._plan.length || 1;
    const t = Math.min(1, completedCount / n);
    const gap =
      WOUND_GAP_START_PCT - t * (WOUND_GAP_START_PCT - WOUND_GAP_END_PCT);
    const pull = Math.min(3, completedCount * 0.55);
    this.dom.woundPanel.style.setProperty(
      "--wound-gap-pct",
      String(Math.max(WOUND_GAP_END_PCT, gap))
    );
    this.dom.woundPanel.style.setProperty("--wound-edge-pull", String(pull));
  }

  /**
   * SVG filters + gradients for braided monofilament look.
   * @param {SVGSVGElement} svg
   */
  _ensureSutureDefs(svg) {
    if (svg.querySelector("defs[data-suture-defs]")) return;
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.setAttribute("data-suture-defs", "1");

    /** Matches `.thread-line` preview — pending + locked valid use the same silk. */
    const silk = document.createElementNS(SVG_NS, "linearGradient");
    silk.setAttribute("id", "sutureThreadSilk");
    silk.setAttribute("x1", "0%");
    silk.setAttribute("y1", "50%");
    silk.setAttribute("x2", "100%");
    silk.setAttribute("y2", "50%");
    [
      ["0%", "#c4b8a8"],
      ["18%", "#ebe4d8"],
      ["42%", "#fffdfa"],
      ["58%", "#f2ebe2"],
      ["78%", "#d8cfc3"],
      ["100%", "#a89e90"],
    ].forEach(([o, c]) => {
      const s = document.createElementNS(SVG_NS, "stop");
      s.setAttribute("offset", o);
      s.setAttribute("stop-color", c);
      silk.appendChild(s);
    });

    const gradInv = document.createElementNS(SVG_NS, "linearGradient");
    gradInv.setAttribute("id", "sutureThreadInvalid");
    gradInv.setAttribute("x1", "0%");
    gradInv.setAttribute("y1", "0%");
    gradInv.setAttribute("x2", "100%");
    gradInv.setAttribute("y2", "100%");
    [["0%", "#f0e0a8"], ["50%", "#d4af37"], ["100%", "#8a7028"]].forEach(([o, c]) => {
      const s = document.createElementNS(SVG_NS, "stop");
      s.setAttribute("offset", o);
      s.setAttribute("stop-color", c);
      gradInv.appendChild(s);
    });

    const filFiber = document.createElementNS(SVG_NS, "filter");
    filFiber.setAttribute("id", "sutureThreadFiber");
    filFiber.setAttribute("x", "-25%");
    filFiber.setAttribute("y", "-25%");
    filFiber.setAttribute("width", "150%");
    filFiber.setAttribute("height", "150%");
    const turb = document.createElementNS(SVG_NS, "feTurbulence");
    turb.setAttribute("type", "fractalNoise");
    turb.setAttribute("baseFrequency", "0.9");
    turb.setAttribute("numOctaves", "2");
    turb.setAttribute("seed", "17");
    turb.setAttribute("result", "noise");
    const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "noise");
    disp.setAttribute("scale", "0.32");
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");
    filFiber.appendChild(turb);
    filFiber.appendChild(disp);

    const fil = document.createElementNS(SVG_NS, "filter");
    fil.setAttribute("id", "sutureThreadSoft");
    fil.setAttribute("x", "-15%");
    fil.setAttribute("y", "-15%");
    fil.setAttribute("width", "130%");
    fil.setAttribute("height", "130%");
    const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
    blur.setAttribute("in", "SourceAlpha");
    blur.setAttribute("stdDeviation", "0.35");
    blur.setAttribute("result", "b");
    const off = document.createElementNS(SVG_NS, "feOffset");
    off.setAttribute("in", "b");
    off.setAttribute("dx", "0.12");
    off.setAttribute("dy", "0.22");
    off.setAttribute("result", "sh");
    const merge = document.createElementNS(SVG_NS, "feMerge");
    const n1 = document.createElementNS(SVG_NS, "feMergeNode");
    n1.setAttribute("in", "sh");
    const n2 = document.createElementNS(SVG_NS, "feMergeNode");
    n2.setAttribute("in", "SourceGraphic");
    merge.appendChild(n1);
    merge.appendChild(n2);
    fil.appendChild(blur);
    fil.appendChild(off);
    fil.appendChild(merge);

    defs.appendChild(silk);
    defs.appendChild(gradInv);
    defs.appendChild(filFiber);
    defs.appendChild(fil);
    svg.insertBefore(defs, svg.firstChild);
  }

  /**
   * Curved monofilament path (quadratic) — sag alternates per stitch for a natural row.
   */
  _quadraticSuturePath(x1, y1, x2, y2, stitchIndex) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const phase = stitchIndex % 4;
    /** Longer spans sag like real monofilament under gravity / tissue drag. */
    const spanScale = Math.min(1.85, 0.72 + len * 0.028);
    const sagMag = (1.35 + (stitchIndex % 3) * 0.32) * spanScale;
    const sign = phase === 0 || phase === 3 ? 1 : -1;
    const cx = mx + px * sagMag * sign;
    const cy = my + py * sagMag * sign;
    return `M ${x1.toFixed(3)} ${y1.toFixed(3)} Q ${cx.toFixed(3)} ${cy.toFixed(3)} ${x2.toFixed(3)} ${y2.toFixed(3)}`;
  }

  /**
   * Multi-layer silk path: matches live preview colours; pending === valid silk (only invalid differs).
   * @param {'pending' | 'valid' | 'invalid'} mode
   */
  _appendRealisticThreadAndKnots(g, x1, y1, x2, y2, stitchIndex, mode) {
    const d = this._quadraticSuturePath(x1, y1, x2, y2, stitchIndex);
    const isInvalid = mode === "invalid";
    const strokeUrl = isInvalid ? "url(#sutureThreadInvalid)" : "url(#sutureThreadSilk)";
    const shadowStroke = isInvalid ? "#3d2a18" : "#14110f";
    const underStroke = isInvalid ? "rgba(110,82,40,0.55)" : "rgba(35,30,26,0.5)";

    const pHalo = document.createElementNS(SVG_NS, "path");
    pHalo.setAttribute("d", d);
    pHalo.setAttribute("fill", "none");
    pHalo.setAttribute("stroke", shadowStroke);
    pHalo.setAttribute("stroke-width", "4.1");
    pHalo.setAttribute("stroke-linecap", "round");
    pHalo.setAttribute("stroke-linejoin", "round");
    pHalo.setAttribute("opacity", "0.22");
    pHalo.setAttribute("class", "stitch-path-halo");

    const pShadow = document.createElementNS(SVG_NS, "path");
    pShadow.setAttribute("d", d);
    pShadow.setAttribute("fill", "none");
    pShadow.setAttribute("stroke", shadowStroke);
    pShadow.setAttribute("stroke-width", "3.15");
    pShadow.setAttribute("stroke-linecap", "round");
    pShadow.setAttribute("stroke-linejoin", "round");
    pShadow.setAttribute("opacity", "0.38");
    pShadow.setAttribute("class", "stitch-path-shadow");

    const gUnder = document.createElementNS(SVG_NS, "g");
    gUnder.setAttribute("transform", "translate(0.14,0.2)");
    gUnder.setAttribute("class", "stitch-thread-under");
    const pUnder = document.createElementNS(SVG_NS, "path");
    pUnder.setAttribute("d", d);
    pUnder.setAttribute("fill", "none");
    pUnder.setAttribute("stroke", underStroke);
    pUnder.setAttribute("stroke-width", "2.25");
    pUnder.setAttribute("stroke-linecap", "round");
    pUnder.setAttribute("stroke-linejoin", "round");
    pUnder.setAttribute("opacity", "0.85");
    gUnder.appendChild(pUnder);

    const pBody = document.createElementNS(SVG_NS, "path");
    pBody.setAttribute("d", d);
    pBody.setAttribute("fill", "none");
    pBody.setAttribute("stroke", strokeUrl);
    pBody.setAttribute("stroke-width", "2.12");
    pBody.setAttribute("stroke-linecap", "round");
    pBody.setAttribute("stroke-linejoin", "round");
    pBody.setAttribute("filter", isInvalid ? "url(#sutureThreadSoft)" : "url(#sutureThreadFiber)");
    pBody.setAttribute("class", "stitch-path-body");

    const pCore = document.createElementNS(SVG_NS, "path");
    pCore.setAttribute("d", d);
    pCore.setAttribute("fill", "none");
    pCore.setAttribute(
      "stroke",
      isInvalid ? "rgba(90,70,30,0.45)" : "rgba(28,24,20,0.42)"
    );
    pCore.setAttribute("stroke-width", "0.42");
    pCore.setAttribute("stroke-linecap", "round");
    pCore.setAttribute("class", "stitch-path-core");

    const pSheen = document.createElementNS(SVG_NS, "path");
    pSheen.setAttribute("d", d);
    pSheen.setAttribute("fill", "none");
    pSheen.setAttribute("stroke", "rgba(255,255,255,0.22)");
    pSheen.setAttribute("stroke-width", "1.05");
    pSheen.setAttribute("stroke-linecap", "round");
    pSheen.setAttribute("stroke-dasharray", "0.35 1.15");
    pSheen.setAttribute("opacity", "0.9");
    pSheen.setAttribute("class", "stitch-path-sheen");

    const pGlint = document.createElementNS(SVG_NS, "path");
    pGlint.setAttribute("d", d);
    pGlint.setAttribute("fill", "none");
    pGlint.setAttribute("stroke", "rgba(255,255,255,0.62)");
    pGlint.setAttribute("stroke-width", "0.48");
    pGlint.setAttribute("stroke-linecap", "round");
    pGlint.setAttribute("opacity", "0.88");
    pGlint.setAttribute("class", "stitch-path-glint");

    const pBodySoft = document.createElementNS(SVG_NS, "path");
    pBodySoft.setAttribute("d", d);
    pBodySoft.setAttribute("fill", "none");
    pBodySoft.setAttribute("stroke", strokeUrl);
    pBodySoft.setAttribute("stroke-width", "2.12");
    pBodySoft.setAttribute("stroke-linecap", "round");
    pBodySoft.setAttribute("stroke-linejoin", "round");
    pBodySoft.setAttribute("filter", "url(#sutureThreadSoft)");
    pBodySoft.setAttribute("opacity", isInvalid ? "0.95" : "0.55");
    pBodySoft.setAttribute("class", "stitch-path-body-soft");

    g.appendChild(pHalo);
    g.appendChild(pShadow);
    g.appendChild(gUnder);
    g.appendChild(pBody);
    g.appendChild(pBodySoft);
    g.appendChild(pCore);
    g.appendChild(pSheen);
    g.appendChild(pGlint);

    this._appendSutureKnot(g, x1, y1, mode);
    this._appendSutureKnot(g, x2, y2, mode);
  }

  /**
   * Interrupted-throw profile at dermal bite (simulated square-knot bulk).
   * @param {'pending' | 'valid' | 'invalid'} mode
   */
  _appendSutureKnot(g, cx, cy, mode) {
    const kg = document.createElementNS(SVG_NS, "g");
    kg.setAttribute("class", "stitch-knot-group");
    const isInvalid = mode === "invalid";
    const fillCore = isInvalid ? "#d4b86a" : "#ece8df";
    const fillMid = isInvalid ? "#c9a85c" : "#ddd8cf";
    const strokeK = isInvalid ? "#5c4a20" : "#1a1816";

    const pad = document.createElementNS(SVG_NS, "ellipse");
    pad.setAttribute("cx", String(cx));
    pad.setAttribute("cy", String(cy));
    pad.setAttribute("rx", "3.35");
    pad.setAttribute("ry", "2.25");
    pad.setAttribute("fill", "rgba(0,0,0,0.2)");
    pad.setAttribute("transform", `rotate(-12 ${cx} ${cy})`);
    pad.setAttribute("class", "stitch-knot-pad");

    const bulk = document.createElementNS(SVG_NS, "ellipse");
    bulk.setAttribute("cx", String(cx));
    bulk.setAttribute("cy", String(cy));
    bulk.setAttribute("rx", "3.05");
    bulk.setAttribute("ry", "2.05");
    bulk.setAttribute("fill", fillMid);
    bulk.setAttribute("stroke", strokeK);
    bulk.setAttribute("stroke-width", "0.28");
    bulk.setAttribute("transform", `rotate(-8 ${cx} ${cy})`);

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("cx", String(cx));
    ring.setAttribute("cy", String(cy));
    ring.setAttribute("r", "2.65");
    ring.setAttribute("fill", fillCore);
    ring.setAttribute("stroke", strokeK);
    ring.setAttribute("stroke-width", "0.3");

    const throw1 = document.createElementNS(SVG_NS, "path");
    throw1.setAttribute(
      "d",
      `M ${cx - 2.85} ${cy - 0.35} C ${cx - 1.2} ${cy - 1.85} ${cx + 0.8} ${cy - 1.75} ${cx + 2.1} ${cy - 0.9}`
    );
    throw1.setAttribute("fill", "none");
    throw1.setAttribute("stroke", "rgba(32,28,22,0.62)");
    throw1.setAttribute("stroke-width", "0.42");
    throw1.setAttribute("stroke-linecap", "round");

    const throw2 = document.createElementNS(SVG_NS, "path");
    throw2.setAttribute(
      "d",
      `M ${cx + 2.5} ${cy + 0.2} C ${cx + 0.9} ${cy + 1.65} ${cx - 1.1} ${cy + 1.55} ${cx - 2.35} ${cy + 0.75}`
    );
    throw2.setAttribute("fill", "none");
    throw2.setAttribute("stroke", "rgba(48,42,36,0.5)");
    throw2.setAttribute("stroke-width", "0.38");
    throw2.setAttribute("stroke-linecap", "round");

    const throwCross = document.createElementNS(SVG_NS, "path");
    throwCross.setAttribute(
      "d",
      `M ${cx - 1.5} ${cy - 1.1} Q ${cx} ${cy} ${cx + 1.45} ${cy + 1.05}`
    );
    throwCross.setAttribute("fill", "none");
    throwCross.setAttribute("stroke", "rgba(22,20,18,0.45)");
    throwCross.setAttribute("stroke-width", "0.32");
    throwCross.setAttribute("stroke-linecap", "round");

    const hub = document.createElementNS(SVG_NS, "circle");
    hub.setAttribute("cx", String(cx));
    hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", "1.05");
    hub.setAttribute("fill", isInvalid ? "#d8c078" : "url(#sutureThreadSilk)");
    hub.setAttribute("opacity", isInvalid ? "0.9" : "0.88");
    hub.setAttribute("stroke", strokeK);
    hub.setAttribute("stroke-width", "0.22");

    const spec = document.createElementNS(SVG_NS, "ellipse");
    spec.setAttribute("cx", String(cx - 0.55));
    spec.setAttribute("cy", String(cy - 0.65));
    spec.setAttribute("rx", "0.85");
    spec.setAttribute("ry", "0.45");
    spec.setAttribute("fill", "rgba(255,255,255,0.4)");
    spec.setAttribute("transform", `rotate(-25 ${cx} ${cy})`);
    spec.setAttribute("class", "stitch-knot-spec");

    kg.appendChild(pad);
    kg.appendChild(bulk);
    kg.appendChild(ring);
    kg.appendChild(throw1);
    kg.appendChild(throw2);
    kg.appendChild(throwCross);
    kg.appendChild(hub);
    kg.appendChild(spec);
    g.appendChild(kg);
  }

  /**
   * @param {StitchRecord} rec
   */
  _computeBitePlaneScore(rec) {
    const pl = this._plan[rec.index];
    if (!pl || !rec.entry || !rec.exit) return 100;
    const hErr =
      (Math.abs(rec.entry.x - pl.entry.x) + Math.abs(rec.exit.x - pl.exit.x)) * 0.5;
    return Math.max(
      0,
      Math.min(100, 100 * (1 - hErr / Math.max(0.018, this.bitePlaneTolerance)))
    );
  }

  /**
   * @param {number} t 0–1 slider value
   */
  _tensionScoreFromValue(t) {
    const dt = Math.abs(t - this.idealTension);
    const w = Math.max(0.02, this.idealTensionHalfWidth);
    if (dt <= w) {
      return Math.max(0, Math.min(100, 100 * (1 - (dt / w) * 0.15)));
    }
    const over = dt - w;
    return Math.max(0, Math.min(100, 85 * (1 - over / 0.35)));
  }

  /**
   * @param {StitchRecord} rec
   */
  _isStitchValid(rec) {
    const acc =
      (Math.max(0, Math.min(100, 100 * (1 - rec.entryError / this.hitRadius))) +
        Math.max(0, Math.min(100, 100 * (1 - rec.exitError / this.hitRadius)))) *
      0.5;
    const plane = rec.bitePlaneScore != null ? rec.bitePlaneScore : 100;
    return (
      acc >= 70 &&
      plane >= 58 &&
      (rec.tensionScore || 0) >= 62 &&
      (rec.symmetryScore || 0) >= 60
    );
  }

  /**
   * Persist one completed suture in SVG (curved thread + knots). Never removed.
   * @param {CompletedStitch} cs
   */
  _renderPersistentStitch(cs) {
    const svg = this.dom.stitchesSvg;
    if (!svg) return;
    this._ensureSutureDefs(svg);

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "stitch-persistent stitch-thread-group stitch-thread-group--locked");
    g.dataset.stitchIndex = String(cs.index);

    const x1 = cs.entry.x * 100;
    const y1 = (1 - cs.entry.y) * 100;
    const x2 = cs.exit.x * 100;
    const y2 = (1 - cs.exit.y) * 100;

    this._appendRealisticThreadAndKnots(
      g,
      x1,
      y1,
      x2,
      y2,
      cs.index,
      cs.valid ? "valid" : "invalid"
    );

    svg.appendChild(g);
  }

  /**
   * Lock thread in SVG as soon as exit bite is placed (before tension step).
   * Replaced by _renderPersistentStitch after confirm.
   * @param {StitchRecord} rec
   */
  _renderPendingStitchLine(rec) {
    const svg = this.dom.stitchesSvg;
    if (!svg || !rec.entry || !rec.exit) return;
    this._ensureSutureDefs(svg);
    this._removePendingStitch(rec.index);

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "stitch-pending stitch-thread-group stitch-thread-group--locked");
    g.dataset.stitchIndex = String(rec.index);

    const x1 = rec.entry.x * 100;
    const y1 = (1 - rec.entry.y) * 100;
    const x2 = rec.exit.x * 100;
    const y2 = (1 - rec.exit.y) * 100;

    this._appendRealisticThreadAndKnots(g, x1, y1, x2, y2, rec.index, "pending");

    svg.appendChild(g);
  }

  /**
   * @param {number} index
   */
  _removePendingStitch(index) {
    const svg = this.dom.stitchesSvg;
    if (!svg) return;
    svg.querySelector(`g.stitch-pending[data-stitch-index="${index}"]`)?.remove();
  }

  _buildPlan() {
    const n = Math.max(1, Math.floor(this.stitchCount));
    this._plan = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      this._plan.push({
        index: i,
        entry: { x: this.entryIdealX, y: t },
        exit: { x: this.exitIdealX, y: t },
      });
    }
  }

  _renderMarkers() {
    const host = this.dom.stitchMarkers;
    host.innerHTML = "";

    for (let i = 0; i < this._plan.length; i++) {
      const pl = this._plan[i];
      ["entry", "exit"].forEach((side) => {
        const p = pl[side];
        const dot = document.createElement("div");
        dot.className = "stitch-dot pending";
        dot.dataset.index = String(i);
        dot.dataset.side = side === "entry" ? "L" : "R";
        dot.style.left = `${p.x * 100}%`;
        dot.style.top = `${(1 - p.y) * 100}%`;
        host.appendChild(dot);
      });
    }
    this._syncMarkerStyles();
  }

  _syncMarkerStyles() {
    const dots = this.dom.stitchMarkers.querySelectorAll(".stitch-dot");
    dots.forEach((dot) => {
      const idx = Number(dot.dataset.index);
      const side = dot.dataset.side;
      dot.classList.remove("pending", "active", "done");
      const done = idx < this._currentIndex;
      const cur = idx === this._currentIndex;
      const activeSide =
        this._phase === "ENTRY" ? "L" : this._phase === "EXIT" ? "R" : null;
      const tensionPair = cur && this._phase === "TENSION";
      if (done) dot.classList.add("done");
      else if (tensionPair) dot.classList.add("active");
      else if (cur && activeSide === side) dot.classList.add("active");
      else dot.classList.add("pending");
    });
  }

  /**
   * @param {MouseEvent} e
   */
  _normFromEvent(e) {
    const el = this.dom.woundPanel;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = 1 - (e.clientY - r.top) / r.height;
    return {
      x: Math.max(0, Math.min(1, nx)),
      y: Math.max(0, Math.min(1, ny)),
    };
  }

  /**
   * @param {MouseEvent} e
   */
  _onPanelMove(e) {
    if (this._phase !== "ENTRY" && this._phase !== "EXIT") return;
    this._needleNorm = this._normFromEvent(e);
    this._layoutActivePreview();
    this._syncPlacementHint();
  }

  /**
   * @param {MouseEvent} e
   */
  _onPanelClick(e) {
    if (this._phase !== "ENTRY" && this._phase !== "EXIT") return;
    const p = this._normFromEvent(e);
    this._tryStitchClick(p);
  }

  /**
   * @param {NormPoint} a
   * @param {NormPoint} b
   */
  _dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * @param {NormPoint} p
   */
  _clickHitsWrongHole(p) {
    const cur = this._currentIndex;
    for (let j = 0; j < this._plan.length; j++) {
      if (j === cur) continue;
      const hole =
        this._phase === "ENTRY" ? this._plan[j].entry : this._plan[j].exit;
      if (this._dist(p, hole) <= this.hitRadius) return true;
    }
    return false;
  }

  /**
   * @param {NormPoint} p
   */
  _tryStitchClick(p) {
    const ideal =
      this._phase === "ENTRY"
        ? this._plan[this._currentIndex].entry
        : this._plan[this._currentIndex].exit;
    const d = this._dist(p, ideal);

    if (d <= this.hitRadius) {
      if (this._phase === "ENTRY" && p.x >= this.entryHemisphereMaxX) {
        this._wrongClicks += 1;
        this._mistakesThisStitch += 1;
        this._showMistake(
          "Entry bite must stay on the left dermal lip — keep left of the wound axis (green zone).",
          2800
        );
        this._syncMarkerStyles();
        this._updateHUD();
        this._layoutActivePreview();
        return;
      }
      if (this._phase === "EXIT" && p.x <= this.exitHemisphereMinX) {
        this._wrongClicks += 1;
        this._mistakesThisStitch += 1;
        this._showMistake(
          "Exit bite must be on the right lip — do not cross back to the left field.",
          2800
        );
        this._syncMarkerStyles();
        this._updateHUD();
        this._layoutActivePreview();
        return;
      }

      let rec = this._records[this._currentIndex];
      if (!rec) {
        rec = {
          index: this._currentIndex,
          entry: null,
          exit: null,
          entryError: 0,
          exitError: 0,
          tension: 0.5,
          tensionScore: 0,
          symmetryScore: 0,
          spacingScore: 100,
          centerY: 0,
        };
        this._records[this._currentIndex] = rec;
      }
      if (this._phase === "ENTRY") {
        rec.entry = p;
        rec.entryError = d;
        this._phase = "EXIT";
      } else {
        rec.exit = p;
        rec.exitError = d;
        rec.centerY = (p.y + /** @type {NormPoint} */ (rec.entry).y) * 0.5;
        rec.symmetryScore = this._symmetryFor(rec);
        if (this._currentIndex > 0) {
          const prev = this._records[this._currentIndex - 1];
          if (prev && prev.entry && prev.exit) {
            const prevCy = (prev.entry.y + prev.exit.y) * 0.5;
            rec.spacingScore = this._spacingStep(prevCy, rec.centerY);
          }
        }
        this._phase = "TENSION";
        this._renderPendingStitchLine(rec);
        this.dom.tensionSlider.value = "50";
        this._updateTensionReadout();
        this.dom.btnConfirmTension.disabled = false;
      }
    } else if (this._clickHitsWrongHole(p)) {
      this._orderErrors += 1;
      this._wrongClicks += 1;
      this._mistakesThisStitch += 1;
      this._showMistake("Wrong stitch order — use the highlighted target.", 2500);
    } else {
      this._wrongClicks += 1;
      this._mistakesThisStitch += 1;
      this._showMistake("Miss — click closer to the active target.", 2000);
    }
    this._syncMarkerStyles();
    this._updateHUD();
    this._layoutActivePreview();
  }

  _syncPlacementHint() {
    const el = this.dom.placementHint;
    if (!el) return;
    if (this._phase !== "ENTRY" && this._phase !== "EXIT") {
      el.textContent = "";
      return;
    }
    if (!this._plan.length || this._currentIndex >= this._plan.length) {
      el.textContent = "";
      return;
    }
    const ideal =
      this._phase === "ENTRY"
        ? this._plan[this._currentIndex].entry
        : this._plan[this._currentIndex].exit;
    const d = this._dist(this._needleNorm, ideal);
    const r = this.hitRadius;
    let msg;
    if (d <= r * 0.28) msg = "Excellent — centred on the planned bite.";
    else if (d <= r * 0.52) msg = "Good — minor refinement possible.";
    else if (d <= r * 0.88) msg = "Marginal — align with the orange target before clicking.";
    else msg = "Outside tolerance ring — move toward the active target.";
    el.textContent = msg;
  }

  /**
   * @param {StitchRecord} rec
   */
  _symmetryFor(rec) {
    const idealEntry = this._plan[rec.index].entry;
    const idealExit = this._plan[rec.index].exit;
    const dl = Math.abs(rec.entry.y - idealEntry.y);
    const dr = Math.abs(rec.exit.y - idealExit.y);
    const bal = Math.abs(dl - dr);
    return Math.max(0, Math.min(100, 100 * (1 - bal / this.symmetryTolerance)));
  }

  /**
   * @param {number} prevCenterY
   * @param {number} curCenterY
   */
  _spacingStep(prevCenterY, curCenterY) {
    const n = this._plan.length;
    const idealStep = 1 / (n + 1);
    const gap = Math.abs(curCenterY - prevCenterY);
    const err = Math.abs(gap - idealStep);
    return Math.max(0, Math.min(100, 100 * (1 - err / idealStep)));
  }

  _onTensionInput() {
    this._updateTensionReadout();
  }

  _updateTensionReadout() {
    const v = Number(this.dom.tensionSlider.value) / 100;
    this.dom.tensionValue.textContent = String(Math.round(v * 100));
  }

  _confirmTension() {
    if (this._phase !== "TENSION") return;
    const rec = this._records[this._currentIndex];
    if (!rec || !rec.entry || !rec.exit) return;

    const t = Number(this.dom.tensionSlider.value) / 100;
    rec.tension = t;
    rec.tensionScore = this._tensionScoreFromValue(t);
    rec.bitePlaneScore = this._computeBitePlaneScore(rec);
    rec.mistakesThisStitch = this._mistakesThisStitch;

    const valid = this._isStitchValid(rec);

    /** @type {CompletedStitch} */
    const completed = {
      index: rec.index,
      entry: { x: rec.entry.x, y: rec.entry.y },
      exit: { x: rec.exit.x, y: rec.exit.y },
      tension: t,
      entryError: rec.entryError,
      exitError: rec.exitError,
      tensionScore: rec.tensionScore,
      symmetryScore: rec.symmetryScore,
      spacingScore: rec.spacingScore,
      mistakesThisStitch: this._mistakesThisStitch,
      valid,
      centerY: rec.centerY,
      bitePlaneScore: rec.bitePlaneScore,
    };
    this._completedStitches.push(completed);
    this._removePendingStitch(this._currentIndex);
    this._renderPersistentStitch(completed);
    this._setWoundVisual(this._completedStitches.length);

    this._mistakesThisStitch = 0;
    this._currentIndex += 1;
    this.dom.btnConfirmTension.disabled = true;

    if (this._currentIndex >= this._plan.length) {
      this._phase = "AWAIT_FINISH";
      this.dom.btnFinish.disabled = false;
      this._showMistake(
        "All sutures placed. Review the wound, then tap Finish procedure.",
        5000
      );
    } else {
      this._phase = "ENTRY";
    }
    this._syncMarkerStyles();
    this._updateHUD();
    this._layoutActivePreview();
  }

  _finishProcedure() {
    if (this._phase !== "AWAIT_FINISH") return;
    const t1 = performance.now() / 1000;
    const totalTime = t1 - this._sessionStart;

    const agg = aggregateScores({
      records: this._records,
      hitRadius: this.hitRadius,
      planCount: this._plan.length,
      totalTimeSec: totalTime,
      orderErrors: this._orderErrors,
      wrongClicks: this._wrongClicks,
      idealSecondsPerStitch: this.idealSecondsPerStitch,
    });

    const report = {
      traineeName: this._traineeName,
      procedureName: this.procedureName,
      stitchCount: this._plan.length,
      stitchesCompleted: this._plan.length,
      correctStitches: agg.correctStitches,
      incorrectStitches: agg.incorrectStitches,
      accuracyScore: agg.accuracyScore,
      stitchSpacingScore: agg.stitchSpacingScore,
      symmetryScore: agg.symmetryScore,
      tensionScore: agg.tensionScore,
      orderScore: agg.orderScore,
      timeScore: agg.timeScore,
      mistakeCount: agg.mistakeCount,
      totalTimeSec: Math.round(totalTime * 10) / 10,
      finalScore: agg.finalScore,
      feedback: buildFeedback(agg),
      weightsNote: agg.weightsNote,
      details: {
        orderErrors: this._orderErrors,
        wrongClicks: this._wrongClicks,
        stitches: this._records,
        completedStitches: this._completedStitches,
      },
    };

    this._pendingReport = report;
    this._phase = "FINAL_REVIEW";
    this.dom.btnFinish.disabled = true;
    this._shell?.classList.add("is-final-review");
    this.dom.woundPanel.style.pointerEvents = "none";

    if (this.dom.finalReviewBanner) {
      this.dom.finalReviewBanner.textContent =
        "Wound closed — all sutures are in place. Review the result…";
      this.dom.finalReviewBanner.classList.remove("hidden");
    }

    this._updateHUD();
    this._layoutActivePreview();

    this._finalReviewTimer = window.setTimeout(() => {
      this._finalReviewTimer = null;
      this._phase = "DONE";
      if (this.dom.finalReviewBanner) {
        this.dom.finalReviewBanner.classList.add("hidden");
      }
      this._shell?.classList.remove("is-final-review");
      this.onComplete(this._pendingReport);
      this._pendingReport = null;
    }, FINAL_REVIEW_MS);
  }

  /**
   * @param {string} msg
   * @param {number} ms
   */
  _showMistake(msg, ms) {
    this.dom.mistakeFeedback.textContent = msg;
    if (this._mistakeTimer) clearTimeout(this._mistakeTimer);
    this._mistakeTimer = window.setTimeout(() => {
      this.dom.mistakeFeedback.textContent = "";
      this._mistakeTimer = 0;
    }, ms);
  }

  _clearMistakeSoon() {
    if (this._mistakeTimer) clearTimeout(this._mistakeTimer);
    this.dom.mistakeFeedback.textContent = "";
  }

  /** Active preview only (current stitch). Completed sutures live in SVG. */
  _layoutActivePreview() {
    const wound = this.dom.woundPanel;
    const needle = this.dom.needle;
    const thread = this.dom.threadLine;
    if (!this._plan.length) return;

    if (
      this._phase === "FINAL_REVIEW" ||
      this._phase === "DONE" ||
      this._phase === "AWAIT_FINISH"
    ) {
      needle.style.opacity = "0";
      thread.style.width = "0";
      return;
    }
    needle.style.opacity = "1";

    const rec = this._records[this._currentIndex];
    const idealE = this._plan[this._currentIndex].entry;

    let needleN = this._needleNorm;
    if (this._phase === "ENTRY") {
      needleN = this._needleNorm;
    } else if (this._phase === "EXIT" && rec && rec.entry) {
      needleN = this._needleNorm;
    } else if (this._phase === "TENSION" && rec && rec.entry && rec.exit) {
      needleN = rec.exit;
    }

    needle.style.left = `${needleN.x * 100}%`;
    needle.style.top = `${(1 - needleN.y) * 100}%`;

    const w = wound.clientWidth || 1;
    const h = wound.clientHeight || 1;

    let needleDeg = 0;
    if (this._phase === "ENTRY") {
      const ixe = idealE.x * w;
      const iye = (1 - idealE.y) * h;
      const nxe = needleN.x * w;
      const nye = (1 - needleN.y) * h;
      needleDeg = (Math.atan2(nye - iye, nxe - ixe) * 180) / Math.PI;
    } else if (this._phase === "EXIT" && rec && rec.entry) {
      const ixa = rec.entry.x * w;
      const iya = (1 - rec.entry.y) * h;
      const nxe = needleN.x * w;
      const nye = (1 - needleN.y) * h;
      needleDeg = (Math.atan2(nye - iya, nxe - ixa) * 180) / Math.PI;
    } else if (this._phase === "TENSION" && rec && rec.entry && rec.exit) {
      const xA = rec.entry.x * w;
      const yA = (1 - rec.entry.y) * h;
      const xB = rec.exit.x * w;
      const yB = (1 - rec.exit.y) * h;
      needleDeg = (Math.atan2(yB - yA, xB - xA) * 180) / Math.PI;
    }
    needle.style.transform = `translate(-50%, -50%) rotate(${needleDeg}deg)`;

    /* During tension the thread lives in SVG (stitch-pending); hide DOM preview line */
    if (this._phase === "TENSION" && rec && rec.entry && rec.exit) {
      thread.style.width = "0";
      return;
    }

    let ax = idealE.x;
    let ay = idealE.y;
    let bx = needleN.x;
    let by = needleN.y;

    if (this._phase === "ENTRY" || !rec || !rec.entry) {
      thread.style.width = "0";
      return;
    }

    if (this._phase === "EXIT") {
      ax = rec.entry.x;
      ay = rec.entry.y;
    }
    const x0 = ax * w;
    const y0 = (1 - ay) * h;
    const x1 = bx * w;
    const y1 = (1 - by) * h;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenPx = Math.sqrt(dx * dx + dy * dy) || 1;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

    thread.style.left = `${x0}px`;
    thread.style.top = `${y0}px`;
    thread.style.width = `${lenPx}px`;
    thread.style.transformOrigin = "0 50%";
    thread.style.transform = "translate(0, -50%) rotate(" + ang + "deg)";
    thread.style.opacity = lenPx < 6 ? "0" : "0.92";
  }

  _updateHUD() {
    const n = this._plan.length;
    const i = this._currentIndex + 1;
    const inst = this.dom.instructions;
    const ctr = this.dom.stitchCounter;

    if (ctr) ctr.textContent = n ? `Stitch ${Math.min(i, n)} / ${n}` : "Stitch — / —";

    if (this._phase === "ENTRY") {
      inst.textContent =
        "Interrupted dermal closure: place the entry bite on the left lip, perpendicular to the laceration — tight tolerance; follow the precision line below.";
    } else if (this._phase === "EXIT") {
      inst.textContent =
        "Exit on the right lip at the paired level — suture bridges the defect; thread tracks the needle axis.";
    } else if (this._phase === "TENSION") {
      inst.textContent =
        "Evert the skin edges with tension in the 48–52% band, then N / Enter to seat the knot (simulates instrument tie).";
    } else if (this._phase === "AWAIT_FINISH") {
      inst.textContent =
        "All stitches are locked. The gap has closed. Tap Finish to review, then evaluation.";
    } else if (this._phase === "FINAL_REVIEW") {
      inst.textContent = "Final wound appearance — evaluation follows in a moment…";
    } else if (this._phase === "DONE") {
      inst.textContent = "Opening evaluation…";
    } else {
      inst.textContent = "";
    }
    this._syncPlacementHint();
  }
}
