import { useRouter } from '../../router/RouterContext';
import { useAuth } from '../../context/AuthContext';
import Icon from '../icons/Icon';
import './layout.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'HOME', icon: 'home', to: '?page=dashboard' },
  { key: 'myspace', label: 'My Space', icon: 'spark', to: '?page=myspace' },
  { key: 'analyze', label: '코드 분석', icon: 'code', to: '/Analyze' },
  { key: 'repolist', label: 'Repository 목록', icon: 'repo', to: '?page=repolist' },
  { key: 'board', label: '게시판', icon: 'board', to: '?page=board' },
];

export default function Sidebar() {
  const { page, navigate } = useRouter();
  const { logout } = useAuth();

  const isActive = (item) => {
    if (item.key === 'analyze') return page === 'analyze';
    if (item.key === 'repolist') return page === 'repolist' || page === 'repo-detail';
    return page === item.key;
  };

  const handleLogout = () => {
    logout();
    navigate('?page=login');
  };

  return (
    <aside className="gr-sidebar">
      <div className="gr-sidebar__logo">
        <span className="gr-sidebar__logo-mark">
          <Icon name="spark" size={18} />
        </span>
        <span className="gr-sidebar__logo-text">GuardrAil</span>
      </div>

      <nav className="gr-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`gr-nav-item ${isActive(item) ? 'gr-nav-item--active' : ''}`}
            onClick={() => navigate(item.to)}
          >
            <span className="gr-nav-item__icon">
              <Icon name={item.icon} size={18} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
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
