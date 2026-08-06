import { useEffect } from 'react';
import { RouterProvider, useRouter } from './router/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { RepoProvider } from './context/RepoContext';
import { ConfirmProvider } from './context/ConfirmContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MySpacePage from './pages/MySpacePage';
import AnalyzePage from './pages/AnalyzePage';
import RepoListPage from './pages/RepoListPage';
import RepoDetailPage from './pages/RepoDetailPage';
import MyPage from './pages/MyPage';
import BoardPage from './pages/BoardPage';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import AnalysisDetailPage from './pages/AnalysisDetailPage';
import PushPage from './pages/PushPage';

const PAGES = {
  dashboard: DashboardPage,
  myspace: MySpacePage,
  analyze: AnalyzePage,
  'analysis-detail': AnalysisDetailPage,
  repolist: RepoListPage,
  'repo-detail': RepoDetailPage,
  'push-tab': PushPage,
  mypage: MyPage,
  board: BoardPage,
  members: MembersPage,
  'member-detail': MemberDetailPage,
};

const DEFAULT_AUTHED_PAGE = 'dashboard';

function AppRoutes() {
  const { page, navigate } = useRouter();
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (!user && page !== 'login') {
      navigate('?page=login', { replace: true });
      return;
    }
    if (user && (page === 'login' || !page)) {
      navigate(`?page=${DEFAULT_AUTHED_PAGE}`, { replace: true });
      return;
    }
    if (user && !PAGES[page]) {
      navigate(`?page=${DEFAULT_AUTHED_PAGE}`, { replace: true });
    }
  }, [page, user, initializing, navigate]);

  if (initializing) return null;

  if (!user) {
    return page === 'login' ? <LoginPage /> : null;
  }

  const PageComponent = PAGES[page];
  if (!PageComponent) return null;

  return (
    <AppLayout>
      <PageComponent />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <FavoritesProvider>
            <RepoProvider>
              <ConfirmProvider>
                <AppRoutes />
              </ConfirmProvider>
            </RepoProvider>
          </FavoritesProvider>
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
