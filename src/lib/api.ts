import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import {
  clearAuthSession,
  getAccessToken,
  setAuthSession,
} from './auth';
import { API_BASE_URL } from './env';

export const DEFAULT_API_BASE_URL = API_BASE_URL;

type RefreshTokenPayload = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  fullName?: string;
  user?: { fullName?: string };
};

type RefreshTokenResponse = {
  success?: boolean;
  data?: RefreshTokenPayload | null;
} & RefreshTokenPayload;

export type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRedirect?: boolean;
  skipToast?: boolean;
};

const UPLOAD_TIMEOUT_MS = 60_000; // 60s for file uploads (models, images)

const api = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Danh sách public auth endpoints không cần gắn Bearer token.
 * Toàn bộ các endpoint auth khác (/api/auth/me, /api/auth/consent, /api/auth/logout, /api/auth/revoke-all)
 * BẮT BUỘC gắn Bearer token.
 */
const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/refresh-token',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

const isPublicAuthEndpoint = (url: string): boolean => {
  const normalized = url.toLowerCase();
  return PUBLIC_AUTH_PATHS.some((path) => normalized.includes(path));
};

const handleRefreshFailure = (shouldOpenModal = true) => {
  clearAuthSession();
  if (shouldOpenModal && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('idea2model:open-login-modal'));
  }
};

let refreshAccessTokenPromise: Promise<string | null> | null = null;

const requestFreshAccessToken = async (shouldOpenModal = true): Promise<string | null> => {
  try {
    let response;
    try {
      // Refresh token được chuyển qua cookie HttpOnly với withCredentials: true
      response = await refreshClient.post<RefreshTokenResponse>('/api/auth/refresh', {});
    } catch (err: unknown) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        response = await refreshClient.post<RefreshTokenResponse>('/api/auth/refresh-token', {});
      } else {
        throw err;
      }
    }

    const payload = response.data?.data || response.data;
    const nextAccessToken = payload?.accessToken || payload?.token;
    const nextFullName =
      payload?.user?.fullName ||
      payload?.fullName ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('fullName') : null);

    if (!nextAccessToken) {
      throw new Error('Refresh response did not include an access token.');
    }

    setAuthSession({
      accessToken: nextAccessToken,
      fullName: nextFullName,
    });

    return nextAccessToken;
  } catch {
    handleRefreshFailure(shouldOpenModal);
    return null;
  }
};

export const refreshAccessToken = async (options: { redirectOnFail?: boolean } = {}) => {
  const shouldOpenModal = options.redirectOnFail ?? true;
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = requestFreshAccessToken(shouldOpenModal).finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise;
};

// Request Interceptor: Đính kèm Bearer token chính xác và xử lý timeout upload
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const requestUrl = config.url || '';

    if (token && !isPublicAuthEndpoint(requestUrl) && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const contentType = (config.headers?.['Content-Type'] as string) || '';
    if (contentType.includes('multipart/form-data') && config.timeout === 15_000) {
      config.timeout = UPLOAD_TIMEOUT_MS;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const sanitizeErrorHeaders = (error: unknown) => {
  if (error && typeof error === 'object' && 'config' in error) {
    const errObj = error as { config?: { headers?: Record<string, unknown> } };
    if (errObj.config?.headers?.Authorization) {
      errObj.config.headers.Authorization = 'Bearer ***';
    }
  }
};

// Response Interceptor: Tự động unwrap response.data, xoay vòng Refresh Token & bắt lỗi RFC 7807
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const originalRequestUrl = originalRequest?.url as string | undefined;
    const errorStatus = error.response?.status;
    const isLoginRequest = originalRequestUrl?.includes('/api/auth/login');
    const isRefreshRequest = originalRequestUrl?.includes('/api/auth/refresh');

    // 429 Too Many Requests: KHÔNG retry dưới bất kỳ hình thức nào
    if (errorStatus === 429) {
      if (!originalRequest?.skipToast) {
        toast.warn('Thao tác quá nhanh, vui lòng chờ trong giây lát.', {
          toastId: 'err-429-ratelimit',
        });
      }
      sanitizeErrorHeaders(error);
      return Promise.reject(error);
    }

    // 401 Unauthorized handling with Token Rotation & skipAuthRedirect respect
    if (
      errorStatus === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isLoginRequest &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      const nextAccessToken = await refreshAccessToken({
        redirectOnFail: !originalRequest.skipAuthRedirect,
      });

      if (nextAccessToken) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        }
        return api(originalRequest);
      }

      sanitizeErrorHeaders(error);
      return Promise.reject(error);
    }

    // RFC 7807 ProblemDetails & HTTP Status Code Toast Handling
    if (!originalRequest?.skipToast) {
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        errorData?.title ||
        error.message ||
        'Đã có lỗi xảy ra.';

      switch (errorStatus) {
        case 400:
          toast.warn(errorMessage, { toastId: `err-400-${errorMessage}` });
          break;
        case 403: {
          const lowerMsg = String(errorMessage).toLowerCase();
          if (lowerMsg.includes('consent') || lowerMsg.includes('aimodelprocessing')) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('idea2model:open-ai-consent-modal'));
            }
          }
          toast.error(`Từ chối quyền truy cập: ${errorMessage}`, {
            toastId: `err-403-${errorMessage}`,
          });
          break;
        }
        case 409:
          toast.warn(`Xung đột dữ liệu: ${errorMessage}`, {
            toastId: `err-409-${errorMessage}`,
          });
          break;
        case 423:
          toast.error(`Tài khoản tạm khóa: ${errorMessage}`, {
            toastId: `err-423-${errorMessage}`,
          });
          break;
        default:
          break;
      }
    }

    sanitizeErrorHeaders(error);
    return Promise.reject(error);
  },
);

export default api;
