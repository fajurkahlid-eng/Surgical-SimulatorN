/**
 * Twelve-phase damage-control laparotomy: safety → FAST → exposure → haemostasis
 * → viscus rules-out → packing → Pringle window → TAC + mesh gap → NPWT triad
 * → second-look ladder → delayed fascial run → sign-out.
 */

export const DAMAGE_CONTROL_PROCEDURE_NAME =
  "Damage control laparotomy — staged abdominal closure (full sequence)";

const PHASE_COUNT = 12;

/** Six-pack pattern: peripheral gutters + midline gutters (4×3 grid, indices 0–11). */
const CORRECT_PACK_INDICES = new Set([0, 3, 4, 7, 8, 11]);

/**
 * @typedef {object} DamageDom
 * @property {HTMLElement} overlay
 * @property {HTMLElement} titleEl
 * @property {HTMLElement} phaseEl
 * @property {HTMLElement} stepEl
 * @property {HTMLElement} workspace
 * @property {HTMLElement} feedback
 * @property {HTMLElement} footer
 */

export class DamageControlLaparotomyUI {
  /**
   * @param {DamageDom} dom
   * @param {(report: object) => void} onComplete
   * @param {() => void} [onAbandon]
   */
  constructor(dom, onComplete, onAbandon) {
    this.dom = dom;
    this.onComplete = onComplete;
    this.onAbandon = onAbandon || (() => {});
    this._phase = 0;
    this._traineeName = "";
    this._t0 = 0;
    this._mistakes = 0;
    this._checklistStep = 0;
    this._fastStep = 0;
    this._quadOrder = 0;
    this._bleederOrder = 0;
    this._viscusStep = 0;
    /** @type {Set<number>} */
    this._packPick = new Set();
    this._pringleConcern = 28;
    this._pringleMinutes = 15;
    this._tacTension = 54;
    this._meshGapMm = 14;
    this._npwt = -85;
    this._instillMlHr = 410;
    this._relookStep = 0;
    this._fascialStep = 0;
    this._signoutStep = 0;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._reviewTimer = null;

    this._quadLabels = ["RUQ", "LUQ", "RLQ", "LLQ"];

    this._checklistLabels = [
      "1. Time-out + site marking verified",
      "2. Broad-spectrum antibiotics + MTP pathway armed",
      "3. Massive transfusion protocol — cooler / runner assigned",
      "4. Fluid warmer + cell-saver / scavenger ready",
      "5. VTE chemoprophylaxis deferred — indication documented",
      "6. ICU / anaesthesia / blood bank loop closed",
    ];

    this._fastLabels = [
      "Subxiphoid (pericardial)",
      "RUQ Morrison’s pouch",
      "LUQ splenorenal recess",
      "Suprapubic pouch",
      "RLQ distal gutter",
      "LLQ distal gutter",
    ];

    this._viscusLabels = [
      "Stomach / lesser sac / short gastric axis",
      "First & second portion duodenum (kocher-ready)",
      "Small bowel — full evisceration run",
      "Colon frame — caecum to splenic flexure",
      "Retroperitoneum zones I–III / pelvic floor",
    ];

    this._relookLabels = [
      "6 h — ICU haemodynamic / lactate clearance check",
      "12 h — bedside / limited second look if indicated",
      "24–36 h — planned OR re-exploration window",
      "48–72 h — source control audit + definitive plan",
    ];

    this._signoutLabels = [
      "Sponge / instrument counts reconciled",
      "Drains ×3 labelled + suction set-points written",
      "ICU handoff: pending studies + blood products",
      "Family update delegated + primary team paged",
      "Operative note + critical event time-stamp started",
    ];

    this._boundFooter = (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.id === "dc-btn-phase") this._advancePhase();
      if (t.id === "dc-btn-abandon") this.abort();
    };
    this.dom.footer.addEventListener("click", this._boundFooter);
  }

  dispose() {
    this._clearReview();
    this.dom.footer.removeEventListener("click", this._boundFooter);
  }

  _clearReview() {
    if (this._reviewTimer) {
      clearTimeout(this._reviewTimer);
      this._reviewTimer = null;
    }
  }

  startSession(traineeName) {
    this._clearReview();
    this._traineeName = traineeName || "Trainee";
    this._t0 = performance.now() / 1000;
    this._mistakes = 0;
    this._phase = 0;
    this._checklistStep = 0;
    this._fastStep = 0;
    this._quadOrder = 0;
    this._bleederOrder = 0;
    this._viscusStep = 0;
    this._packPick = new Set();
    this._pringleConcern = 28;
    this._pringleMinutes = 15;
    this._tacTension = 54;
    this._meshGapMm = 14;
    this._npwt = -85;
    this._instillMlHr = 410;
    this._relookStep = 0;
    this._fascialStep = 0;
    this._signoutStep = 0;

    this.dom.titleEl.textContent = DAMAGE_CONTROL_PROCEDURE_NAME;
    this.dom.overlay.classList.remove("hidden");
    this.dom.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("surgery-mode");
    document.body.classList.remove("explore-mode");
    this._renderPhase();
  }

  hide() {
    this._clearReview();
    this.dom.workspace.innerHTML = "";
    this.dom.feedback.textContent = "";
    this.dom.footer.innerHTML = "";
    this.dom.overlay.classList.add("hidden");
    this.dom.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("surgery-mode");
  }

  abort() {
    this.hide();
    this.onAbandon();
  }

  _setFeedback(msg, err) {
    this.dom.feedback.textContent = msg;
    this.dom.feedback.style.color = err
      ? "var(--danger, #f85149)"
      : "var(--muted, #8b949e)";
  }

  _renderPhase() {
    this.dom.workspace.innerHTML = "";
    this.dom.feedback.textContent = "";
    this.dom.phaseEl.textContent = `Phase ${this._phase + 1} of ${PHASE_COUNT}`;
    this.dom.stepEl.textContent = "";

    const r = [
      this._renderChecklist,
      this._renderFast,
      this._renderQuadrants,
      this._renderBleeders,
      this._renderViscus,
      this._renderPacking,
      this._renderPringle,
      this._renderTacMesh,
      this._renderNpwtInstill,
      this._renderRelook,
      this._renderFascial,
      this._renderSignout,
    ];
    if (this._phase < PHASE_COUNT) {
      r[this._phase].call(this);
      this._renderFooter();
    } else {
      this._finish();
    }
  }

  _footerLabels() {
    return [
      "Checklist complete — proceed",
      "FAST sequence logged",
      "Laparotomy survey complete",
      "Source control phase complete",
      "Hollow viscus / retroperitoneal sweep done",
      "Pack map verified",
      "Inflow control window documented",
      "TAC + mesh gap accepted",
      "NPWT + instillation accepted",
      "Second-look ladder documented",
      "Fascial run complete",
      "Sign-out complete",
    ];
  }

  _renderFooter() {
    if (this._phase >= PHASE_COUNT) return;
    const label = this._footerLabels()[this._phase] || "Continue";
    this.dom.footer.innerHTML = `
      <div class="layered-footer-row">
        <button type="button" id="dc-btn-phase" class="primary" disabled>${label}</button>
        <button type="button" id="dc-btn-abandon" class="secondary">Abandon procedure</button>
      </div>
      <p class="muted small layered-esc-hint">Full damage-control sequence — <kbd>ESC</kbd> abandons without score.</p>
    `;
    this._syncFooterBtn();
  }

  _packOk() {
    if (this._packPick.size !== 6) return false;
    return [...CORRECT_PACK_INDICES].every((i) => this._packPick.has(i));
  }

  _syncFooterBtn() {
    const btn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById("dc-btn-phase")
    );
    if (!btn) return;
    switch (this._phase) {
      case 0:
        btn.disabled = this._checklistStep < 6;
        break;
      case 1:
        btn.disabled = this._fastStep < 6;
        break;
      case 2:
        btn.disabled = this._quadOrder < 4;
        break;
      case 3:
        btn.disabled = this._bleederOrder < 10;
        break;
      case 4:
        btn.disabled = this._viscusStep < 5;
        break;
      case 5:
        btn.disabled = !this._packOk();
        break;
      case 6:
        btn.disabled =
          this._pringleConcern < 24 ||
          this._pringleConcern > 30 ||
          this._pringleMinutes < 12 ||
          this._pringleMinutes > 18;
        break;
      case 7:
        btn.disabled =
          this._tacTension < 52 ||
          this._tacTension > 56 ||
          this._meshGapMm < 12 ||
          this._meshGapMm > 16;
        break;
      case 8:
        btn.disabled =
          this._npwt < -86 ||
          this._npwt > -84 ||
          this._instillMlHr < 395 ||
          this._instillMlHr > 425;
        break;
      case 9:
        btn.disabled = this._relookStep < 4;
        break;
      case 10:
        btn.disabled = this._fascialStep < 14;
        break;
      case 11:
        btn.disabled = this._signoutStep < 5;
        break;
      default:
        btn.disabled = true;
    }
  }

  _advancePhase() {
    const btn = document.getElementById("dc-btn-phase");
    if (btn && /** @type {HTMLButtonElement} */ (btn).disabled) return;
    if (this._phase === 5 && !this._packOk()) {
      this._mistakes += 3;
      this._setFeedback(
        "Pack geometry wrong: six cells — outer gutters (columns 1 & 4) plus midline gutters row 2.",
        true
      );
      return;
    }
    this._phase += 1;
    this._renderPhase();
  }

  _renderChecklist() {
    this.dom.stepEl.textContent =
      "Pre-incision safety — walk the OR bay in order: tap each station as you would verify it in theatre.";
    this._checklistStep = 0;
    const stations = [
      { l: 10, t: 20, title: "Time-out", sub: "Site marking", full: this._checklistLabels[0] },
      { l: 40, t: 12, title: "Antibiotics", sub: "MTP armed", full: this._checklistLabels[1] },
      { l: 72, t: 20, title: "MTP", sub: "Cooler / runner", full: this._checklistLabels[2] },
      { l: 78, t: 48, title: "Warmer", sub: "Cell-saver ready", full: this._checklistLabels[3] },
      { l: 48, t: 58, title: "VTE", sub: "Deferred + charted", full: this._checklistLabels[4] },
      { l: 14, t: 52, title: "Comms", sub: "ICU · gas · bank", full: this._checklistLabels[5] },
    ];
    const shell = document.createElement("div");
    shell.className = "dc-or-scene";
    shell.innerHTML = `
      <div class="dc-or-floor" aria-hidden="true"></div>
      <div class="dc-or-table" aria-hidden="true"></div>
      <div class="dc-or-light" aria-hidden="true"></div>
    `;
    stations.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-or-station";
      b.style.left = `${s.l}%`;
      b.style.top = `${s.t}%`;
      b.title = s.full;
      b.innerHTML = `<span class="dc-or-station-num">${i + 1}</span><span class="dc-or-station-title">${s.title}</span><small>${s.sub}</small>`;
      b.disabled = i !== 0;
      b.addEventListener("click", () => {
        if (i !== this._checklistStep) {
          this._mistakes += 1;
          this._setFeedback(`Next station: ${this._checklistStep + 1}.`, true);
          return;
        }
        b.classList.add("dc-or-station--done");
        b.disabled = true;
        this._checklistStep += 1;
        const next = shell.querySelectorAll(".dc-or-station")[this._checklistStep];
        if (next) /** @type {HTMLButtonElement} */ (next).disabled = false;
        this._syncFooterBtn();
        this._setFeedback(`Checklist ${this._checklistStep} / 6`, false);
      });
      shell.appendChild(b);
    });
    this.dom.workspace.appendChild(shell);
  }

  _renderFast() {
    this.dom.stepEl.textContent =
      "Extended FAST — complete the six-view sweep in order before laparotomy extension.";

    const shell = document.createElement("div");
    shell.className = "dc-fast-shell";
    shell.innerHTML = `<div class="dc-fast-torso" id="dc-fast-field"></div>`;
    const field = /** @type {HTMLElement} */ (shell.querySelector("#dc-fast-field"));
    const pts = [
      { i: 0, l: 50, t: 18 },
      { i: 1, l: 28, t: 38 },
      { i: 2, l: 72, t: 38 },
      { i: 3, l: 50, t: 62 },
      { i: 4, l: 32, t: 78 },
      { i: 5, l: 68, t: 78 },
    ];
    pts.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-fast-dot";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.textContent = String(p.i + 1);
      b.title = this._fastLabels[p.i];
      b.addEventListener("click", () => {
        if (p.i !== this._fastStep) {
          this._mistakes += 1;
          this._setFeedback(`Probe position ${this._fastStep + 1} next (${this._fastLabels[this._fastStep]}).`, true);
          return;
        }
        b.classList.add("dc-fast-dot--done");
        b.disabled = true;
        this._fastStep += 1;
        this._syncFooterBtn();
        this._setFeedback(`FAST ${this._fastStep} / 6`, false);
      });
      field.appendChild(b);
    });
    const cap = document.createElement("p");
    cap.className = "muted small dc-caption";
    cap.textContent = this._fastLabels.join(" → ");
    shell.appendChild(cap);
    this.dom.workspace.appendChild(shell);
  }

  _renderQuadrants() {
    this.dom.stepEl.textContent =
      "Formal laparotomy: four-quadrant packing exposure — RUQ → LUQ → RLQ → LLQ with midline structures in view.";

    const shell = document.createElement("div");
    shell.className = "dc-abdomen-shell";
    shell.innerHTML = `
      <div class="dc-abdomen" id="dc-abdomen-grid">
        <button type="button" class="dc-quad dc-quad--ruq" data-q="0">RUQ</button>
        <button type="button" class="dc-quad dc-quad--luq" data-q="1">LUQ</button>
        <button type="button" class="dc-quad dc-quad--rlq" data-q="2">RLQ</button>
        <button type="button" class="dc-quad dc-quad--llq" data-q="3">LLQ</button>
        <div class="dc-midline" aria-hidden="true"></div>
        <div class="dc-costal" aria-hidden="true"></div>
      </div>
      <p class="muted small dc-caption">Sequence: ${this._quadLabels.join(" → ")}.</p>
    `;
    this.dom.workspace.appendChild(shell);

    const grid = /** @type {HTMLElement} */ (shell.querySelector("#dc-abdomen-grid"));
    grid.querySelectorAll(".dc-quad").forEach((el) => {
      el.addEventListener("click", () => {
        const q = Number(/** @type {HTMLElement} */ (el).dataset.q);
        if (q !== this._quadOrder) {
          this._mistakes += 1;
          this._setFeedback(`Next quadrant: ${this._quadLabels[this._quadOrder]}.`, true);
          return;
        }
        /** @type {HTMLElement} */ (el).classList.add("dc-quad--done");
        /** @type {HTMLButtonElement} */ (el).disabled = true;
        this._quadOrder += 1;
        this._syncFooterBtn();
        this._setFeedback(`Quadrants ${this._quadOrder} / 4`, false);
      });
    });
  }

  _renderBleeders() {
    this.dom.stepEl.textContent =
      "Source control ladder: ten discrete bleeding foci — numeric order only (no jumping between territories).";

    const shell = document.createElement("div");
    shell.className = "dc-abdomen-shell";
    shell.innerHTML = `
      <div class="dc-abdomen dc-abdomen--bleed dc-abdomen--dense" id="dc-bleed-field">
        <div class="dc-liver-silhouette" aria-hidden="true"></div>
        <div class="dc-bowel-sheen" aria-hidden="true"></div>
        <div class="dc-pelvis-sheen" aria-hidden="true"></div>
      </div>
    `;
    const field = /** @type {HTMLElement} */ (shell.querySelector("#dc-bleed-field"));
    const spots = [
      { n: 1, l: 35, t: 22 },
      { n: 2, l: 58, t: 20 },
      { n: 3, l: 48, t: 32 },
      { n: 4, l: 28, t: 40 },
      { n: 5, l: 70, t: 38 },
      { n: 6, l: 42, t: 50 },
      { n: 7, l: 58, t: 52 },
      { n: 8, l: 34, t: 64 },
      { n: 9, l: 64, t: 62 },
      { n: 10, l: 50, t: 74 },
    ];
    spots.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-bleeder dc-bleeder--small";
      b.style.left = `${s.l}%`;
      b.style.top = `${s.t}%`;
      b.textContent = String(s.n);
      b.addEventListener("click", () => {
        const want = this._bleederOrder + 1;
        if (s.n !== want) {
          this._mistakes += 1;
          this._setFeedback(`Control focus #${want} next.`, true);
          return;
        }
        b.classList.add("dc-bleeder--done");
        b.disabled = true;
        this._bleederOrder += 1;
        this._syncFooterBtn();
        this._setFeedback(`Haemostasis ${this._bleederOrder} / 10`, false);
      });
      field.appendChild(b);
    });
    this.dom.workspace.appendChild(shell);
  }

  _renderViscus() {
    this.dom.stepEl.textContent =
      "Rule-out sweep on the eviscerated field — tap each anatomic zone in the mandated order (1→5).";

    const zones = [
      { cls: "dc-vis-zone--stomach", l: 14, t: 10, w: 34, h: 30, i: 0 },
      { cls: "dc-vis-zone--duo", l: 44, t: 8, w: 30, h: 24, i: 1 },
      { cls: "dc-vis-zone--sb", l: 22, t: 38, w: 56, h: 28, i: 2 },
      { cls: "dc-vis-zone--colon", l: 10, t: 66, w: 80, h: 24, i: 3 },
      { cls: "dc-vis-zone--retro", l: 78, t: 32, w: 18, h: 44, i: 4 },
    ];
    const shell = document.createElement("div");
    shell.className = "dc-viscus-scene";
    const board = document.createElement("div");
    board.className = "dc-viscus-board";
    board.innerHTML = `
      <div class="dc-viscus-rim" aria-hidden="true"></div>
      <div class="dc-viscus-liver" aria-hidden="true"></div>
      <div class="dc-viscus-bowel-mass" aria-hidden="true"></div>
    `;
    zones.forEach((z) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `dc-vis-zone ${z.cls}`;
      b.style.left = `${z.l}%`;
      b.style.top = `${z.t}%`;
      b.style.width = `${z.w}%`;
      b.style.height = `${z.h}%`;
      b.title = this._viscusLabels[z.i];
      b.innerHTML = `<span class="dc-vis-zone-num">${z.i + 1}</span><span class="dc-vis-zone-lbl">${this._viscusLabels[z.i]}</span>`;
      b.disabled = z.i !== 0;
      b.addEventListener("click", () => {
        if (z.i !== this._viscusStep) {
          this._mistakes += 1;
          this._setFeedback("Follow the inspection ladder — next zone is numbered.", true);
          return;
        }
        b.classList.add("dc-vis-zone--done");
        b.disabled = true;
        this._viscusStep += 1;
        const next = board.querySelectorAll(".dc-vis-zone")[this._viscusStep];
        if (next) /** @type {HTMLButtonElement} */ (next).disabled = false;
        this._syncFooterBtn();
        this._setFeedback(`Viscus sweep ${this._viscusStep} / 5`, false);
      });
      board.appendChild(b);
    });
    shell.appendChild(board);
    this.dom.workspace.appendChild(shell);
  }

  _renderPacking() {
    this.dom.stepEl.textContent =
      "Damage-control packing: select exactly six cells — peripheral columns (1 & 4) plus central gutters on row 2 (4×3 grid). Wrong extras fail the map.";

    const shell = document.createElement("div");
    shell.className = "dc-pack-shell";
    const legend = document.createElement("p");
    legend.className = "muted small";
    legend.textContent =
      "Grid: rows cephalad→caudad, columns patient right→left. Target pattern = [1,4,5,8,9,12] in 1-based reading order.";
    shell.appendChild(legend);
    const grid = document.createElement("div");
    grid.className = "dc-pack-grid dc-pack-grid--12";
    for (let i = 0; i < 12; i++) {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "dc-pack-cell";
      c.dataset.idx = String(i);
      c.textContent = String(i + 1);
      c.addEventListener("click", () => {
        if (this._packPick.has(i)) {
          this._packPick.delete(i);
          c.classList.remove("dc-pack-cell--on");
        } else {
          if (this._packPick.size >= 6) {
            this._mistakes += 1;
            this._setFeedback("Six lap pads only for this stage.", true);
            return;
          }
          this._packPick.add(i);
          c.classList.add("dc-pack-cell--on");
        }
        this._syncFooterBtn();
        this._setFeedback(`Pads ${this._packPick.size} / 6`, false);
      });
      grid.appendChild(c);
    }
    shell.appendChild(grid);
    this.dom.workspace.appendChild(shell);
  }

  _renderPringle() {
    this.dom.stepEl.textContent =
      "Hepatic inflow control (Pringle teaching point): haemodynamic concern scale AND warm ischaemia clock must sit in the narrow training window simultaneously.";

    const box = document.createElement("div");
    box.className = "dc-equipment-scene tension-block dc-tac-block dc-dual-sliders";
    box.innerHTML = `
      <div class="dc-pringle-diagram" aria-hidden="true">
        <div class="dc-pringle-liver"></div>
        <div class="dc-pringle-hilum"></div>
        <div class="dc-pringle-clamp"></div>
      </div>
      <label class="field">
        <span>Portal / inflow concern index (arbitrary units)</span>
        <input type="range" id="dc-pringle-concern" min="15" max="40" value="28" />
      </label>
      <div class="tension-readout">Index: <span id="dc-pringle-concern-read">28</span> · required band <strong>24–30</strong></div>
      <label class="field">
        <span>Accumulated Pringle minutes (simulated)</span>
        <input type="range" id="dc-pringle-min" min="8" max="22" value="15" />
      </label>
      <div class="tension-readout"><span id="dc-pringle-min-read">15</span> min · required band <strong>12–18</strong> (teach release strategy)</div>
    `;
    this.dom.workspace.appendChild(box);
    const a = /** @type {HTMLInputElement} */ (box.querySelector("#dc-pringle-concern"));
    const b = /** @type {HTMLInputElement} */ (box.querySelector("#dc-pringle-min"));
    const ar = /** @type {HTMLElement} */ (box.querySelector("#dc-pringle-concern-read"));
    const br = /** @type {HTMLElement} */ (box.querySelector("#dc-pringle-min-read"));
    a.addEventListener("input", () => {
      this._pringleConcern = Number(a.value);
      ar.textContent = String(this._pringleConcern);
      this._syncFooterBtn();
    });
    b.addEventListener("input", () => {
      this._pringleMinutes = Number(b.value);
      br.textContent = String(this._pringleMinutes);
      this._syncFooterBtn();
    });
  }

  _renderTacMesh() {
    this.dom.stepEl.textContent =
      "Temporary abdominal closure: retention suture tension (narrow band) AND inter-wave mesh gap — both must be green before documentation.";

    const box = document.createElement("div");
    box.className = "dc-equipment-scene tension-block dc-tac-block dc-dual-sliders";
    box.innerHTML = `
      <div class="dc-tac-diagram" aria-hidden="true">
        <div class="dc-tac-fascia-gap"></div>
        <div class="dc-tac-mesh-wave dc-tac-mesh-wave--a"></div>
        <div class="dc-tac-mesh-wave dc-tac-mesh-wave--b"></div>
        <div class="dc-tac-retention dc-tac-retention--l"></div>
        <div class="dc-tac-retention dc-tac-retention--r"></div>
      </div>
      <label class="field">
        <span>Retention suture tension (N)</span>
        <input type="range" id="dc-tac-range" min="45" max="62" value="54" />
      </label>
      <div class="tension-readout"><span id="dc-tac-read">54</span> N · band <strong>52–56</strong> only</div>
      <label class="field">
        <span>Inter-wave fascial gap (mm)</span>
        <input type="range" id="dc-mesh-gap" min="8" max="22" value="14" />
      </label>
      <div class="tension-readout"><span id="dc-mesh-read">14</span> mm · band <strong>12–16</strong></div>
    `;
    this.dom.workspace.appendChild(box);
    const r = /** @type {HTMLInputElement} */ (box.querySelector("#dc-tac-range"));
    const g = /** @type {HTMLInputElement} */ (box.querySelector("#dc-mesh-gap"));
    const rr = /** @type {HTMLElement} */ (box.querySelector("#dc-tac-read"));
    const gr = /** @type {HTMLElement} */ (box.querySelector("#dc-mesh-read"));
    r.addEventListener("input", () => {
      this._tacTension = Number(r.value);
      rr.textContent = String(this._tacTension);
      this._syncFooterBtn();
    });
    g.addEventListener("input", () => {
      this._meshGapMm = Number(g.value);
      gr.textContent = String(this._meshGapMm);
      this._syncFooterBtn();
    });
  }

  _renderNpwtInstill() {
    this.dom.stepEl.textContent =
      "Open-abdomen NPWT: continuous negative pressure in a **tight** band plus net instillation rate — both are scored.";

    const box = document.createElement("div");
    box.className = "dc-equipment-scene tension-block dc-tac-block dc-dual-sliders";
    box.innerHTML = `
      <div class="dc-npwt-diagram" aria-hidden="true">
        <div class="dc-npwt-drape"></div>
        <div class="dc-npwt-foam"></div>
        <div class="dc-npwt-tube"></div>
      </div>
      <label class="field">
        <span>Negative pressure (mmHg)</span>
        <input type="range" id="dc-npwt-range" min="-92" max="-78" step="1" value="-85" />
      </label>
      <div class="tension-readout"><span id="dc-npwt-read">-85</span> mmHg · band <strong>−86 to −84</strong></div>
      <label class="field">
        <span>Net instillation (mL/h)</span>
        <input type="range" id="dc-instill" min="320" max="480" value="410" />
      </label>
      <div class="tension-readout"><span id="dc-instill-read">410</span> mL/h · band <strong>395–425</strong></div>
    `;
    this.dom.workspace.appendChild(box);
    const r = /** @type {HTMLInputElement} */ (box.querySelector("#dc-npwt-range"));
    const i = /** @type {HTMLInputElement} */ (box.querySelector("#dc-instill"));
    const rr = /** @type {HTMLElement} */ (box.querySelector("#dc-npwt-read"));
    const ir = /** @type {HTMLElement} */ (box.querySelector("#dc-instill-read"));
    r.addEventListener("input", () => {
      this._npwt = Number(r.value);
      rr.textContent = String(this._npwt);
      this._syncFooterBtn();
    });
    i.addEventListener("input", () => {
      this._instillMlHr = Number(i.value);
      ir.textContent = String(this._instillMlHr);
      this._syncFooterBtn();
    });
  }

  _renderRelook() {
    this.dom.stepEl.textContent =
      "Second-look ladder — activate each time checkpoint along the ICU→OR axis in strict chronological order.";

    const positions = [10, 36, 62, 88];
    const shell = document.createElement("div");
    shell.className = "dc-relook-scene";
    shell.innerHTML = `<div class="dc-relook-axis" aria-hidden="true"></div>`;
    const axis = /** @type {HTMLElement} */ (shell.querySelector(".dc-relook-axis"));
    this._relookLabels.forEach((text, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-relook-node";
      b.style.left = `${positions[i]}%`;
      const head = text.split(" — ")[0] || text;
      const tail = text.includes(" — ") ? text.split(" — ").slice(1).join(" — ") : "";
      b.innerHTML = `<span class="dc-relook-node-time">${head}</span>${tail ? `<small>${tail}</small>` : ""}`;
      b.title = text;
      b.disabled = i !== 0;
      b.addEventListener("click", () => {
        if (i !== this._relookStep) {
          this._mistakes += 1;
          this._setFeedback("Escalation ladder is chronological — do not reorder.", true);
          return;
        }
        b.classList.add("dc-relook-node--done");
        b.disabled = true;
        this._relookStep += 1;
        const next = axis.querySelectorAll(".dc-relook-node")[this._relookStep];
        if (next) /** @type {HTMLButtonElement} */ (next).disabled = false;
        this._syncFooterBtn();
        this._setFeedback(`Relook documentation ${this._relookStep} / 4`, false);
      });
      axis.appendChild(b);
    });
    this.dom.workspace.appendChild(shell);
  }

  _fascialPlan14() {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const n = i + 1;
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const t = 70 - row * 5.2;
      const l = left ? 16 + (row % 3) * 2 : 84 - (row % 3) * 2;
      out.push({ n, l, t });
    }
    return out;
  }

  _renderFascial() {
    this.dom.stepEl.textContent =
      "Delayed fascial re-approximation: fourteen interrupted bites, strict inferior→superior numeric order, alternating hemispheres.";

    const shell = document.createElement("div");
    shell.className = "dc-fascial-shell";
    const track = document.createElement("div");
    track.className = "dc-fascial-track dc-fascial-track--long";
    this._fascialPlan14().forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-fascial-bite dc-fascial-bite--tiny";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.innerHTML = `<span>${p.n}</span>`;
      b.addEventListener("click", () => {
        const want = this._fascialStep + 1;
        if (p.n !== want) {
          this._mistakes += 1;
          this._setFeedback(`Next fascial bite: ${want}.`, true);
          return;
        }
        b.classList.add("dc-fascial-bite--done");
        b.disabled = true;
        this._fascialStep += 1;
        this._syncFooterBtn();
        this._setFeedback(`Bites ${this._fascialStep} / 14`, false);
      });
      track.appendChild(b);
    });
    shell.appendChild(track);
    this.dom.workspace.appendChild(shell);
  }

  _renderSignout() {
    this.dom.stepEl.textContent =
      "Back-table sign-out — clear the five communication trays in order before scrub-out.";

    const slots = [
      { l: 8, t: 12, w: 40, h: 38 },
      { l: 52, t: 12, w: 40, h: 38 },
      { l: 8, t: 54, w: 26, h: 40 },
      { l: 37, t: 54, w: 26, h: 40 },
      { l: 66, t: 54, w: 26, h: 40 },
    ];
    const shell = document.createElement("div");
    shell.className = "dc-signout-scene";
    const table = document.createElement("div");
    table.className = "dc-signout-table";
    table.innerHTML = `<div class="dc-signout-drape" aria-hidden="true"></div>`;
    this._signoutLabels.forEach((text, i) => {
      const s = slots[i];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dc-signout-slot";
      b.style.left = `${s.l}%`;
      b.style.top = `${s.t}%`;
      b.style.width = `${s.w}%`;
      b.style.height = `${s.h}%`;
      b.title = text;
      b.innerHTML = `<span class="dc-signout-slot-num">${i + 1}</span><span class="dc-signout-slot-txt">${text}</span>`;
      b.disabled = i !== 0;
      b.addEventListener("click", () => {
        if (i !== this._signoutStep) {
          this._mistakes += 1;
          this._setFeedback("Sign-out sequence is protocolised.", true);
          return;
        }
        b.classList.add("dc-signout-slot--done");
        b.disabled = true;
        this._signoutStep += 1;
        const next = table.querySelectorAll(".dc-signout-slot")[this._signoutStep];
        if (next) /** @type {HTMLButtonElement} */ (next).disabled = false;
        this._syncFooterBtn();
        this._setFeedback(`Sign-out ${this._signoutStep} / 5`, false);
      });
      table.appendChild(b);
    });
    shell.appendChild(table);
    this.dom.workspace.appendChild(shell);
  }

  _finish() {
    this.dom.footer.innerHTML = "";
    const t1 = performance.now() / 1000;
    const elapsed = t1 - this._t0;

    const mistakePenalty = Math.min(45, this._mistakes * 2.8);
    let timePenalty = 0;
    if (elapsed > 720) timePenalty = Math.min(12, (elapsed - 720) / 60);

    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(100 - mistakePenalty - timePenalty))
    );

    let feedback =
      "Full damage-control sequence completed — this reflects a theatre-grade checklist load.";
    if (finalScore < 50)
      feedback =
        "Repeat the module: errors suggest skipped discipline on sequence, packing geometry, or numeric bands (TAC/NPWT/Pringle).";
    else if (finalScore < 72)
      feedback =
        "Heavy module passed marginally — review narrow targets for TAC, NPWT, and Pringle window.";

    const inBand = (v, lo, hi) => (v >= lo && v <= hi ? 100 : 40);

    const report = {
      kind: "damageControlLaparotomy",
      procedureName: DAMAGE_CONTROL_PROCEDURE_NAME,
      traineeName: this._traineeName,
      finalScore,
      checklistScore: 100,
      fastScore: 100,
      quadrantScore: 100,
      sourceControlScore: 100,
      viscusScore: 100,
      packingScore: 100,
      pringleScore: Math.round(
        (inBand(this._pringleConcern, 24, 30) +
          inBand(this._pringleMinutes, 12, 18)) /
          2
      ),
      tacScore: inBand(this._tacTension, 52, 56),
      meshGapScore: inBand(this._meshGapMm, 12, 16),
      npwtScore: inBand(this._npwt, -86, -84),
      instillScore: inBand(this._instillMlHr, 395, 425),
      relookScore: 100,
      fascialScore: 100,
      signoutScore: 100,
      mistakeCount: this._mistakes,
      totalTimeSec: Math.round(elapsed * 10) / 10,
      feedback,
      details: {
        tacTensionN: this._tacTension,
        meshGapMm: this._meshGapMm,
        npwtMmHg: this._npwt,
        instillMlHr: this._instillMlHr,
        pringleConcern: this._pringleConcern,
        pringleMinutes: this._pringleMinutes,
      },
    };

    this.dom.workspace.innerHTML = "";
    this.dom.phaseEl.textContent = "Procedure complete";
    this.dom.stepEl.textContent = "Generating operative report…";

    this._reviewTimer = window.setTimeout(() => {
      this._reviewTimer = null;
      this.hide();
      this.onComplete(report);
    }, 2400);
  }

  onWindowResize() {}
}
