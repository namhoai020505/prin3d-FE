const roleClaimKeys = [
  'role',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
];

const emailClaimKeys = [
  'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
];

const userIdClaimKeys = [
  'userId',
  'sub',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
];

type JwtPayload = {
  exp?: number;
  role?: string | string[];
  [key: string]: unknown;
};

type AuthSession = {
  accessToken: string | null;
  fullName: string | null;
};

export type AuthSessionInput = {
  accessToken: string;
  refreshToken?: string | null;
  fullName?: string | null;
};

export const AUTH_SESSION_EVENT = 'g2c-auth-session-changed';

const LEGACY_TOKEN_KEYS = ['role', 'refreshToken'];

// In-memory module storage for access token (prevents anonymous/incognito session leakage)
let memoryAccessToken: string | null = null;

const authSession: AuthSession = {
  accessToken: null,
  fullName: null,
};

// 1-Time Migration: Purge localStorage access/refresh tokens to eliminate cross-window session leak
const runTokenStorageMigration = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Xóa vĩnh viễn token khỏi localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    for (const key of LEGACY_TOKEN_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }

    // Phục hồi session hiện tại từ sessionStorage của tab hiện tại nếu có
    const sessionToken = sessionStorage.getItem('accessToken');
    if (sessionToken) {
      memoryAccessToken = sessionToken;
      authSession.accessToken = sessionToken;
    }
    const sessionName = sessionStorage.getItem('fullName') || localStorage.getItem('fullName');
    if (sessionName) {
      authSession.fullName = sessionName;
    }
  } catch {
    // Ignore storage quota/security errors
  }
};

const notifyAuthSessionChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
  }
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

runTokenStorageMigration();

export const setAuthSession = ({
  accessToken,
  fullName = null,
}: AuthSessionInput) => {
  memoryAccessToken = accessToken;
  authSession.accessToken = accessToken;
  authSession.fullName = fullName || 'Người dùng';

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('fullName', authSession.fullName);
      // Đảm bảo không lưu token vào localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch {
      // Ignore sessionStorage exceptions
    }
  }

  notifyAuthSessionChanged();
};

export const getAccessToken = (): string | null => {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }
  if (typeof window !== 'undefined') {
    const sessionToken = sessionStorage.getItem('accessToken');
    if (sessionToken) {
      memoryAccessToken = sessionToken;
      return sessionToken;
    }
  }
  return null;
};

// Refresh token được quản lý hoàn toàn bằng HttpOnly cookie, không lưu ở JavaScript
export const getRefreshToken = (): string | null => null;

export const getAuthFullName = () => {
  if (authSession.fullName) return authSession.fullName;
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('fullName') || localStorage.getItem('fullName') || 'Thành viên';
  }
  return 'Thành viên';
};

export const clearAuthSession = () => {
  memoryAccessToken = null;
  authSession.accessToken = null;
  authSession.fullName = null;

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('fullName');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('fullName');
    } catch {
      // Ignore
    }
  }

  notifyAuthSessionChanged();
};

export const getJwtPayload = (token: string | null = getAccessToken()): JwtPayload | null => {
  if (!token) {
    return null;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
};

export const isAccessTokenExpired = (token: string | null = getAccessToken()) => {
  const payload = getJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
};

export const normalizeRole = (role: string | null | undefined) =>
  role?.replace(/^ROLE_/i, '').trim().toLowerCase() ?? null;

export const getRoleFromAccessToken = (token: string | null = getAccessToken()) => {
  const payload = getJwtPayload(token);

  if (!payload) {
    return null;
  }

  for (const key of roleClaimKeys) {
    const roleValue = payload[key];
    if (typeof roleValue === 'string' && roleValue.trim()) {
      return roleValue;
    }

    if (Array.isArray(roleValue)) {
      const firstRole = roleValue.find((item) => typeof item === 'string' && item.trim());
      if (typeof firstRole === 'string') {
        return firstRole;
      }
    }
  }

  return null;
};

export const isAdminRole = (role: string | null | undefined) => normalizeRole(role) === 'admin';

export const isManagerRole = (role: string | null | undefined) => normalizeRole(role) === 'manager';

export const isStaffRole = (role: string | null | undefined) => normalizeRole(role) === 'staff';

export const isCustomerRole = (role: string | null | undefined) => {
  const normalized = normalizeRole(role);
  return normalized === 'customer' || normalized === 'cus';
};

export const getPostLoginRedirect = (role: string | null | undefined) => {
  if (isStaffRole(role)) {
    return '/staff/reviews';
  }

  if (isManagerRole(role)) {
    return '/manager/dashboard';
  }

  if (isAdminRole(role)) {
    return '/admin/orders';
  }

  return '/';
};

const getStringClaim = (payload: JwtPayload | null, keys: string[]) => {
  if (!payload) {
    return '';
  }

  for (const key of keys) {
    const claimValue = payload[key];
    if (typeof claimValue === 'string' && claimValue.trim()) {
      return claimValue;
    }
  }

  return '';
};

export const getCurrentUserProfile = (token: string | null = getAccessToken()) => {
  const payload = getJwtPayload(token);

  if (!token || !payload) {
    return null;
  }

  return {
    userId: getStringClaim(payload, userIdClaimKeys),
    email: getStringClaim(payload, emailClaimKeys),
    fullName: getAuthFullName(),
    role: getRoleFromAccessToken(token) || '',
    expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
  };
};
