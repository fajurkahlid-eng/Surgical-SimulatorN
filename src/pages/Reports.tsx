import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import type { ReportRow } from '../api/client';
import DashboardNav from '../components/DashboardNav';

interface LastSessionResult {
  sessionId?: number;
  /** Saved from simulator when Training URL had traineeName but no DB session */
  evaluationOnly?: boolean;
  totalScore?: number;
  accuracyScore?: number;
  speedScore?: number;
  stepsCompleted?: number;
  totalSteps?: number;
  durationSeconds?: number;
  comments?: string | null;
  evaluationTitle?: string;
  evaluationBody?: string;
}

function toCSV(reports: ReportRow[]): string {
  const headers = ['Date', 'StartTime', 'CourseName', 'Type', 'AccuracyScore', 'SpeedScore', 'StepsCompleted', 'TotalSteps', 'DurationSeconds', 'Comments'];
  const rows = reports.map((r) => [
    r.Date,
    r.StartTime,
    r.CourseName,
    r.Type,
    r.AccuracyScore ?? '',
    r.SpeedScore ?? '',
    r.StepsCompleted ?? '',
    r.TotalSteps ?? '',
    r.DurationSeconds ?? '',
    (r.Comments ?? '').replace(/"/g, '""'),
  ]);
  const line = (arr: (string | number)[]) => arr.map((v) => (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v))).join(',');
  return [line(headers), ...rows.map((r) => line(r))].join('\n');
}

export default function Reports(): JSX.Element {
  const { user } = useAuth();
  const { ready } = useDb();
  const { t } = useLang();
  const [allReports, setAllReports] = useState<ReportRow[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [latestEval, setLatestEval] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('lastSessionResult');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as LastSessionResult;
      if (data.evaluationTitle || data.evaluationBody) {
        setLatestEval({
          title: data.evaluationTitle ?? '',
          body: data.evaluationBody ?? '',
        });
      }
      localStorage.removeItem('lastSessionResult');

      const noApiSync = data.evaluationOnly === true || data.sessionId == null;
      if (noApiSync) {
        if (user) {
          void api
            .getReports(user.traineeId)
            .then(setAllReports)
            .catch(() => {
              /* API offline — avoid unhandled rejection */
            });
        }
        return;
      }

      void Promise.all([
        api.endSession(data.sessionId as number),
        api.createReport({
          sessionId: data.sessionId as number,
          totalScore: data.totalScore ?? data.accuracyScore ?? undefined,
          accuracyScore: data.accuracyScore,
          speedScore: data.speedScore,
          stepsCompleted: data.stepsCompleted,
          totalSteps: data.totalSteps ?? 14,
          durationSeconds: data.durationSeconds,
          comments: data.comments ?? undefined,
        }),
      ])
        .then(() => {
          if (user) return api.getReports(user.traineeId).then(setAllReports);
        })
        .catch(console.error);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (!ready || !user) return;
    api
      .getReports(user.traineeId)
      .then(setAllReports)
      .catch(() => {
        /* Connection refused / API down — keep empty list */
      });
  }, [ready, user?.traineeId]);

  const reports = useMemo(() => {
    if (!dateFrom && !dateTo) return allReports;
    return allReports.filter((r) => {
      if (dateFrom && r.Date < dateFrom) return false;
      if (dateTo && r.Date > dateTo) return false;
      return true;
    });
  }, [allReports, dateFrom, dateTo]);

  function handleExportCSV(): void {
    const csv = toCSV(reports);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reports-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handlePrint(): void {
    window.print();
  }

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <DashboardNav />
      <div className="flex-1 container-page py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{String(t('reports.title'))}</h1>
          <p className="text-teal-400 mt-1 text-sm sm:text-base">{String(t('reports.subtitle'))}</p>
          {user && allReports.length > 0 && (
            <p className="text-teal-500 mt-1 text-xs">{String(t('reports.newestFirst'))}</p>
          )}
        </header>

        {!user && (
          <div className="mb-6 p-4 bg-teal-800/50 border border-teal-600 rounded-xl text-teal-200 text-sm">
            {String(t('reports.loginHint'))} <Link to="/login" className="text-teal-400 underline hover:text-teal-300">{String(t('reports.loginLink'))}</Link>.
          </div>
        )}

        {user && latestEval && (latestEval.title || latestEval.body) && (
          <div className="no-print mb-6 p-4 sm:p-6 bg-teal-800/40 border border-teal-500/50 rounded-2xl shadow-lg">
            <div className="flex flex-wrap justify-between gap-3 items-start mb-2">
              <h2 className="text-lg sm:text-xl font-semibold text-white pr-4">
                {latestEval.title || String(t('reports.title'))}
              </h2>
              <button
                type="button"
                onClick={() => setLatestEval(null)}
                className="shrink-0 px-3 py-1.5 text-sm rounded-lg bg-teal-900/80 hover:bg-teal-800 text-teal-200 border border-teal-600 transition"
              >
                {String(t('reports.dismissEval'))}
              </button>
            </div>
            <p className="text-teal-400 text-xs sm:text-sm mb-3">{String(t('reports.latestEvalNote'))}</p>
            <pre className="text-teal-100 text-xs sm:text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-[min(55vh,520px)] overflow-y-auto border border-teal-800/80 rounded-xl p-4 bg-teal-950/50">
              {latestEval.body}
            </pre>
          </div>
        )}

        {user && reports.length > 0 && (
          <div className="no-print mb-6 flex flex-wrap items-end gap-4 p-4 bg-teal-900/40 border border-teal-700/50 rounded-2xl">
            <span className="text-teal-400 text-sm font-medium">{String(t('reports.filterByDate'))}</span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-teal-500">{String(t('reports.dateFrom'))}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg bg-teal-800 border border-teal-600 px-3 py-2 text-teal-100"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-teal-500">{String(t('reports.dateTo'))}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg bg-teal-800 border border-teal-600 px-3 py-2 text-teal-100"
              />
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded-xl text-sm font-medium transition"
              >
                {String(t('reports.exportCSV'))}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded-xl text-sm font-medium transition"
              >
                {String(t('reports.print'))}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {reports.length === 0 && ready && user && (
            <p className="text-teal-500">{String(t('reports.noReports'))}</p>
          )}
          {reports.map((r) => (
            <div
              key={r.ReportID}
              className="bg-teal-900/60 border border-teal-700 rounded-2xl p-4 sm:p-6"
            >
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <span className="text-teal-400">{r.Date} — {r.StartTime}</span>
                <span className="text-teal-300 font-medium">{r.CourseName} ({r.Type})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-teal-500">{String(t('reports.accuracy'))}</p>
                  <p className="text-teal-200 font-bold">{r.AccuracyScore != null ? `${r.AccuracyScore}%` : '—'}</p>
                </div>
                <div>
                  <p className="text-teal-500">{String(t('reports.speed'))}</p>
                  <p className="text-teal-200 font-bold">{r.SpeedScore != null ? String(r.SpeedScore) : '—'}</p>
                </div>
                <div>
                  <p className="text-teal-500">{String(t('reports.steps'))}</p>
                  <p className="text-teal-200 font-bold">{r.StepsCompleted ?? 0} / {r.TotalSteps ?? 13}</p>
                </div>
                <div>
                  <p className="text-teal-500">{String(t('reports.duration'))}</p>
                  <p className="text-teal-200 font-bold">{r.DurationSeconds ?? '—'}</p>
                </div>
              </div>
              {r.Comments && <p className="text-teal-400 text-sm mt-2">{r.Comments}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
