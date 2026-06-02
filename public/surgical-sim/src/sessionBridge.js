/**
 * Integrates the Babylon surgical simulator with the React app:
 * URL params from Training page, localStorage + redirect for Reports.
 */

import { getEvaluationParts } from "./resultsUI.js";

function readSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search || "");
}

function decodeName(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (!s) return "";
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

export function getSessionContext() {
  const params = readSearchParams();
  const sid = params.get("sessionId");
  const tid = params.get("traineeId") || "";
  let tn =
    params.get("traineeName") ||
    params.get("trainee_name") ||
    params.get("name");
  tn = decodeName(tn);
  /** App-linked session: skip name screen even if name missing (use fallback label) */
  const appLinked = Boolean(sid && tid);
  if (!tn && appLinked) {
    tn = `Trainee #${tid}`;
  }
  /** From Training page (name in URL) — show "Go to evaluation" even if createSession failed */
  const fromTraining = Boolean(tn && tn.length > 0);
  const exitToApp = Boolean((sid && tid) || fromTraining);
  return {
    sessionId: sid ? Number(sid) : null,
    traineeId: tid,
    courseId: params.get("courseId") || "",
    traineeName: tn,
    difficulty: params.get("difficulty") || "intermediate",
    /** Opened from Training with session + trainee — skip manual name entry */
    autoStart: Boolean((tn && tn.length > 0) || appLinked),
    /** Name comes from app — field is read-only */
    nameLocked: appLinked || fromTraining,
    exitToApp,
  };
}

let sessionStartMs = null;

export function markSessionStart() {
  sessionStartMs = Date.now();
}

/**
 * Map any procedure report to dashboard-compatible scores.
 * @param {object} report
 */
export function buildLastSessionPayload(report) {
  const ctx = getSessionContext();
  const durationSeconds = sessionStartMs
    ? Math.floor((Date.now() - sessionStartMs) / 1000)
    : 0;

  let accuracy = 0;
  let totalScore = 0;
  let stepsCompleted = 0;
  let totalSteps = 14;

  if (report?.kind === "layeredClosure") {
    totalScore = Number(report.finalScore) || 0;
    accuracy = totalScore;
    stepsCompleted = 6;
    totalSteps = 6;
  } else if (report?.kind === "damageControlLaparotomy") {
    totalScore = Number(report.finalScore) || 0;
    accuracy = totalScore;
    stepsCompleted = 12;
    totalSteps = 12;
  } else {
    totalScore = Number(report.finalScore ?? report.accuracyScore) || 0;
    accuracy = Number(report.accuracyScore ?? report.finalScore) || totalScore;
    stepsCompleted = Number(
      report.stitchesCompleted ?? report.correctStitches ?? report.stitchCount ?? 0
    );
    totalSteps = Number(report.planCount ?? report.totalSteps ?? 8) || 8;
  }

  const comments = JSON.stringify({
    simulator: "babylon-surgical-sim",
    procedure: report?.procedureName ?? report?.kind ?? "suturing",
    kind: report?.kind,
  }).slice(0, 2000);

  return {
    sessionId: ctx.sessionId,
    traineeId: ctx.traineeId,
    totalScore,
    accuracyScore: accuracy,
    speedScore: report?.timeScore != null ? Number(report.timeScore) : null,
    stepsCompleted,
    totalSteps,
    durationSeconds,
    comments,
  };
}

/**
 * Persist for React Reports page (same contract as legacy simulator).
 * @param {object} report
 */
export function persistProcedureResult(report) {
  const ctx = getSessionContext();
  const payload = buildLastSessionPayload(report);
  const { title: evaluationTitle, body: evaluationBody } = getEvaluationParts(
    report,
    ctx.traineeName || ""
  );

  const common = {
    totalScore: payload.totalScore,
    accuracyScore: payload.accuracyScore,
    speedScore: payload.speedScore ?? undefined,
    stepsCompleted: payload.stepsCompleted,
    totalSteps: payload.totalSteps,
    durationSeconds: payload.durationSeconds,
    comments: payload.comments,
    evaluationTitle,
    evaluationBody,
  };

  try {
    if (payload.sessionId) {
      localStorage.setItem(
        "lastSessionResult",
        JSON.stringify({
          sessionId: payload.sessionId,
          ...common,
        })
      );
      return;
    }
    /** Training opened with traineeName but no DB session — still pass evaluation text to /reports */
    if (ctx.traineeName) {
      localStorage.setItem(
        "lastSessionResult",
        JSON.stringify({
          evaluationOnly: true,
          ...common,
        })
      );
    }
  } catch (e) {
    console.warn("persistProcedureResult", e);
  }
}

export function goToAppReports() {
  window.location.href = "/reports";
}

export function goToAppHome() {
  window.location.href = "/";
}
