import api from '../lib/api';
import { IdempotencyManager } from '../lib/idempotency';
import { listPricingPackages, type PricingPackage } from './pricingPackageService';

export type AdminUserItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountStatus?: string;
  freeTrialRemaining: number;
  purchasedRemaining: number;
};

export type AdminPricingPackage = PricingPackage & {
  isActive?: boolean;
};

export type UpdateUserRolePayload = {
  role: string;
};

export type AddUserCreditsPayload = {
  amount: number;
  reason?: string;
};

export type UpdatePricingPackagePayload = {
  priceVnd: number;
  isActive: boolean;
};

export const adminService = {
  getUsers: async (page = 1, signal?: AbortSignal): Promise<AdminUserItem[]> => {
    const response = await api.get(`/api/admin/users?page=${page}`, { signal });
    return response as unknown as AdminUserItem[];
  },

  updateUserRole: async (id: string, role: string): Promise<{ id: string; role: string }> => {
    const response = await api.patch(`/api/admin/users/${id}/role`, { role });
    return response as unknown as { id: string; role: string };
  },

  addUserCredits: async (
    id: string,
    amount: number,
    reason = 'Quản trị viên cấp bổ sung lượt tạo 3D',
    idempotencyKey?: string,
  ): Promise<{ id: string; freeTrialRemaining?: number; purchasedRemaining?: number }> => {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : IdempotencyManager.getOrCreateKey(`admin:credits:${id}`));
    const response = await api.post(
      `/api/admin/users/credits`,
      { userId: id, amount, reason, idempotencyKey: key },
      { headers: { 'Idempotency-Key': key } },
    );
    IdempotencyManager.clearKey(`admin:credits:${id}`);
    return response as unknown as {
      id: string;
      freeTrialRemaining?: number;
      purchasedRemaining?: number;
    };
  },

  addCredits: async (
    id: string,
    amount: number,
    reason = 'Quản trị viên cấp bổ sung lượt tạo 3D',
    idempotencyKey?: string,
  ): Promise<{ id: string; freeTrialRemaining?: number; purchasedRemaining?: number }> => {
    return adminService.addUserCredits(id, amount, reason, idempotencyKey);
  },

  lockUser: async (id: string, reason: string): Promise<{ message: string; targetUserId?: string }> => {
    const response = await api.post(`/api/admin/users/${id}/lock`, { reason });
    return response as unknown as { message: string; targetUserId?: string };
  },

  unlockUser: async (id: string): Promise<{ message: string; targetUserId?: string }> => {
    const response = await api.post(`/api/admin/users/${id}/unlock`, {});
    return response as unknown as { message: string; targetUserId?: string };
  },

  getPricingPackages: async (): Promise<AdminPricingPackage[]> => {
    return (await listPricingPackages()) as unknown as AdminPricingPackage[];
  },

  updatePricingPackage: async (
    id: string,
    payload: UpdatePricingPackagePayload,
  ): Promise<{
    id: string;
    priceVnd: number;
    isActive: boolean;
    minHeightMm: number;
    maxHeightMm: number;
  }> => {
    const response = await api.patch(`/api/admin/pricing-packages/${id}`, payload);
    return response as unknown as {
      id: string;
      priceVnd: number;
      isActive: boolean;
      minHeightMm: number;
      maxHeightMm: number;
    };
  },
};

export default adminService;
