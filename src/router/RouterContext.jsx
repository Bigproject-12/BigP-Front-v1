import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const RouterContext = createContext(null);

function readLocation() {
  return { pathname: window.location.pathname, search: window.location.search };
}

/**
 * App-wide history-API router shared via context so that navigate() calls from
 * any component (sidebar, buttons, redirects) are immediately visible to every
 * other component reading the current route — a plain hook per-component would
 * desync since pushState doesn't fire 'popstate'.
 */
export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    // Query-string routes (?page=...) are always rooted at "/" — otherwise
    // navigating to one while on a path route like /Analyze would keep that
    // pathname and the page would never actually change.
    const url = to.startsWith('?') ? `/${to}` : to;
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
    setLocation(readLocation());
  }, []);

  const params = new URLSearchParams(location.search);
  const page = location.pathname === '/Analyze' ? 'analyze' : params.get('page');

  return (
    <RouterContext.Provider
      value={{ pathname: location.pathname, search: location.search, params, page, navigate }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
