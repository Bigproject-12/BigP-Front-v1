import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchOrgRepos, GITHUB_TOKEN_KEY, GITHUB_ORG_KEY } from '../lib/github';

const RepoContext = createContext(null);

export function RepoProvider({ children }) {
  const { user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  //const isGithubLinked = Boolean(
  //  localStorage.getItem(GITHUB_TOKEN_KEY) && localStorage.getItem(GITHUB_ORG_KEY)
  //);//이 부분이 문제로 사료됨


  /*
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
  */

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
    if (!user) { 
      setRepos([]); 
      return; 
    }
    loadRepos();
    //사용자가 로그인 상태라면 로컬스토리지 검사 없이 바로 백엔드에서 리포지토리를 불러옴
  }, [user?.id, loadRepos]);

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
