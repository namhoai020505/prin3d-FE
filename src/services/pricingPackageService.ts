import api from '../lib/api';

export type PricingPackage = {
  id: string;
  name: string;
  material: string;
  priceVnd: number;
  minHeightMm: number;
  maxHeightMm: number;
  heightRangeCm: string;
};

export const listPricingPackages = async (): Promise<PricingPackage[]> => {
  const response = await api.get('/api/pricing-packages');
  return response as unknown as PricingPackage[];
};
