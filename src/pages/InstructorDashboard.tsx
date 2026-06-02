import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import type { ReportRow } from '../api/client';
import DashboardNav from '../components/DashboardNav';

interface AdminReport extends ReportRow {
  TraineeID: number;
  TraineeName: string;
  TraineeEmail: string;
}

interface AdminTrainee {
  TraineeID: number;
  Name: string;
  Email: string;
  Specialty: string | null;
  PriorSimulationExperience: string | null;
  UnityUnrealExperience: string | null;
  Progress: number;
}

export default function InstructorDashboard(): JSX.Element {
  const { user } = useAuth();
  const { ready } = useDb();
  const { t } = useLang();
  const [trainees, setTrainees] = useState<AdminTrainee[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user || user.role !== 'instructor') return;
    setLoading(true);
    Promise.all([api.getAdminTrainees(), api.getAdminReports()])
      .then(([t, r]) => {
        setTrainees(t);
        setReports(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, user]);

  if (!user || user.role !== 'instructor') {
    return (
      <div className="min-h-screen bg-teal-950 text-teal-100 flex items-center justify-center">
        <p className="text-teal-400">{String(t('instructor.accessDenied'))}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <DashboardNav />
      <div className="flex-1 container-page py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{String(t('instructor.title'))}</h1>
          <p className="text-teal-400 mt-1">{String(t('instructor.subtitle'))} {user.name}</p>
        </header>

        {loading ? (
          <p className="text-teal-500">{String(t('instructor.loading'))}</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-bold text-teal-200 mb-4">{String(t('instructor.traineesTitle'))}</h2>
              <div className="bg-teal-900/60 border border-teal-700 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-teal-800/80 text-teal-300 text-left">
                      <th className="px-4 py-3">{String(t('instructor.traineeName'))}</th>
                      <th className="px-4 py-3">{String(t('instructor.traineeEmail'))}</th>
                      <th className="px-4 py-3">{String(t('login.specialty'))}</th>
                      <th className="px-4 py-3">{String(t('login.priorSimulation'))}</th>
                      <th className="px-4 py-3">{String(t('login.unityUnreal'))}</th>
                      <th className="px-4 py-3">{String(t('instructor.progress'))}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-teal-500 text-center">{String(t('instructor.noTrainees'))}</td></tr>
                    ) : (
                      trainees.map((tr) => (
                        <tr key={tr.TraineeID} className="border-t border-teal-700/50">
                          <td className="px-4 py-3 text-teal-200">{tr.Name}</td>
                          <td className="px-4 py-3 text-teal-400">{tr.Email}</td>
                          <td className="px-4 py-3 text-teal-400">{tr.Specialty ?? '—'}</td>
                          <td className="px-4 py-3 text-teal-400">{tr.PriorSimulationExperience ?? '—'}</td>
                          <td className="px-4 py-3 text-teal-400">{tr.UnityUnrealExperience ?? '—'}</td>
                          <td className="px-4 py-3 text-teal-300">{tr.Progress ?? 0}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-teal-200 mb-4">{String(t('instructor.reportsTitle'))}</h2>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <p className="text-teal-500">{String(t('instructor.noReports'))}</p>
                ) : (
                  reports.map((r) => (
                    <div
                      key={r.ReportID}
                      className="bg-teal-900/60 border border-teal-700 rounded-2xl p-4 sm:p-6"
                    >
                      <div className="flex flex-wrap justify-between gap-2 mb-3">
                        <span className="text-teal-400">{r.Date} — {r.StartTime}</span>
                        <span className="text-teal-300 font-medium">
                          {r.TraineeName} ({r.TraineeEmail}) — {r.CourseName} ({r.Type})
                        </span>
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
                          <p className="text-teal-200 font-bold">{r.StepsCompleted ?? 0} / {r.TotalSteps ?? 14}</p>
                        </div>
                        <div>
                          <p className="text-teal-500">{String(t('reports.duration'))}</p>
                          <p className="text-teal-200 font-bold">{r.DurationSeconds ?? '—'}</p>
                        </div>
                      </div>
                      {r.Comments && <p className="text-teal-400 text-sm mt-2">{r.Comments}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
