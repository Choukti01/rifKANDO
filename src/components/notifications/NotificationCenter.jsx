import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const NotificationCenter = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const response = await api.get('/notifications', { params: { limit: 20 } });
      setItems(response.data.notifications || []);
      setUnreadCount(Number(response.data.unreadCount || 0));
    } catch {
      // Notification delivery is non-critical: retain the current UI and retry
      // on the next poll rather than interrupting the rest of the marketplace.
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const kickoff = window.setTimeout(() => void loadNotifications({ quiet: true }), 0);
    const interval = window.setInterval(() => void loadNotifications({ quiet: true }), 45_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    const kickoff = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 60_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Keep the unread items visible so the action can safely be retried.
    }
  };

  const openNotification = async (item) => {
    setOpen(false);
    if (!item.read_at) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry)));
      setUnreadCount((count) => Math.max(0, count - 1));
      void api.patch(`/notifications/${item.id}/read`).catch(() => void loadNotifications({ quiet: true }));
    }
    if (item.href) navigate(item.href);
  };

  const relativeTimeForLocale = (value) => {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp) || currentTime === null) return '';
    let amount = Math.round((timestamp - currentTime) / 1000);
    let unit = 'second';
    for (const [divisor, nextUnit] of [[60, 'minute'], [60, 'hour'], [24, 'day'], [7, 'week'], [4.345, 'month'], [12, 'year']]) {
      if (Math.abs(amount) < divisor) break;
      amount = Math.round(amount / divisor);
      unit = nextUnit;
    }
    return new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(amount, unit);
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button type="button" className="nav-icon notification-trigger" aria-label={unreadCount ? t('notifications.unread', { count: unreadCount }) : t('notifications.label')} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((value) => !value); if (!open) void loadNotifications(); }}>
        <BellIcon className="icon" />
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-panel" aria-label={t('notifications.label')} role="dialog">
          <header className="notification-panel-header">
            <div><h2>{t('notifications.label')}</h2><p>{unreadCount ? t('notifications.unread', { count: unreadCount }) : t('notifications.caughtUp')}</p></div>
            {unreadCount > 0 && <button type="button" className="notification-read-all" onClick={markAllRead}><CheckIcon aria-hidden="true" /> {t('notifications.markAllRead')}</button>}
          </header>
          <div className="notification-list" aria-live="polite">
            {loading && <p className="notification-empty">{t('notifications.loading')}</p>}
            {!loading && !items.length && <p className="notification-empty">{t('notifications.empty')}</p>}
            {!loading && items.map((item) => (
              <button key={item.id} type="button" className={`notification-item ${item.read_at ? 'is-read' : 'is-unread'}`} onClick={() => void openNotification(item)}>
                <span className="notification-item-copy"><strong>{item.title}</strong><span>{item.body}</span><time dateTime={item.created_at}>{relativeTimeForLocale(item.created_at)}</time></span>
                {!item.read_at && <span className="notification-unread-dot" aria-label={t('notifications.unreadItem')} />}
              </button>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .notification-center { position: relative; }
        .notification-trigger { width: 2.25rem; height: 2.25rem; justify-content: center; border-radius: .7rem; }
        .notification-trigger:hover { background: rgba(47,145,219,.09); }
        .notification-badge { position:absolute; top:-.3rem; right:-.35rem; min-width:1.1rem; height:1.1rem; padding:0 .22rem; display:grid; place-items:center; border-radius:999px; background:#1679c4; color:#fff; border:2px solid #fff; font-size:.62rem; font-weight:800; line-height:1; }
        .notification-panel { position:absolute; top:calc(100% + .72rem); inset-inline-end:-.65rem; width:min(25rem,calc(100vw - 1.5rem)); overflow:hidden; border:1px solid rgba(18,48,76,.12); border-radius:1rem; background:rgba(255,255,255,.98); box-shadow:0 18px 48px rgba(10,35,61,.18); backdrop-filter:blur(18px); z-index:1100; animation:notification-enter 160ms ease-out; }
        @keyframes notification-enter { from { opacity:0; transform:translateY(-.35rem) scale(.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        .notification-panel-header { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:1rem; border-bottom:1px solid #eef3f7; }
        .notification-panel-header h2 { margin:0; color:#102a43; font-size:.96rem; font-weight:800; }
        .notification-panel-header p { margin:.2rem 0 0; color:#6a7a89; font-size:.75rem; }
        .notification-read-all { display:inline-flex; align-items:center; gap:.32rem; border:0; background:transparent; color:#1679c4; font-size:.73rem; font-weight:750; cursor:pointer; white-space:nowrap; }
        .notification-read-all svg { width:1rem; height:1rem; }
        .notification-read-all:hover { color:#0e5d9f; }
        .notification-list { max-height:min(28rem,65vh); overflow-y:auto; overscroll-behavior:contain; }
        .notification-item { width:100%; display:flex; align-items:flex-start; gap:.65rem; padding:.9rem 1rem; text-align:start; border:0; border-bottom:1px solid #f0f4f7; background:#fff; cursor:pointer; transition:background 160ms ease; }
        .notification-item:hover { background:#f4f9fd; }
        .notification-item.is-unread { background:#eff8ff; }
        .notification-item-copy { min-width:0; display:grid; gap:.22rem; }
        .notification-item-copy strong { color:#17324d; font-size:.82rem; line-height:1.25; }
        .notification-item-copy span { color:#566675; font-size:.76rem; line-height:1.38; }
        .notification-item-copy time { color:#82909d; font-size:.68rem; }
        .notification-unread-dot { flex:0 0 auto; width:.48rem; height:.48rem; margin-top:.25rem; border-radius:999px; background:#1679c4; }
        .notification-empty { margin:0; padding:1.35rem 1rem; color:#70808f; font-size:.79rem; line-height:1.5; text-align:center; }
        @media (max-width:767px) { .notification-panel { position:fixed; top:4.6rem; inset-inline-end:.75rem; } }
      `}</style>
    </div>
  );
};

export default NotificationCenter;
