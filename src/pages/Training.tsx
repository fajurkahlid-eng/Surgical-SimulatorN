import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import DashboardNav from '../components/DashboardNav';

const DEFAULT_COURSE_ID = 1;
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export default function Training(): JSX.Element {
  const { user } = useAuth();
  const { ready } = useDb();
  const { t } = useLang();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');

  async function openSimulator(): Promise<void> {
    if (!user) {
      navigate('/login');
      return;
    }
    const displayName =
      (user.name && user.name.trim()) || user.email?.trim() || 'Trainee';
    const params = new URLSearchParams({
      courseId: String(DEFAULT_COURSE_ID),
      type: 'VR',
      traineeName: displayName,
      difficulty,
    });
    if (ready) {
      try {
        const { sessionId } = await api.createSession(DEFAULT_COURSE_ID, difficulty);
        params.set('sessionId', String(sessionId));
        params.set('traineeId', String(user.traineeId));
      } catch (err) {
        console.error('Failed to create session, opening in demo mode:', err);
      }
    }
    window.location.href = `/surgical-sim/index.html?${params}`;
  }

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <DashboardNav />
      <div className="flex-1 container-page max-w-2xl py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{String(t('simulator.title'))}</h1>
          <p className="text-teal-400 mt-1">{String(t('simulator.subtitle'))}</p>
        </header>

        {!user && (
          <div className="mb-6 p-4 bg-teal-800/50 border border-teal-600 rounded-xl text-teal-200 text-sm">
            {String(t('simulator.loginHint'))} <Link to="/login" className="text-teal-400 underline hover:text-teal-300">{String(t('simulator.loginLink'))}</Link> {String(t('simulator.loginHintEnd'))}
          </div>
        )}

        <div className="bg-teal-900/60 border border-teal-700 rounded-2xl p-5 sm:p-8">
          <p className="text-teal-300 mb-6 text-center">
            {String(t('simulator.cardDesc'))}
          </p>
          <div className="mb-6">
            <label className="block text-teal-300 text-sm mb-2">{String(t('simulator.difficulty'))}</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full px-4 py-3 bg-teal-800 border border-teal-600 rounded-xl text-teal-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="beginner">{String(t('simulator.difficultyBeginner'))}</option>
              <option value="intermediate">{String(t('simulator.difficultyIntermediate'))}</option>
              <option value="advanced">{String(t('simulator.difficultyAdvanced'))}</option>
            </select>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openSimulator}
              className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold rounded-xl transition text-lg"
            >
              {String(t('simulator.btnOpen'))}
            </button>
          </div>
        </div>

        {!user && (
          <p className="mt-6 text-center">
            <a href="/surgical-sim/index.html" className="text-teal-400 hover:text-teal-300 underline text-sm">
              Try simulator without login (demo mode)
            </a>
          </p>
        )}
        <p className="mt-8 text-teal-500 text-sm text-center">{String(t('simulator.footerNote'))}</p>
      </div>
    </div>
  );
}
