import api from '../lib/api';

export type AdminUserItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  freeTrialRemaining: number;
  purchasedRemaining: number;
};

export type UpdateUserRolePayload = {
  role: string;
};

export type AddUserCreditsPayload = {
  amount: number;
};

export type UpdatePricingPackagePayload = {
  priceVnd: number;
  isActive: boolean;
};

export const adminService = {
  getUsers: async (page = 1): Promise<AdminUserItem[]> => {
    const response = await api.get(`/api/admin/users?page=${page}`);
    return response as unknown as AdminUserItem[];
  },

  updateUserRole: async (id: string, role: string): Promise<{ id: string; role: string }> => {
    const response = await api.patch(`/api/admin/users/${id}/role`, { role });
    return response as unknown as { id: string; role: string };
  },

  addUserCredits: async (
    id: string,
    amount: number,
  ): Promise<{ id: string; freeTrialRemaining: number; purchasedRemaining: number }> => {
    const response = await api.post(`/api/admin/users/${id}/credits`, { amount });
    return response as unknown as {
      id: string;
      freeTrialRemaining: number;
      purchasedRemaining: number;
    };
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
