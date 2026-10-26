import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  Loader2,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react';
import {
  notificationService,
  type NotificationDto,
} from '../services/notificationService';
import {
  AUTH_SESSION_EVENT,
  getAccessToken,
  getRoleFromAccessToken,
  isAdminRole,
  isManagerRole,
  isStaffRole,
} from '../lib/auth';

export interface NotificationBellV2Props {
  placement?: 'sidebar' | 'topbar';
}

export const NotificationBellV2: React.FC<NotificationBellV2Props> = ({
  placement = 'sidebar',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAccessToken()));

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync login status
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(Boolean(getAccessToken()));
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleAuthChange);
  }, []);

  // Fetch notifications
  const loadNotifications = async (silent = false) => {
    if (!getAccessToken()) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(false);
      setNotifications(data || []);
    } catch (err) {
      console.warn('Lỗi tải thông báo in-app:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Mount & 30s Polling
  useEffect(() => {
    if (!isLoggedIn) return;

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isLoggedIn) return null;

  const unreadCount = notifications.filter((n) => !n.readAtUtc).length;
  const userRole = getRoleFromAccessToken();
  const isManagement = isAdminRole(userRole) || isStaffRole(userRole) || isManagerRole(userRole);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAtUtc: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.warn('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadList = notifications.filter((n) => !n.readAtUtc);
    if (unreadList.length === 0) return;

    try {
      await Promise.all(unreadList.map((n) => notificationService.markAsRead(n.id)));
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAtUtc: n.readAtUtc || new Date().toISOString() }))
      );
    } catch (err) {
      console.warn('Lỗi đánh dấu tất cả đã đọc:', err);
    }
  };

  const handleDispatchOutbox = async () => {
    setIsDispatching(true);
    try {
      await notificationService.dispatchOutbox(50);
      await loadNotifications(true);
    } catch (err) {
      console.warn('Lỗi đồng bộ outbox:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'Vừa xong';
    try {
      const date = new Date(iso);
      return date.toLocaleString('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const popoverPositionClass =
    placement === 'sidebar'
      ? 'fixed left-[76px] md:left-[84px] bottom-4'
      : 'absolute right-0 top-full mt-2';

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-center transition-all cursor-pointer group ${
          placement === 'sidebar'
            ? 'w-9 h-9 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/15 hover:border-cyan-400/50 text-white/80 hover:text-cyan-300'
            : 'h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300'
        }`}
        title={`Thông báo hệ thống (${unreadCount} chưa đọc)`}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-cyan-400 animate-wiggle" />
        ) : (
          <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-black text-[10px] font-bold font-mono flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`${popoverPositionClass} w-80 sm:w-96 max-h-[82vh] bg-[#0c1017]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_35px_rgba(0,240,255,0.18)] backdrop-blur-2xl z-[70] flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150`}
        >
          {/* Popover Header */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Thông Báo Hệ Thống V2
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadNotifications()}
                disabled={isLoading}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Làm mới thông báo"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Sub-Bar */}
          <div className="px-3.5 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>

            {isManagement && (
              <button
                type="button"
                onClick={handleDispatchOutbox}
                disabled={isDispatching}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors font-medium cursor-pointer"
                title="Chạy giải phóng hàng đợi Outbox thành thông báo in-app ngay"
              >
                {isDispatching ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <Zap className="w-3 h-3 text-emerald-400" />
                )}
                <span>⚡ Đồng bộ Outbox</span>
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-white/5">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/50 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 space-y-1">
                <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="font-semibold text-white/60">Không có thông báo nào</p>
                <p className="text-[11px] text-white/40">Các thông báo về tiến trình in 3D sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const isUnread = !n.readAtUtc;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.id);
                    }}
                    className={`p-3.5 text-xs transition-colors cursor-pointer ${
                      isUnread
                        ? 'border-l-2 border-l-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30'
                        : 'hover:bg-white/[0.03] text-white/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h5 className={`font-bold line-clamp-1 ${isUnread ? 'text-white' : 'text-white/80'}`}>
                        {n.title}
                      </h5>
                      <span className="text-[10px] font-mono text-cyan-400/80 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatTime(n.createdAtUtc || n.deliveredAtUtc)}</span>
                      </span>
                    </div>
                    <p className="text-white/70 text-[11px] leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellV2;

