/**
 * DOM helpers for the post-procedure evaluation panel.
 */

/**
 * @param {HTMLElement | null} el
 */
export function showResults(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
}

/**
 * @param {HTMLElement | null} el
 */
export function hideResults(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
}

/**
 * Same text as the results panel — for saving to the React app (localStorage).
 * @param {object} report
 * @param {string} traineeName
 * @returns {{ title: string, body: string }}
 */
export function getEvaluationParts(report, traineeName) {
  const t = report || {};
  const name = traineeName || t.traineeName || "Trainee";
  const proc = t.procedureName || "Suturing procedure";
  const title = `Training evaluation — ${name}`;

  if (t.kind === "layeredClosure") {
    const lines = [
      `Procedure: ${proc}`,
      "────────────────────────────────",
      `Focal haemostasis: ${t.haemostasisScore ?? "—"} / 100`,
      `Sharp debridement: ${t.debridementScore ?? "—"} / 100`,
      `Irrigation (vol / pressure / temp): ${t.irrigationScore ?? "—"} / 100`,
      `Adipose / Scarpa approximation: ${t.adiposeLayerScore ?? "—"} / 100`,
      `Deep fascial run: ${t.deepLayerScore ?? "—"} / 100`,
      `Skin staples: ${t.stapleScore ?? "—"} / 100`,
      `Process mistakes: ${t.mistakeCount ?? "—"}`,
      `Elapsed time: ${t.totalTimeSec ?? "—"} s`,
      ...(t.details
        ? [
            "",
            `Logged: ${t.details.irrigationVolumeMl} mL · ${t.details.irrigationPsi} psi · ${
              t.details.irrigationTempC != null
                ? Number(t.details.irrigationTempC).toFixed(1)
                : "—"
            } °C`,
          ]
        : []),
      "────────────────────────────────",
      `FINAL SCORE: ${t.finalScore ?? "—"} / 100`,
      "",
      "Feedback:",
      t.feedback || "—",
    ];
    return { title, body: lines.join("\n") };
  }

  if (t.kind === "damageControlLaparotomy") {
    const lines = [
      `Procedure: ${proc}`,
      "────────────────────────────────",
      `Safety checklist: ${t.checklistScore ?? "—"} / 100`,
      `E-FAST sequence: ${t.fastScore ?? "—"} / 100`,
      `Quadrant laparotomy: ${t.quadrantScore ?? "—"} / 100`,
      `Source control (10 foci): ${t.sourceControlScore ?? "—"} / 100`,
      `Viscus / retroperitoneal sweep: ${t.viscusScore ?? "—"} / 100`,
      `Packing geometry (6/12): ${t.packingScore ?? "—"} / 100`,
      `Pringle window (dual targets): ${t.pringleScore ?? "—"} / 100`,
      `TAC tension (N): ${t.tacScore ?? "—"} / 100`,
      `Mesh / fascial gap (mm): ${t.meshGapScore ?? "—"} / 100`,
      `NPWT pressure (mmHg): ${t.npwtScore ?? "—"} / 100`,
      `Instillation (mL/h): ${t.instillScore ?? "—"} / 100`,
      `Second-look ladder: ${t.relookScore ?? "—"} / 100`,
      `Fascial run (14 bites): ${t.fascialScore ?? "—"} / 100`,
      `Sterile sign-out: ${t.signoutScore ?? "—"} / 100`,
      `Process mistakes: ${t.mistakeCount ?? "—"}`,
      `Elapsed time: ${t.totalTimeSec ?? "—"} s`,
      ...(t.details
        ? [
            "",
            `TAC ${t.details.tacTensionN} N · gap ${t.details.meshGapMm} mm · NPWT ${t.details.npwtMmHg} mmHg · instill ${t.details.instillMlHr} mL/h`,
            ...(t.details.pringleConcern != null
              ? [
                  `Pringle index ${t.details.pringleConcern} · minutes ${t.details.pringleMinutes}`,
                ]
              : []),
          ]
        : []),
      "────────────────────────────────",
      `FINAL SCORE: ${t.finalScore ?? "—"} / 100`,
      "",
      "Feedback:",
      t.feedback || "—",
    ];
    return { title, body: lines.join("\n") };
  }

  const lines = [
    `Procedure: ${proc}`,
    "────────────────────────────────",
    `Stitches completed: ${t.stitchesCompleted ?? t.stitchCount ?? "—"}`,
    `Correct / incorrect stitches: ${t.correctStitches ?? "—"} / ${t.incorrectStitches ?? "—"}`,
    `Accuracy score: ${t.accuracyScore ?? "—"} / 100`,
    `Stitch spacing score: ${t.stitchSpacingScore ?? "—"} / 100`,
    `Symmetry score: ${t.symmetryScore ?? "—"} / 100`,
    `Tension score: ${t.tensionScore ?? "—"} / 100`,
    `Order score: ${t.orderScore ?? "—"} / 100`,
    `Time score: ${t.timeScore ?? "—"} / 100`,
    `Mistake count: ${t.mistakeCount ?? "—"}`,
    `Elapsed time: ${t.totalTimeSec ?? "—"} s`,
    "────────────────────────────────",
    `FINAL SCORE: ${t.finalScore ?? "—"} / 100`,
    "",
    t.weightsNote ||
      "Weights: 28% accuracy, 18% spacing, 18% symmetry, 14% tension, 10% order, 12% time.",
    "",
    "Feedback:",
    t.feedback || "—",
  ];

  return { title, body: lines.join("\n") };
}

/**
 * @param {object} report
 * @param {string} traineeName
 * @param {HTMLElement | null} titleEl
 * @param {HTMLElement | null} bodyEl
 */
export function fillResults(report, traineeName, titleEl, bodyEl) {
  const { title, body } = getEvaluationParts(report, traineeName);
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;
}
