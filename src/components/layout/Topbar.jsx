import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import Icon from '../icons/Icon';
import Button from '../ui/Button';
import './layout.css';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

export default function Topbar() {
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api
      .get(`/notifications?userId=${user.id}&_sort=createdAt&_order=desc`)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notifications
      .filter((n) => !n.read)
      .forEach((n) => api.patch(`/notifications/${n.id}`, { read: true }).catch(() => {}));
  };

  return (
    <header className="gr-topbar">
      <button className="gr-topbar__logo" onClick={() => navigate('?page=dashboard')}>
        <span className="gr-sidebar__logo-mark"><Icon name="spark" size={18} /></span>
        <span className="gr-sidebar__logo-text">GuardrAil</span>
      </button>

      <div className="gr-topbar__bell-wrap" ref={panelRef}>
        <Button
          variant="icon"
          aria-label="알림"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) markAllRead();
          }}
        >
          <Icon name="bell" size={18} />
        </Button>
        {unreadCount > 0 && <span className="gr-topbar__dot" />}

        {open && (
          <div className="gr-notif-panel">
            <div className="gr-notif-panel__title text-heading-md">알림</div>
            {notifications.length === 0 ? (
              <div className="ui-empty">
                <Icon name="bell" size={22} />
                <span className="text-body-sm">알림이 없습니다</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="gr-notif-item">
                  <span className={`gr-notif-item__dot ${n.read ? 'gr-notif-item__dot--read' : ''}`} />
                  <div>
                    <div className="text-body-sm">{n.message}</div>
                    <div className="text-caption-sm">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Button
        variant="icon"
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        onClick={toggleTheme}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </Button>
    </header>
  );
}
