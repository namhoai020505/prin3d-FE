import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { clearAuthSession } from '../lib/auth';

const BROADCAST_CHANNEL_NAME = 'idea2model_security_channel';

export type SecurityBroadcastEvent =
  | { type: 'LOGOUT' }
  | { type: 'LOGIN'; userId?: string }
  | { type: 'SEAT_HOLD_CREATED'; showtimeId: string; tabId: string }
  | { type: 'BOOKING_COMPLETED'; bookingId: string; showtimeId: string };

const TAB_ID = Math.random().toString(36).substring(2, 9);

export const broadcastSecurityEvent = (event: SecurityBroadcastEvent) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch {
    // Ignore channel failure
  }
};

export const useMultiTabSecurity = (onShowtimeInvalidate?: (showtimeId: string) => void) => {
  const navigate = useNavigate();

  useEffect(() => {
    // BroadcastChannel Listener for Multi-Tab Security & Auth Sync (Bỏ localStorage để không rò rỉ session ẩn danh)
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SecurityBroadcastEvent>) => {
        const payload = event.data;
        if (!payload) return;

        if (payload.type === 'LOGOUT') {
          clearAuthSession();
          toast.warn('Tài khoản đã đăng xuất ở một tab khác.');
          navigate('/', { replace: true });
        } else if (payload.type === 'LOGIN') {
          toast.info('Tài khoản đã đăng nhập ở một tab khác.');
        } else if (payload.type === 'SEAT_HOLD_CREATED') {
          if (payload.tabId !== TAB_ID) {
            toast.info(
              'Phát hiện giữ đơn ở một tab khác. Đã khóa để tránh trùng lặp!',
              { autoClose: 3500 }
            );
            if (onShowtimeInvalidate) {
              onShowtimeInvalidate(payload.showtimeId);
            }
          }
        } else if (payload.type === 'BOOKING_COMPLETED') {
          toast.success('Đơn hàng đã được thanh toán ở cửa sổ khác!');
          if (onShowtimeInvalidate) {
            onShowtimeInvalidate(payload.showtimeId);
          }
        }
      };
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [navigate, onShowtimeInvalidate]);

  return { tabId: TAB_ID, broadcastSecurityEvent };
};
