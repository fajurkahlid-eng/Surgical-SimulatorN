import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav';
import { useLang } from '../context/LangContext';
import { TEAM } from '../i18n/strings';
import type { I18nItem } from '../types';

export default function Overview(): JSX.Element {
  const { t } = useLang();
  const objectives = t('overview.objectives');
  const features = t('overview.features');
  const tech = t('overview.tech');
  const methodology = t('overview.methodology');

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <AppNav />

      <main className="flex-1 container-page max-w-4xl py-8 sm:py-10">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{String(t('overview.title'))}</h1>
          <p className="text-teal-400 text-sm sm:text-base">{String(t('overview.subtitle'))}</p>
        </header>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.problemTitle'))}</h2>
          <p className="text-teal-300 leading-relaxed mb-3">{String(t('overview.problem1'))}</p>
          <p className="text-teal-300 leading-relaxed">{String(t('overview.problem2'))}</p>
        </section>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.objectivesTitle'))}</h2>
          <ul className="space-y-2">
            {Array.isArray(objectives) && objectives.map((obj, i) => (
              <li key={i} className="flex gap-2 text-teal-300">
                <span className="text-teal-500 shrink-0">•</span>
                <span>{String(obj)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.featuresTitle'))}</h2>
          <ul className="space-y-4">
            {Array.isArray(features) && (features as I18nItem[]).map((f, i) => (
              <li key={i} className="bg-teal-900/40 border border-teal-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-teal-100 mb-1">{f.title}</h3>
                <p className="text-teal-400 text-sm">{f.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.techTitle'))}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.isArray(tech) && (tech as I18nItem[]).map((item, i) => (
              <div key={i} className="bg-teal-900/40 border border-teal-700/60 rounded-xl p-4">
                <p className="text-teal-500 text-sm mb-1">{item.name}</p>
                <p className="text-teal-200 font-medium">{item.items}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.methodologyTitle'))}</h2>
          <ol className="space-y-2 list-decimal list-inside text-teal-300">
            {Array.isArray(methodology) && methodology.map((step, i) => (
              <li key={i}>{String(step)}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">{String(t('overview.teamTitle'))}</h2>
          <ul className="grid gap-2">
            {TEAM.map((m) => (
              <li key={m.id} className="flex justify-between items-center py-2 border-b border-teal-800/50 text-teal-200">
                <span>{m.name}</span>
                <span className="text-teal-500 font-mono text-sm">{m.id}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-4 pt-6">
          <Link to="/training" className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold rounded-xl transition">
            {String(t('overview.btnTrySimulator'))}
          </Link>
          <Link to="/" className="px-6 py-3 bg-teal-800 hover:bg-teal-700 border border-teal-600 rounded-xl transition">
            {String(t('overview.btnBackHome'))}
          </Link>
        </div>
      </main>

      <footer className="border-t border-teal-700/50 py-4 sm:py-6 mt-auto text-center text-teal-500 text-sm container-page">
        {String(t('overview.footer'))}
      </footer>
    </div>
  );
}
