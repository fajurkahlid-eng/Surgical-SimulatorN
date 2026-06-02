import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';

interface DbContextValue {
  ready: boolean;
  apiAvailable: boolean;
}

const DbContext = createContext<DbContextValue>({ ready: false, apiAvailable: false });

export function DbProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<DbContextValue>({ ready: false, apiAvailable: false });

  useEffect(() => {
    let mounted = true;
    api.health().then((ok) => {
      if (mounted) setState({ ready: true, apiAvailable: ok });
    });
    // Fallback: assume ready after 2s even if health fails (e.g. server starting)
    const t = setTimeout(() => {
      if (mounted) setState((s) => (s.ready ? s : { ...s, ready: true }));
    }, 2000);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  return <DbContext.Provider value={state}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  return useContext(DbContext);
}
