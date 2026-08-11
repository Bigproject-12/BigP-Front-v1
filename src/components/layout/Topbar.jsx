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

function getNotifVariant(type) {
  if (type === 'ANALYSIS_FAILED') return 'failed';
  if (type === 'ANNOUNCEMENT') return 'announcement';
  return 'complete'; // ANALYSIS_COMPLETE 및 기본값
}

const NOTIFICATION_API = `${import.meta.env.VITE_API_BASE}/api/notification`;

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

  // 알림이 한꺼번에 여러 개 들어와도 화면 한쪽을 뒤덮지 않도록, 최근 N개만 토스트로 띄운다.
  // 밀려난 알림은 개수만 세어서 "나머지 N개의 알림도 확인하세요" 안내 토스트 하나로 합치고,
  // 그걸 누르면 알림 벨(드롭다운)이 열려 전체를 볼 수 있다.
  const MAX_VISIBLE_TOASTS = 3;
  // ui.css 의 .toast-item 페이드아웃(3.8s)과 맞춰야 "안 보이는데 남아있는" 상태가 안 생긴다.
  const TOAST_DURATION_MS = 4000;

  // items(보이는 토스트)와 overflow(밀려난 개수)를 한 state로 묶는다.
  // 따로 두면 setState 업데이터 안에서 다른 setState를 부르게 되는데,
  // StrictMode가 개발모드에서 업데이터를 두 번 실행해 중복 집계될 수 있어서 하나로 합침.
  const [toastState, setToastState] = useState({ items: [], overflow: 0 });

  const showToast = (message, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToastState((prev) => {
      const items = [...prev.items, { id, message, variant }];
      const dropped = Math.max(0, items.length - MAX_VISIBLE_TOASTS);
      return {
        items: items.slice(-MAX_VISIBLE_TOASTS),
        overflow: prev.overflow + dropped,
      };
    });
    setTimeout(() => {
      setToastState((prev) => ({
        ...prev,
        items: prev.items.filter((t) => t.id !== id),
      }));
    }, TOAST_DURATION_MS);
  }

  // 안내 토스트도 스스로 사라지게 한다. overflow가 늘 때마다 타이머가 새로 걸리므로,
  // 알림이 계속 들어오는 동안에는 유지되고 마지막 알림 후 TOAST_DURATION_MS 뒤에 없어진다.
  useEffect(() => {
    if (toastState.overflow === 0) return undefined;
    const timerId = setTimeout(
      () => setToastState((prev) => ({ ...prev, overflow: 0 })),
      TOAST_DURATION_MS,
    );
    return () => clearTimeout(timerId);
  }, [toastState.overflow]);

  const openAllNotifications = () => {
    setOpen(true);
    setToastState((prev) => ({ ...prev, overflow: 0 }));
  };

  const fetchNotifications = () => {
    if (!user) return;
    fetch(NOTIFICATION_API, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (seenIdsRef.current) {
          list.forEach((n) => {
            if (n.type === 'ANALYSIS_COMPLETE' && !seenIdsRef.current.has(n.notificationId)) {
              showToast(n.message, 'complete');
            }
            if (n.type === 'ANALYSIS_FAILED' && !seenIdsRef.current.has(n.notificationId)) {
              showToast(n.message, 'failed');
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
      const res = await fetch(`${NOTIFICATION_API}/${notificationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('알림 삭제에 실패했습니다.');
    } catch {
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    try {
      const res = await fetch(NOTIFICATION_API, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('알림 전체 삭제에 실패했습니다.');
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
        navigate(`/Analyze?analysisId=${n.analysisId}`); // 👈 이 부분을 수정
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
                  <span className={`gr-notif-item__dot gr-notif-item__dot--${getNotifVariant(n.type)} ${n.read ? 'gr-notif-item__dot--read' : ''}`} />
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
        {toastState.items.map((t) => (
          <div key={t.id} className={`toast-item toast-item--${t.variant}`}>
            <Icon name={t.variant === 'failed' ? 'close' : 'check'} size={16} className="toast-item__icon" />
            <span className="text-body-sm">{t.message}</span>
          </div>
        ))}
        {toastState.overflow > 0 && (
          // key에 개수를 넣어, 밀려난 알림이 추가될 때마다 다시 마운트되면서
          // 등장/사라짐 애니메이션이 처음부터 다시 돌게 한다.
          <div
            key={`toast-more-${toastState.overflow}`}
            className="toast-item toast-item--more"
            role="button"
            tabIndex={0}
            onClick={openAllNotifications}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAllNotifications();
              }
            }}
          >
            <Icon name="bell" size={16} className="toast-item__icon" />
            <span className="text-body-sm">
              나머지 {toastState.overflow}개의 알림도 확인하세요
            </span>
          </div>
        )}
      </div>
    </header>
  );
}