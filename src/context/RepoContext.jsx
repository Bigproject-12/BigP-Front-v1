import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchOrgRepos, GITHUB_TOKEN_KEY, GITHUB_ORG_KEY } from '../lib/github';

const RepoContext = createContext(null);

export function RepoProvider({ children }) {
  const { user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  const isGithubLinked = Boolean(
    localStorage.getItem(GITHUB_TOKEN_KEY) && localStorage.getItem(GITHUB_ORG_KEY)
  );

  const loadRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const data = await fetchOrgRepos();
      setRepos(data);
    } catch {
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { setRepos([]); return; }
    if (!isGithubLinked) return;
    let cancelled = false;
    setReposLoading(true);
    fetchOrgRepos()
      .then((data) => { if (!cancelled) setRepos(data); })
      .catch(() => { if (!cancelled) setRepos([]); })
      .finally(() => { if (!cancelled) setReposLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <RepoContext.Provider value={{ repos, reposLoading, refreshRepos: loadRepos }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepos() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error('useRepos must be used within RepoProvider');
  return ctx;
}
