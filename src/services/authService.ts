import api from '../lib/api';
import { clearAuthSession, getRefreshToken, isAdminRole, setAuthSession } from '../lib/auth';

export type CurrentUserDto = {
  id: string;
  email: string;
  fullName: string;
  role: 'cus' | 'staff' | 'admin' | 'disabled';
  freeTrialRemaining: number;
  purchasedRemaining: number;
  totalUsed: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
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

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const response = (await api.post('/api/auth/login', input)) as unknown as AuthResponse;
  if (response?.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      fullName: response.user?.fullName || input.email.split('@')[0],
    });
  }
  return response;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const response = (await api.post('/api/auth/register', input)) as unknown as AuthResponse;
  if (response?.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      fullName: response.user?.fullName || input.fullName,
    });
  }
  return response;
};

export const getMe = async (): Promise<CurrentUserDto> => {
  const response = await api.get('/api/auth/me');
  return response as unknown as CurrentUserDto;
};

export const logout = async () => {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken });
    }
  } catch {
    // Ignore network error on logout
  } finally {
    clearAuthSession();
  }
};

export const verifyAdminSession = async () => {
  const me = await getMe();
  if (!me || (!isAdminRole(me.role) && me.role !== 'admin')) {
    throw new Error('Authenticated user is not an admin.');
  }
};
