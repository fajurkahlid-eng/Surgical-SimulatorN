import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import LangSwitcher from './LangSwitcher';

export default function AppNav(): JSX.Element {
  const { user, logout } = useAuth();
  const { t } = useLang();

  return (
    <nav className="no-print sticky top-0 z-50 border-b border-teal-700/50 bg-teal-950/95 backdrop-blur-sm">
      <div className="container-page app-nav-bar flex items-center justify-between gap-4 h-full">
        <Link
          to="/"
          className="text-teal-100 font-bold text-lg hover:text-white transition shrink-0 whitespace-nowrap"
        >
          {String(t('nav.brand'))}
        </Link>
        <ul className="nav-links flex items-center gap-4 text-sm shrink min-w-0">
          <li className="shrink-0"><Link to="/" className="text-teal-300 hover:text-teal-100 transition py-1 whitespace-nowrap">{String(t('nav.home'))}</Link></li>
          <li className="shrink-0"><Link to="/overview" className="text-teal-300 hover:text-teal-100 transition py-1 whitespace-nowrap">{String(t('nav.overview'))}</Link></li>
          <li className="shrink-0"><Link to="/training" className="text-teal-300 hover:text-teal-100 transition py-1 whitespace-nowrap">{String(t('nav.simulator'))}</Link></li>
          <li className="shrink-0"><Link to="/reports" className="text-teal-300 hover:text-teal-100 transition py-1 whitespace-nowrap">{String(t('nav.reports'))}</Link></li>
          <li className="shrink-0"><Link to="/implementation-report" className="text-teal-300 hover:text-teal-100 transition py-1 whitespace-nowrap">{String(t('nav.implementationReport'))}</Link></li>
          <li className="shrink-0 flex items-center"><LangSwitcher /></li>
          <li className="shrink-0 flex items-center min-w-[7rem] justify-end">
            {user ? (
              <span className="flex items-center gap-2">
                <span className="text-teal-500 text-sm truncate max-w-[7rem] sm:max-w-[10rem]" title={user.name}>{user.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 text-teal-400 hover:text-red-300 hover:bg-teal-800 rounded-lg transition text-sm whitespace-nowrap"
                >
                  {String(t('nav.logout'))}
                </button>
              </span>
            ) : (
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-teal-50 rounded-lg font-medium transition text-sm whitespace-nowrap"
              >
                {String(t('nav.login'))}
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
