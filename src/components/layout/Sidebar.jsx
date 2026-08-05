import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import Icon from '../icons/Icon';
import './layout.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'HOME', icon: 'home', to: '?page=dashboard' },
  { key: 'myspace', label: 'My Space', icon: 'spark', to: '?page=myspace' },
  { key: 'analyze', label: '코드 분석', icon: 'code', to: '/Analyze' },
  { key: 'repolist', label: 'Repository 목록', icon: 'repo', to: '?page=repolist' },
  { key: 'board', label: '게시판', icon: 'board', to: '?page=board' },
  { key: 'members', label: '회원 관리', icon: 'user', to: '?page=members', adminOnly: true },
];

const NAV_ITEM_MAP = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]));
const DEFAULT_ORDER = NAV_ITEMS.map((item) => item.key);

function orderStorageKey(userId) {
  return `GuardrAil-sidebar-order:${userId}`;
}

function readStoredOrder(userId) {
  try {
    const raw = localStorage.getItem(orderStorageKey(userId));
    const stored = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(stored)) return DEFAULT_ORDER;
    const known = stored.filter((key) => NAV_ITEM_MAP[key]);
    const missing = DEFAULT_ORDER.filter((key) => !known.includes(key));
    return [...known, ...missing];
  } catch {
    return DEFAULT_ORDER;
  }
}

export default function Sidebar() {
  const { page, params, navigate } = useRouter();
  const { logout, user } = useAuth();
  const { favorites } = useFavorites();
  const [favOpen, setFavOpen] = useState(true);
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [draggedKey, setDraggedKey] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const activeRepoId = params.get('repoId');

  const visibleOrder = order.filter((key) => {
    const item = NAV_ITEM_MAP[key];
    if (!item) return false;
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    return true;
  });

  useEffect(() => {
    setOrder(readStoredOrder(user?.id ?? 'anon'));
  }, [user?.id]);

  const isActive = (item) => {
    if (item.key === 'analyze') return page === 'analyze';
    if (item.key === 'repolist') return page === 'repolist' || page === 'repo-detail' || page === 'push-tab';
    return page === item.key;
  };

  const handleLogout = () => {
    logout();
    navigate('?page=login');
  };

  const handleDragStart = (key) => {
    setDraggedKey(key);
  };

  const handleDragOver = (e, overKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === overKey) return;
    setOrder((prev) => {
      const from = prev.indexOf(draggedKey);
      const to = prev.indexOf(overKey);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedKey);
      return next;
    });
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDraggedKey(null);
      setOrder((current) => {
        try {
          localStorage.setItem(orderStorageKey(user?.id ?? 'anon'), JSON.stringify(current));
        } catch {
          /* ignore quota errors */
        }
        return current;
      });
    },
    [user?.id],
  );

  const handleDragEnd = () => {
    setDraggedKey(null);
  };

  return (
    <aside className={`gr-sidebar ${!isExpanded ? 'gr-sidebar--collapsed' : ''}`}>
      <div className="gr-sidebar__header">
        <button
          className="gr-sidebar__toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="사이드바 토글"
        >
          <Icon name={isExpanded ? 'chevronLeft' : 'chevronRight'} size={16} />
        </button>
      </div>

      <nav className="gr-sidebar__nav">
        {visibleOrder.map((key) => {
          const item = NAV_ITEM_MAP[key];
          if (!item) return null;
          const isRepoList = item.key === 'repolist';

          return (
            <div key={item.key}>
              <div
                className={`gr-nav-row ${draggedKey === item.key ? 'gr-nav-row--dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(item.key)}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                <span className="gr-nav-row__handle" aria-hidden="true">
                  <Icon name="grip" size={14} strokeWidth={3} />
                </span>
                <button
                  className={`gr-nav-item ${isActive(item) ? 'gr-nav-item--active' : ''}`}
                  onClick={() => navigate(item.to)}
                >
                  <span className="gr-nav-item__icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span>{item.label}</span>
                </button>
                {isRepoList && isExpanded && (
                  <button
                    type="button"
                    className="gr-nav-row__chevron-btn"
                    onClick={() => setFavOpen((v) => !v)}
                    aria-expanded={favOpen}
                    aria-label="즐겨찾기 Repository 목록"
                  >
                    <Icon
                      name="chevronDown"
                      size={14}
                      className={`gr-nav-item__chevron ${favOpen ? 'gr-nav-item__chevron--open' : ''}`}
                    />
                  </button>
                )}
              </div>

              {/* 사이드바가 열려있고, Repository 목록이고, 팝업이 열렸을 때만 렌더링 */}
              {isExpanded && isRepoList && favOpen && (
                <div className="gr-fav-dropdown">
                  {favorites.length === 0 ? (
                    <div className="gr-fav-dropdown__empty text-caption-md">
                      Repository 목록에서 별 아이콘을 눌러 즐겨찾기를 추가하세요.
                    </div>
                  ) : (
                    favorites.map((repo) => (
                      <button
                        key={repo.id}
                        className={`gr-fav-dropdown__item ${
                          (page === 'repo-detail' || page === 'push-tab') && activeRepoId === String(repo.id)
                            ? 'gr-fav-dropdown__item--active'
                            : ''
                        }`}
                        onClick={() => navigate(`?page=repo-detail&repoId=${repo.id}`)}
                      >
                        <Icon name="repo" size={14} />
                        <span>{repo.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="gr-sidebar__footer">
        <button
          className={`gr-nav-item ${page === 'mypage' ? 'gr-nav-item--active' : ''}`}
          onClick={() => navigate('?page=mypage')}
        >
          <span className="gr-nav-item__icon">
            <Icon name="user" size={18} />
          </span>
          <span>계정</span>
        </button>
        <button className="gr-nav-item" onClick={handleLogout}>
          <span className="gr-nav-item__icon">
            <Icon name="logout" size={18} />
          </span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
