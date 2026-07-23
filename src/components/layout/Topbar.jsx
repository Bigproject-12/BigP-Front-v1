import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { TOKEN_KEY } from '../../lib/api';
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

const NOTIFICATION_API = 'http://localhost:8081/api/notification';

export default function Topbar() {
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}`,
  });

  const seenIdsRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const showToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id ));
    }, 4000);
  }

  const fetchNotifications = () => {
    if (!user) return;
    fetch(NOTIFICATION_API, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (seenIdsRef.current) {
          list.forEach((n) => {
            if (n.type === 'ANALYSIS_COMPLETE' && !seenIdsRef.current.has(n.notificationId)) {
              showToast(n.message);
            }
          });
        }
        seenIdsRef.current = new Set(list.map((n) => n.notificationId));
        setNotifications(list);
      })
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 5000);
    return () => clearInterval(intervalId);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClickOutside = (e) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const deleteOne = async (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    try {
      await fetch(`${NOTIFICATION_API}/${notificationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch {
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    try {
      await fetch(NOTIFICATION_API, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (n) => {
    setOpen(false);
    setNotifications((prev) =>
      prev.map((item) => (item.notificationId === n.notificationId ? {
         ...item, read: true } : item)),
    );
    fetch(`${NOTIFICATION_API}/${n.notificationId}/read`, 
      { method: 'PATCH', headers: authHeaders() }).catch(() => {});

      if (n.type === 'ANNOUNCEMENT' && n.boardId) {
        navigate(`?page=board&postId=${n.boardId}`);
      } else if (n.type === 'ANALYSIS_COMPLETE' && n.analysisId) {
        navigate(`/Analyze?analysisId=${n.analysisId}`);
      }
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
          onClick={() => (open ? setOpen(false) : setOpen(true))}
        >
          <Icon name="bell" size={18} />
        </Button>
        {unreadCount > 0 && (
          <span className="gr-topbar__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}

        {open && (
          <div className="gr-notif-panel">
            <div className="gr-notif-panel__header">
              <span className="gr-notif-panel__title text-heading-md">알림</span>
              {notifications.length > 0 && (
                <button className="gr-notif-panel__clear" onClick={clearAll}>
                  모두 지우기
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="ui-empty">
                <Icon name="bell" size={22} />
                <span className="text-body-sm">알림이 없습니다</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notificationId}
                  className={`gr-notif-item ${n.read ? 'gr-notif-item--read' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className={`gr-notif-item__dot ${n.read ? 'gr-notif-item__dot--read' : ''}`} />
                  <div className="gr-notif-item__body">
                    <div className="text-body-sm">{n.message}</div>
                    <div className="text-caption-sm">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button
                    className="gr-notif-item__delete"
                    aria-label="알림 삭제"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOne(n.notificationId);
                    }}
                  >
                    <Icon name="close" size={14} />
                  </button>
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
    
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast-item">
            <Icon name="check" size={16} className="toast-item__icon" />
            <span className="text-body-sm">{t.message}</span>
          </div>
        ))}
      </div>
    </header>
  );
}