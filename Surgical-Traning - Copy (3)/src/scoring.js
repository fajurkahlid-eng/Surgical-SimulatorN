/**
 * Pure scoring helpers for the suturing session (mirrors prior weighted model).
 */

export const SCORE_WEIGHTS = {
  accuracy: 0.28,
  spacing: 0.18,
  symmetry: 0.18,
  tension: 0.14,
  order: 0.1,
  time: 0.12,
};

export const DEFAULT_PROCEDURE_NAME =
  "Complex laceration — interrupted dermal closure (advanced)";

/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * @param {object} params
 * @param {object[]} params.records
 * @param {number} params.hitRadius
 * @param {number} params.planCount
 * @param {number} params.totalTimeSec
 * @param {number} params.orderErrors
 * @param {number} params.wrongClicks
 * @param {number} [params.idealSecondsPerStitch]
 */
export function aggregateScores({
  records,
  hitRadius,
  planCount,
  totalTimeSec,
  orderErrors,
  wrongClicks,
  idealSecondsPerStitch = 14,
}) {
  const n = planCount;
  const idealStep = 1 / (n + 1);

  const accs = [];
  const syms = [];
  const spacings = [];
  const tens = [];
  let correct = 0;
  let incorrect = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) continue;
    const eScore = clamp(100 * (1 - r.entryError / hitRadius), 0, 100);
    const xScore = clamp(100 * (1 - r.exitError / hitRadius), 0, 100);
    const acc = (eScore + xScore) * 0.5;
    accs.push(acc);
    syms.push(r.symmetryScore != null ? r.symmetryScore : 80);
    if (i > 0 && r.spacingScore != null) spacings.push(r.spacingScore);
    tens.push(r.tensionScore || 0);
    const plane = r.bitePlaneScore != null ? r.bitePlaneScore : 100;
    if (
      acc >= 70 &&
      plane >= 58 &&
      (r.tensionScore || 0) >= 62 &&
      (r.symmetryScore || 0) >= 60
    )
      correct++;
    else incorrect++;
  }

  const accuracyScore = accs.length ? avg(accs) : 0;
  const symmetryScore = syms.length ? avg(syms) : 0;
  const stitchSpacingScore = spacings.length ? avg(spacings) : n <= 1 ? 100 : 85;
  const tensionScore = tens.length ? avg(tens) : 0;

  const orderScore = clamp(100 - orderErrors * 12 - wrongClicks * 4, 0, 100);

  const expected = Math.max(30, idealSecondsPerStitch * n);
  const timeRatio = totalTimeSec / expected;
  const timeScore = clamp(100 * (1.15 - timeRatio * 0.35), 0, 100);

  const mistakeCount = wrongClicks + orderErrors;

  const finalScore = Math.round(
    accuracyScore * SCORE_WEIGHTS.accuracy +
      stitchSpacingScore * SCORE_WEIGHTS.spacing +
      symmetryScore * SCORE_WEIGHTS.symmetry +
      tensionScore * SCORE_WEIGHTS.tension +
      orderScore * SCORE_WEIGHTS.order +
      timeScore * SCORE_WEIGHTS.time
  );

  return {
    accuracyScore: Math.round(accuracyScore),
    stitchSpacingScore: Math.round(stitchSpacingScore),
    symmetryScore: Math.round(symmetryScore),
    tensionScore: Math.round(tensionScore),
    orderScore: Math.round(orderScore),
    timeScore: Math.round(timeScore),
    mistakeCount,
    finalScore,
    correctStitches: correct,
    incorrectStitches: incorrect,
    idealStep,
    weightsNote:
      "Final = 28% accuracy + 18% spacing + 18% symmetry + 14% tension + 10% order + 12% time",
  };
}

/**
 * @param {ReturnType<typeof aggregateScores>} agg
 */
export function buildFeedback(agg) {
  const parts = [];
  if (agg.finalScore >= 88) parts.push("Excellent technical execution for this module.");
  else if (agg.finalScore >= 72)
    parts.push("Competent performance with room to refine consistency.");
  else parts.push("Continue deliberate practice on placement, spacing, and tension control.");

  if (agg.accuracyScore < 70) parts.push("Needle entry/exit accuracy should improve.");
  if (agg.stitchSpacingScore < 70) parts.push("Work on even bite spacing along the wound.");
  if (agg.symmetryScore < 70) parts.push("Balance left/right depth alignment across the wound.");
  if (agg.tensionScore < 70)
    parts.push("Thread tension was often outside the narrow ideal band (≈48–52%).");
  if (agg.orderScore < 70) parts.push("Maintain correct stitch sequence and avoid stray clicks.");
  if (agg.timeScore < 65) parts.push("Consider a steadier pace — speed affected the time component.");

  return parts.join(" ");
}

function avg(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}
