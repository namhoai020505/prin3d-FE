import api from '../lib/api';
import { clearAuthSession, getRefreshToken, isAdminRole, isStaffRole, setAuthSession } from '../lib/auth';
import { AI_CONSENT_POLICY_VERSION, AI_CONSENT_PURPOSE } from '../lib/env';

export type CurrentUserDto = {
  id: string;
  email: string;
  fullName: string;
  role: 'cus' | 'staff' | 'admin' | 'disabled';
  freeTrialRemaining: number;
  purchasedRemaining: number;
  totalUsed: number;
  accountStatus?: string;
  emailVerified?: boolean;
  totalBalance?: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc?: string;
  accessExpires?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    accountStatus?: string;
    emailVerified?: boolean;
    freeTrialRemaining?: number;
    purchasedRemaining?: number;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
};

export interface VerifyEmailPayload {
  token: string; // Mã OTP 6 chữ số
  email?: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string; // Mã OTP 6 chữ số
  newPassword: string; // Tối thiểu 10 ký tự
  email?: string;
}

export interface ConsentPayload {
  purpose: string; // Mặc định: "AiModelProcessing"
  policyVersion: string; // Mặc định: "v1.0"
  granted: boolean;
}

export interface ConsentStatusDto {
  purpose: string;
  policyVersion: string;
  hasConsent: boolean;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

// 1. Đăng nhập
export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const raw = await api.post('/api/auth/login', input);
  const response = unwrap<AuthResponse>(raw);
  if (response?.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      fullName: response.user?.fullName || input.email.split('@')[0],
    });
  }
  return response;
};

// 2. Đăng ký tài khoản (Nhận userId, email và thông báo kiểm tra OTP)
export const register = async (
  input: RegisterInput,
): Promise<{ message: string; userId?: string; email?: string; accessToken?: string; refreshToken?: string }> => {
  const raw = await api.post('/api/auth/register', input);
  const response = unwrap<{ message: string; userId?: string; email?: string; accessToken?: string; refreshToken?: string }>(raw);
  if (response?.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      fullName: input.fullName,
    });
  }
  return response;
};

// 3. Xác thực Email bằng mã OTP 6 số (chỉ gửi token, tránh lỗi JsonUnmappedMemberHandling.Disallow)
export const verifyEmail = async (payload: VerifyEmailPayload): Promise<{ message: string }> => {
  const raw = await api.post('/api/auth/verify-email', { token: payload.token.trim() });
  return unwrap<{ message: string }>(raw);
};

// 4. Gửi lại mã OTP xác thực email
export const resendVerificationOtp = async (
  payload: ResendVerificationPayload,
): Promise<{ message: string }> => {
  const raw = await api.post('/api/auth/resend-verification', payload);
  return unwrap<{ message: string }>(raw);
};

// 5. Cấp mới token (Refresh Token Rotation)
export const refreshToken = async (refreshTokenParam?: string): Promise<AuthResponse> => {
  const tokenToUse = refreshTokenParam || getRefreshToken();
  const raw = await api.post('/api/auth/refresh', { refreshToken: tokenToUse });
  const response = unwrap<AuthResponse>(raw);
  if (response?.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || tokenToUse,
      fullName: response.user?.fullName,
    });
  }
  return response;
};

// 6. Đăng xuất phiên hiện tại (không truyền body)
export const logout = async (): Promise<{ message?: string }> => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Ignore network error on logout
  } finally {
    clearAuthSession();
  }
  return { message: 'Đăng xuất thành công.' };
};

// 7. Thu hồi toàn bộ phiên đăng nhập (Revoke all active sessions)
export const revokeAllSessions = async (): Promise<{ message: string }> => {
  const raw = await api.post('/api/auth/revoke-all');
  clearAuthSession();
  return unwrap<{ message: string }>(raw);
};

// 8. Quên mật khẩu - Yêu cầu gửi mã OTP đặt lại
export const forgotPassword = async (
  payload: ForgotPasswordPayload,
): Promise<{ message: string }> => {
  const raw = await api.post('/api/auth/forgot-password', payload);
  return unwrap<{ message: string }>(raw);
};

// 9. Đặt lại mật khẩu với mã OTP (Tối thiểu 10 ký tự, chỉ gửi token & newPassword)
export const resetPassword = async (
  payload: ResetPasswordPayload,
): Promise<{ message: string }> => {
  const raw = await api.post('/api/auth/reset-password', {
    token: payload.token.trim(),
    newPassword: payload.newPassword,
  });
  return unwrap<{ message: string }>(raw);
};

// 10. Kiểm tra trạng thái Consent xử lý AI 3D
export const getConsent = async (
  purpose: string = AI_CONSENT_PURPOSE,
  policyVersion: string = AI_CONSENT_POLICY_VERSION,
): Promise<ConsentStatusDto> => {
  const raw = await api.get(`/api/auth/consent?purpose=${purpose}&policyVersion=${policyVersion}`);
  return unwrap<ConsentStatusDto>(raw);
};

// 11. Đồng ý hoặc thu hồi Consent
export const updateConsent = async (
  payload: ConsentPayload,
): Promise<{ message: string; purpose: string; policyVersion: string; granted: boolean }> => {
  const raw = await api.post('/api/auth/consent', payload);
  return unwrap<{ message: string; purpose: string; policyVersion: string; granted: boolean }>(raw);
};

// 12. Lấy thông tin cá nhân hiện tại
export const getMe = async (): Promise<CurrentUserDto> => {
  const raw = await api.get('/api/auth/me');
  const response = unwrap<Record<string, unknown>>(raw);

  // Chuẩn hóa DTO để khớp cả hai trường hợp Backend trả về
  const user = (response.user as Record<string, unknown>) || response;
  return {
    id: (user.id || response.id) as string,
    email: (user.email || response.email) as string,
    fullName: (user.fullName || response.fullName) as string,
    role: (response.role || user.role || 'cus') as 'cus' | 'staff' | 'admin' | 'disabled',
    freeTrialRemaining: Number(response.freeTrialRemaining ?? user.freeTrialRemaining ?? 0),
    purchasedRemaining: Number(response.purchasedRemaining ?? user.purchasedRemaining ?? 0),
    totalUsed: Number(response.totalUsed ?? user.totalUsed ?? 0),
    accountStatus: (response.accountStatus || user.accountStatus) as string | undefined,
    emailVerified: Boolean(response.emailVerified ?? user.emailVerified),
    totalBalance: Number(response.totalBalance ?? 0),
  };
};

export const verifyAdminSession = async (): Promise<void> => {
  const me = await getMe();
  if (!me || (!isAdminRole(me.role) && !isStaffRole(me.role) && me.role !== 'admin' && me.role !== 'staff')) {
    throw new Error('Authenticated user is not an admin or staff.');
  }
};

// Export gom nhóm V2
export const authService = {
  login,
  register,
  verifyEmail,
  resendVerificationOtp,
  refreshToken,
  logout,
  revokeAllSessions,
  forgotPassword,
  resetPassword,
  getConsent,
  updateConsent,
  getMe,
  verifyAdminSession,
};

export default authService;
