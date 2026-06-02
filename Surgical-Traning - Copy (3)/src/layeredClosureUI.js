/**
 * Six-phase layered wound trainer: haemostasis → debridement → irrigation
 * (volume / pressure / temperature) → adipose approximation → deep fascia → staples.
 */

export const LAYERED_PROCEDURE_NAME = "Debridement and multilayer wound reconstruction";

const PHASE_COUNT = 6;

/**
 * @typedef {object} LayeredDom
 * @property {HTMLElement} overlay
 * @property {HTMLElement} titleEl
 * @property {HTMLElement} phaseEl
 * @property {HTMLElement} stepEl
 * @property {HTMLElement} workspace
 * @property {HTMLElement} feedback
 * @property {HTMLElement} footer
 */

export class LayeredClosureUI {
  /**
   * @param {LayeredDom} dom
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
    this._bleederStep = 0;
    this._debrideCleared = new Set();
    this._irrVol = 500;
    this._irrPsi = 14;
    this._irrTemp = 38;
    this._adiposeStep = 0;
    this._deepStep = 0;
    this._stapleStep = 0;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._reviewTimer = null;

    this._boundFooterClick = (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.id === "layered-btn-phase") this._advanceFromPhase();
      if (t.id === "layered-btn-abandon") this.abort();
    };
    this.dom.footer.addEventListener("click", this._boundFooterClick);
  }

  dispose() {
    this._clearReview();
    this.dom.footer.removeEventListener("click", this._boundFooterClick);
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
    this._bleederStep = 0;
    this._debrideCleared = new Set();
    this._irrVol = 500;
    this._irrPsi = 14;
    this._irrTemp = 38;
    this._adiposeStep = 0;
    this._deepStep = 0;
    this._stapleStep = 0;

    this.dom.titleEl.textContent = LAYERED_PROCEDURE_NAME;
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

  _setFeedback(msg, isError) {
    this.dom.feedback.textContent = msg;
    this.dom.feedback.style.color = isError
      ? "var(--danger, #f85149)"
      : "var(--muted, #8b949e)";
  }

  _renderPhase() {
    this.dom.workspace.innerHTML = "";
    this.dom.feedback.textContent = "";
    this.dom.phaseEl.textContent = `Phase ${this._phase + 1} of ${PHASE_COUNT}`;
    this.dom.stepEl.textContent = "";

    if (this._phase === 0) this._renderBleederControl();
    else if (this._phase === 1) this._renderDebridement();
    else if (this._phase === 2) this._renderIrrigation();
    else if (this._phase === 3) this._renderAdiposeLayer();
    else if (this._phase === 4) this._renderDeepLayer();
    else if (this._phase === 5) this._renderStaples();
    else {
      this._finishProcedure();
      return;
    }
    this._renderFooter();
  }

  _renderFooter() {
    if (this._phase >= PHASE_COUNT) return;
    const labels = [
      "Focal haemostasis complete",
      "Debridement complete",
      "Irrigation protocol logged",
      "Adipose layer approximated",
      "Deep fascial layer complete",
      "Skin closure complete",
    ];
    const label = labels[this._phase] || "Continue";
    this.dom.footer.innerHTML = `
      <div class="layered-footer-row">
        <button type="button" id="layered-btn-phase" class="primary" disabled>${label}</button>
        <button type="button" id="layered-btn-abandon" class="secondary">Abandon procedure</button>
      </div>
      <p class="muted small layered-esc-hint">Press <kbd>ESC</kbd> to exit this procedure.</p>
    `;
    this._syncPhaseButton();
  }

  _syncPhaseButton() {
    const btn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById("layered-btn-phase")
    );
    if (!btn) return;
    if (this._phase === 0) btn.disabled = this._bleederStep < 4;
    else if (this._phase === 1) btn.disabled = this._debrideCleared.size < 9;
    else if (this._phase === 2) btn.disabled = false;
    else if (this._phase === 3) btn.disabled = this._adiposeStep < 6;
    else if (this._phase === 4) btn.disabled = this._deepStep < 6;
    else if (this._phase === 5) btn.disabled = this._stapleStep < 7;
  }

  _advanceFromPhase() {
    const btn = document.getElementById("layered-btn-phase");
    if (btn && /** @type {HTMLButtonElement} */ (btn).disabled) return;
    this._phase += 1;
    this._renderPhase();
  }

  _renderBleederControl() {
    this.dom.stepEl.textContent =
      "Initial control: coagulate or ligate four discrete muscular bleeders along the wound edge in numeric order (1→4) before debridement.";

    const wrap = document.createElement("div");
    wrap.className =
      "layered-wound-panel wound-panel layered-wound--complex layered-wound--vascular";
    wrap.innerHTML = `
      <div class="wound-layer wound-layer-base">
        <div class="wound-flesh wound-flesh--layered wound-flesh--vascular"></div>
        <div class="wound-gash wound-gash--layered wound-gash--jagged" aria-hidden="true"></div>
      </div>
      <div class="layered-debride-layer" id="layered-bleed-host"></div>
    `;
    this.dom.workspace.appendChild(wrap);
    const host = /** @type {HTMLElement} */ (wrap.querySelector("#layered-bleed-host"));
    const pts = [
      { n: 1, l: 32, t: 38 },
      { n: 2, l: 68, t: 36 },
      { n: 3, l: 36, t: 58 },
      { n: 4, l: 64, t: 60 },
    ];
    pts.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "layered-bleeder-dot";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.textContent = String(p.n);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const want = this._bleederStep + 1;
        if (p.n !== want) {
          this._mistakes += 1;
          this._setFeedback(`Secure bleeder #${want} next — maintain haemostatic sequence.`, true);
          return;
        }
        b.classList.add("layered-bleeder-dot--done");
        b.disabled = true;
        this._bleederStep += 1;
        this._syncPhaseButton();
        this._setFeedback(`Controlled ${this._bleederStep} / 4 foci.`, false);
      });
      host.appendChild(b);
    });
  }

  _renderDebridement() {
    this.dom.stepEl.textContent =
      "Sharp debridement: excise nine discrete slough islands. Avoid repeated passes on viable dermis (stray clicks penalised).";

    const wrap = document.createElement("div");
    wrap.className =
      "layered-wound-panel wound-panel layered-wound--complex layered-wound--slough-field";
    wrap.innerHTML = `
      <div class="wound-layer wound-layer-base">
        <div class="wound-flesh wound-flesh--layered"></div>
        <div class="wound-gash wound-gash--layered wound-gash--jagged" aria-hidden="true"></div>
      </div>
      <div class="layered-debride-layer" id="layered-debride-host"></div>
    `;
    this.dom.workspace.appendChild(wrap);

    const host = /** @type {HTMLElement} */ (wrap.querySelector("#layered-debride-host"));
    const positions = [
      { l: 36, t: 26 },
      { l: 52, t: 24 },
      { l: 44, t: 36 },
      { l: 58, t: 34 },
      { l: 38, t: 48 },
      { l: 54, t: 50 },
      { l: 48, t: 62 },
      { l: 40, t: 70 },
      { l: 56, t: 68 },
    ];
    positions.forEach((pos, i) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "layered-slough-patch layered-slough-patch--large";
      d.style.left = `${pos.l}%`;
      d.style.top = `${pos.t}%`;
      d.dataset.index = String(i);
      d.setAttribute("aria-label", `Slough island ${i + 1}`);
      d.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (d.classList.contains("cleared")) return;
        d.classList.add("cleared");
        this._debrideCleared.add(i);
        this._syncPhaseButton();
        this._setFeedback(`Excised ${this._debrideCleared.size} / 9 targets.`, false);
      });
      host.appendChild(d);
    });

    wrap.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.classList.contains("layered-slough-patch")) return;
      if (host.contains(t) || t === host) {
        this._mistakes += 1;
        this._setFeedback("Unnecessary tissue pass — target only marked slough.", true);
      }
    });
  }

  _renderIrrigation() {
    this.dom.stepEl.textContent =
      "Pulsatile lavage: set warmed crystalloid volume, delivery pressure, and bath temperature within protocol bands.";

    const box = document.createElement("div");
    box.className = "layered-irrigation-block tension-block layered-irrigation--triple";
    box.innerHTML = `
      <label class="field">
        <span>Irrigation volume (mL)</span>
        <input type="range" id="layered-irr-vol" min="250" max="900" value="520" />
      </label>
      <div class="tension-readout">Volume: <span id="layered-irr-vol-read">520</span> mL · target 420–680</div>
      <label class="field">
        <span>Delivery pressure (psi)</span>
        <input type="range" id="layered-irr-psi" min="5" max="42" value="14" />
      </label>
      <div class="tension-readout">Pressure: <span id="layered-irr-psi-read">14</span> psi · target 9–19</div>
      <label class="field">
        <span>Bath temperature (°C)</span>
        <input type="range" id="layered-irr-temp" min="34" max="41" step="0.1" value="38" />
      </label>
      <div class="tension-readout">Temperature: <span id="layered-irr-temp-read">38.0</span> °C · target 36.5–39.0</div>
    `;
    this.dom.workspace.appendChild(box);

    const vol = /** @type {HTMLInputElement} */ (box.querySelector("#layered-irr-vol"));
    const psi = /** @type {HTMLInputElement} */ (box.querySelector("#layered-irr-psi"));
    const tmp = /** @type {HTMLInputElement} */ (box.querySelector("#layered-irr-temp"));
    const volR = /** @type {HTMLElement} */ (box.querySelector("#layered-irr-vol-read"));
    const psiR = /** @type {HTMLElement} */ (box.querySelector("#layered-irr-psi-read"));
    const tmpR = /** @type {HTMLElement} */ (box.querySelector("#layered-irr-temp-read"));

    vol.addEventListener("input", () => {
      this._irrVol = Number(vol.value);
      volR.textContent = String(this._irrVol);
    });
    psi.addEventListener("input", () => {
      this._irrPsi = Number(psi.value);
      psiR.textContent = String(this._irrPsi);
    });
    tmp.addEventListener("input", () => {
      this._irrTemp = Number(tmp.value);
      tmpR.textContent = this._irrTemp.toFixed(1);
    });
    this._irrVol = Number(vol.value);
    this._irrPsi = Number(psi.value);
    this._irrTemp = Number(tmp.value);
  }

  _renderAdiposeLayer() {
    this.dom.stepEl.textContent =
      "Subcutaneous / Scarpa approximation: place six quick vertical mattress bites in zigzag numeric order across the wound base.";

    const wrap = document.createElement("div");
    wrap.className = "layered-wound-panel wound-panel layered-wound--complex";
    wrap.innerHTML = `
      <div class="wound-layer wound-layer-base">
        <div class="wound-flesh wound-flesh--layered"></div>
        <div class="wound-gash wound-gash--layered wound-gash--narrow" aria-hidden="true"></div>
      </div>
      <div class="layered-deep-host" id="layered-adipose-host"></div>
    `;
    this.dom.workspace.appendChild(wrap);
    const host = /** @type {HTMLElement} */ (wrap.querySelector("#layered-adipose-host"));
    const plan = [
      { n: 1, l: 26, t: 40 },
      { n: 2, l: 74, t: 38 },
      { n: 3, l: 30, t: 52 },
      { n: 4, l: 70, t: 50 },
      { n: 5, l: 34, t: 64 },
      { n: 6, l: 66, t: 62 },
    ];
    plan.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "layered-adipose-bite";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.innerHTML = `<span class="layered-deep-num">${p.n}</span>`;
      b.addEventListener("click", () => {
        const want = this._adiposeStep + 1;
        if (p.n !== want) {
          this._mistakes += 1;
          this._setFeedback(`Follow zigzag plan: next is #${want}.`, true);
          return;
        }
        b.classList.add("placed");
        b.disabled = true;
        this._adiposeStep += 1;
        this._syncPhaseButton();
        this._setFeedback(`Adipose bites ${this._adiposeStep} / 6`, false);
      });
      host.appendChild(b);
    });
  }

  _renderDeepLayer() {
    this.dom.stepEl.textContent =
      "Deep fascial closure: six interrupted polydioxanone bites, numbered order, full-thickness fascia engagement.";

    const wrap = document.createElement("div");
    wrap.className = "layered-wound-panel wound-panel layered-wound--complex";
    wrap.innerHTML = `
      <div class="wound-layer wound-layer-base">
        <div class="wound-flesh wound-flesh--layered"></div>
        <div class="wound-gash wound-gash--layered wound-gash--narrow" aria-hidden="true"></div>
      </div>
      <div class="layered-deep-host" id="layered-deep-host"></div>
    `;
    this.dom.workspace.appendChild(wrap);

    const host = /** @type {HTMLElement} */ (wrap.querySelector("#layered-deep-host"));
    const plan = [
      { n: 1, l: 24, t: 32 },
      { n: 2, l: 76, t: 30 },
      { n: 3, l: 28, t: 44 },
      { n: 4, l: 72, t: 42 },
      { n: 5, l: 32, t: 56 },
      { n: 6, l: 68, t: 54 },
    ];

    plan.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "layered-deep-bite";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.dataset.order = String(p.n);
      b.innerHTML = `<span class="layered-deep-num">${p.n}</span>`;
      b.addEventListener("click", () => {
        const expected = this._deepStep + 1;
        if (p.n !== expected) {
          this._mistakes += 1;
          this._setFeedback(`Next fascial bite: #${expected}.`, true);
          return;
        }
        b.classList.add("placed");
        b.disabled = true;
        this._deepStep += 1;
        this._syncPhaseButton();
        this._setFeedback(`Fascial bites ${this._deepStep} / 6 seated.`, false);
      });
      host.appendChild(b);
    });
  }

  _renderStaples() {
    this.dom.stepEl.textContent =
      "Cutaneous closure: deploy seven staples centre-out (midline first, then alternate laterally).";

    const wrap = document.createElement("div");
    wrap.className = "layered-wound-panel wound-panel layered-wound--complex";
    wrap.innerHTML = `
      <div class="wound-layer wound-layer-base">
        <div class="wound-flesh wound-flesh--layered"></div>
        <div class="wound-gash wound-gash--layered wound-gash--staple-track wound-gash--staple-wide" aria-hidden="true"></div>
      </div>
      <div class="layered-staple-host" id="layered-staple-host"></div>
    `;
    this.dom.workspace.appendChild(wrap);

    const host = /** @type {HTMLElement} */ (wrap.querySelector("#layered-staple-host"));
    const order = [4, 3, 5, 2, 6, 1, 7];
    const positions = [
      { slot: 1, l: 32, t: 44 },
      { slot: 2, l: 39, t: 44 },
      { slot: 3, l: 46, t: 44 },
      { slot: 4, l: 50, t: 44 },
      { slot: 5, l: 54, t: 44 },
      { slot: 6, l: 61, t: 44 },
      { slot: 7, l: 68, t: 44 },
    ];

    positions.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "layered-staple-site";
      b.style.left = `${p.l}%`;
      b.style.top = `${p.t}%`;
      b.dataset.slot = String(p.slot);
      b.setAttribute("aria-label", `Staple ${p.slot}`);
      b.addEventListener("click", () => {
        const want = order[this._stapleStep];
        if (p.slot !== want) {
          this._mistakes += 1;
          this._setFeedback("Centre-out: deploy from geometric wound centre, then alternate sides.", true);
          return;
        }
        b.classList.add("stapled");
        b.disabled = true;
        this._stapleStep += 1;
        this._syncPhaseButton();
        this._setFeedback(`Staples ${this._stapleStep} / 7`, false);
      });
      host.appendChild(b);
    });
  }

  _scoreIrrigation() {
    let s = 100;
    if (this._irrVol < 420 || this._irrVol > 680) s -= 22;
    if (this._irrPsi < 9 || this._irrPsi > 19) s -= 22;
    if (this._irrTemp < 36.5 || this._irrTemp > 39) s -= 24;
    return Math.max(0, s);
  }

  _finishProcedure() {
    this.dom.footer.innerHTML = "";
    const t1 = performance.now() / 1000;
    const totalTime = t1 - this._t0;

    const bleedScore = Math.max(0, 100 - this._mistakes * 2);
    const debrideScore = Math.max(0, 100 - this._mistakes * 2);
    const irrScore = this._scoreIrrigation();
    const adiposeScore = Math.max(0, 100 - this._mistakes * 2);
    const deepScore = Math.max(0, 100 - this._mistakes * 2);
    const stapleScore = 100;

    const finalScore = Math.round(
      bleedScore * 0.12 +
        debrideScore * 0.2 +
        irrScore * 0.2 +
        adiposeScore * 0.16 +
        deepScore * 0.18 +
        stapleScore * 0.14 -
        Math.min(20, this._mistakes * 2.2)
    );
    const clamped = Math.max(0, Math.min(100, finalScore));

    let feedback = "Multilayer reconstruction trajectory is theatre-realistic.";
    if (clamped < 52)
      feedback =
        "Repeat: master sequence discipline (bleeders → slough → lavage → planes → fascia → skin).";
    else if (clamped < 76) feedback = "Acceptable; tighten irrigation triad and staple geometry.";

    const report = {
      kind: "layeredClosure",
      procedureName: LAYERED_PROCEDURE_NAME,
      traineeName: this._traineeName,
      finalScore: clamped,
      haemostasisScore: Math.round(bleedScore),
      debridementScore: Math.round(debrideScore),
      irrigationScore: Math.round(irrScore),
      adiposeLayerScore: Math.round(adiposeScore),
      deepLayerScore: Math.round(deepScore),
      stapleScore,
      mistakeCount: this._mistakes,
      totalTimeSec: Math.round(totalTime * 10) / 10,
      feedback,
      details: {
        irrigationVolumeMl: this._irrVol,
        irrigationPsi: this._irrPsi,
        irrigationTempC: this._irrTemp,
      },
    };

    this.dom.workspace.innerHTML = "";
    this.dom.phaseEl.textContent = "Procedure complete";
    this.dom.stepEl.textContent = "Generating operative report…";
    this._setFeedback("", false);

    this._reviewTimer = window.setTimeout(() => {
      this._reviewTimer = null;
      this.hide();
      this.onComplete(report);
    }, 2200);
  }

  onWindowResize() {}
}
