import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav';
import { useLang } from '../context/LangContext';
import { TEAM } from '../i18n/strings';

export default function Landing(): JSX.Element {
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950 via-teal-900 to-teal-950 text-teal-50 flex flex-col">
      <header className="border-b border-teal-700/50">
        <div className="container-page py-2 sm:py-3">
          <p className="text-teal-400 text-xs sm:text-sm">College of Computer Science and Engineering — Students Projects Committee</p>
        </div>
        <AppNav />
      </header>

      <main className="flex-1 container-page py-8 sm:py-12">
        <section className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 max-w-3xl mx-auto leading-tight">
            {String(t('landing.title'))}
          </h1>
          <p className="text-teal-200 text-base sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-1">
            {String(t('landing.subtitle'))}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center min-h-[2.75rem] px-6 sm:px-8 py-3 sm:py-4 bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold rounded-xl shadow-lg transition"
            >
              {String(t('landing.btnLogin'))}
            </Link>
            <a
              href="/surgical-sim/index.html"
              className="inline-flex items-center justify-center min-h-[2.75rem] px-6 sm:px-8 py-3 sm:py-4 bg-teal-800 hover:bg-teal-700 text-teal-100 font-semibold rounded-xl border border-teal-600 transition"
            >
              {String(t('landing.btnSimulator'))}
            </a>
            <Link
              to="/overview"
              className="inline-flex items-center justify-center min-h-[2.75rem] px-6 sm:px-8 py-3 sm:py-4 bg-teal-900/80 hover:bg-teal-800 text-teal-200 font-semibold rounded-xl border border-teal-600 transition"
            >
              {String(t('landing.btnOverview'))}
            </Link>
          </div>
        </section>

        <section className="mb-12 sm:mb-16 bg-teal-900/30 border border-teal-700/50 rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-teal-100 mb-4">{String(t('landing.overviewTitle'))}</h2>
          <p className="text-teal-300 leading-relaxed mb-6">
            {String(t('landing.overviewBody'))}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-teal-800/50 rounded-xl p-4 border border-teal-700/50">
              <p className="text-teal-500 text-sm mb-1">{String(t('landing.cardVR'))}</p>
              <p className="text-teal-200 text-sm sm:text-base">{String(t('landing.cardVRDesc'))}</p>
            </div>
            <div className="bg-teal-800/50 rounded-xl p-4 border border-teal-700/50">
              <p className="text-teal-500 text-sm mb-1">{String(t('landing.cardReports'))}</p>
              <p className="text-teal-200 text-sm sm:text-base">{String(t('landing.cardReportsDesc'))}</p>
            </div>
          </div>
          <Link to="/overview" className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1">
            {String(t('landing.readMore'))}
          </Link>
        </section>

        <section className="mb-10 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-4">{String(t('landing.teamTitle'))}</h2>
          <ul className="grid gap-0 text-teal-100 bg-teal-900/20 border border-teal-700/50 rounded-2xl overflow-hidden">
            {TEAM.map((m) => (
              <li key={m.id} className="flex justify-between items-center gap-4 py-3 px-4 sm:px-6 border-b border-teal-800/50 last:border-b-0">
                <span className="text-sm sm:text-base truncate">{m.name}</span>
                <span className="text-teal-400 font-mono text-xs sm:text-sm shrink-0">{m.id}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-teal-700/50 py-4 sm:py-6">
        <div className="container-page flex flex-wrap items-center justify-between gap-4">
          <span className="text-teal-500 text-xs sm:text-sm">{String(t('landing.footerTagline'))}</span>
          <div className="flex gap-4 sm:gap-6 text-sm">
            <Link to="/overview" className="text-teal-500 hover:text-teal-400 transition">{String(t('landing.footerOverview'))}</Link>
            <Link to="/training" className="text-teal-500 hover:text-teal-400 transition">{String(t('landing.footerSimulator'))}</Link>
            <Link to="/login" className="text-teal-500 hover:text-teal-400 transition">{String(t('landing.footerLogin'))}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
