import api from '../lib/api';

export interface NotificationDto {
  id: string;
  userId: string;
  outboxMessageId?: string;
  channel: string; // 'InApp' | 'Email'
  title: string;
  body: string;
  deliveredAtUtc?: string | null;
  readAtUtc?: string | null;
  createdAtUtc: string;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * 1. Lấy danh sách thông báo của tài khoản người dùng
 */
export const getNotifications = async (unreadOnly = false): Promise<NotificationDto[]> => {
  const raw = await api.get(`/api/v2/notifications?unreadOnly=${unreadOnly}`);
  return unwrap<NotificationDto[]>(raw);
};

/**
 * 2. Đánh dấu thông báo là đã đọc
 */
export const markAsRead = async (notificationId: string): Promise<{ success: boolean; message?: string }> => {
  const raw = await api.post(`/api/v2/notifications/${notificationId}/read`);
  return unwrap<{ success: boolean; message?: string }>(raw);
};

/**
 * 3. (Staff/Admin) Giải phóng hàng đợi Outbox thành thông báo In-App ngay lập tức
 */
export const dispatchOutbox = async (
  batchSize = 50,
): Promise<{ dispatchedCount?: number; message?: string }> => {
  const raw = await api.post('/api/v2/admin/outbox/dispatch', { batchSize });
  return unwrap<{ dispatchedCount?: number; message?: string }>(raw);
};

export const notificationService = {
  getNotifications,
  markAsRead,
  dispatchOutbox,
};

export default notificationService;
