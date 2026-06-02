import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode, useEffect, useState, useRef } from 'react';
import { LangProvider } from './context/LangContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DbProvider } from './context/DbContext';
import Landing from './pages/Landing';
import Overview from './pages/Overview';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';
import Reports from './pages/Reports';
import ImplementationReport from './pages/ImplementationReport';
import InstructorDashboard from './pages/InstructorDashboard';

function PrivateRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, token } = useAuth();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function InstructorRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, token } = useAuth();
  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'instructor') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function NavProgress(): JSX.Element {
  const location = useLocation();
  const [navigating, setNavigating] = useState(false);
  const prev = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prev.current) {
      prev.current = location.pathname;
      setNavigating(true);
      const t = setTimeout(() => setNavigating(false), 280);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  if (!navigating) return <></>;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-teal-400 animate-nav-progress"
      role="progressbar"
      aria-hidden="true"
    />
  );
}

export default function App(): JSX.Element {
  return (
    <LangProvider>
      <DbProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NavProgress />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/login" element={<Login />} />
              <Route path="/training" element={<Training />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/implementation-report" element={<ImplementationReport />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/instructor-dashboard"
                element={
                  <InstructorRoute>
                    <InstructorDashboard />
                  </InstructorRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DbProvider>
    </LangProvider>
  );
}
