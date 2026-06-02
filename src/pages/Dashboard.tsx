import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import { useEffect, useState } from 'react';
import DashboardNav from '../components/DashboardNav';

export default function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const { ready } = useDb();
  const { t } = useLang();
  const [stats, setStats] = useState<{
    sessions: number;
    avgAccuracy: number;
    lastSession: { date: string; accuracy: number | null; duration: number | null } | null;
    chartData: { AccuracyScore: number | null; DurationSeconds: number | null; Date: string }[];
  }>({
    sessions: 0,
    avgAccuracy: 0,
    lastSession: null,
    chartData: [],
  });

  useEffect(() => {
    if (!ready || !user) return;
    api
      .getStats(user.traineeId)
      .then(setStats)
      .catch(console.error);
  }, [ready, user]);

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <DashboardNav />
      <div className="flex-1 container-page py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{String(t('dashboard.title'))}</h1>
          <p className="text-teal-400 mt-1 text-sm sm:text-base">{String(t('dashboard.subtitle'))} {user?.name}</p>
          <p className="text-teal-500 mt-1 text-xs">{String(t('dashboard.loginSaved'))}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-teal-900/60 border border-teal-700 rounded-2xl p-4 sm:p-6">
            <p className="text-teal-400 text-sm mb-1">{String(t('dashboard.sessions'))}</p>
            <p className="text-3xl font-bold text-teal-200">{stats.sessions}</p>
            <p className="text-teal-500 text-xs mt-1">{String(t('dashboard.sessionsHint'))}</p>
          </div>
          <div className="bg-teal-900/60 border border-teal-700 rounded-2xl p-4 sm:p-6">
            <p className="text-teal-400 text-sm mb-1">{String(t('dashboard.avgAccuracy'))}</p>
            <p className="text-3xl font-bold text-teal-200">{stats.avgAccuracy}%</p>
            <p className="text-teal-500 text-xs mt-1">{String(t('dashboard.accuracyHint'))}</p>
          </div>
          <div className="bg-teal-900/60 border border-teal-700 rounded-2xl p-4 sm:p-6">
            <p className="text-teal-400 text-sm mb-1">{String(t('dashboard.lastSession'))}</p>
            <p className="text-teal-200">
              {stats.lastSession
                ? `${stats.lastSession.date} — ${stats.lastSession.duration ?? 0} ${String(t('dashboard.seconds'))}${stats.lastSession.accuracy != null ? ` · ${stats.lastSession.accuracy}%` : ''}`
                : '—'}
            </p>
            <p className="text-teal-500 text-xs mt-1">{String(t('dashboard.lastSessionHint'))}</p>
          </div>
        </div>

        {stats.chartData.length > 0 && (
          <section className="bg-teal-900/30 border border-teal-700/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg font-bold text-teal-200 mb-4">{String(t('dashboard.chartTitle'))}</h2>
            <div className="flex items-end gap-2 sm:gap-3 h-32">
              {stats.chartData.map((r, i) => {
                const pct = r.AccuracyScore != null ? Math.min(100, Math.max(0, r.AccuracyScore)) : 0;
                const dateStr = String(r.Date ?? '');
                const label = dateStr.slice(5, 10) || dateStr.slice(0, 10);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex-1 flex flex-col justify-end rounded-t bg-teal-800/80" style={{ minHeight: 24 }}>
                      <div className="rounded-t bg-teal-500 transition-all" style={{ height: `${pct}%`, minHeight: pct > 0 ? 4 : 0 }} title={`${r.AccuracyScore ?? 0}%`} />
                    </div>
                    <span className="text-teal-500 text-[10px] sm:text-xs truncate w-full text-center">{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-teal-900/30 border border-teal-700/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg font-bold text-teal-200 mb-3">{String(t('dashboard.quickActions'))}</h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/training" className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold rounded-xl transition">
              {String(t('dashboard.btnNewTraining'))}
            </Link>
            <Link to="/reports" className="px-6 py-3 bg-teal-800 hover:bg-teal-700 border border-teal-600 rounded-xl transition">
              {String(t('dashboard.btnReports'))}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
