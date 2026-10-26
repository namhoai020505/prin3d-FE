import api from '../lib/api';
import type { CanonicalPrintConfig } from './approvalAndReviewService';

export interface ShippingAddressDto {
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  district: string;
  city: string;
  customerNote?: string;
}

export type QuoteConfiguration = CanonicalPrintConfig | Record<string, unknown>;

export interface CreateQuotePayload {
  versionId: string;
  configuration: QuoteConfiguration;
  pricingPackageId: string;
  quantity: number;
  address: ShippingAddressDto;
}

export interface QuoteDto {
  id: string;
  userId: string;
  versionId: string;
  configurationHash: string;
  approvalId: string;
  reviewId: string;
  pricingPackageId: string;
  packageCode: string;
  packageName: string;
  quantity: number;
  unitPriceVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  address: ShippingAddressDto;
  snapshotJson: string;
  expiresAtUtc: string;
  createdAtUtc: string;
  isExpired: boolean;

  // Normalized UI helper properties (avoiding NaN/undefined):
  subTotalVnd: number;
  shippingFeeRaw: number;
  platformShippingSubsidy: number; // Khoản sàn THE BOYS trợ giá vận chuyển
  finalShippingFee: number; // Phí ship thực khách phải trả
  totalAmount: number; // Tổng thanh toán cuối cùng = subTotal + finalShippingFee
  currency: string;
  hash: string;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * Normalizes backend C# QuoteDto response with calculated UI breakdown fields.
 */
export const normalizeQuoteDto = (raw: Record<string, unknown> | null | undefined): QuoteDto => {
  if (!raw) {
    return {
      id: '',
      userId: '',
      versionId: '',
      configurationHash: '',
      approvalId: '',
      reviewId: '',
      pricingPackageId: '',
      packageCode: '',
      packageName: '',
      quantity: 1,
      unitPriceVnd: 0,
      shippingFeeVnd: 0,
      totalVnd: 0,
      address: {
        receiverName: '',
        receiverPhone: '',
        streetAddress: '',
        district: '',
        city: 'Thành phố Hồ Chí Minh',
      },
      snapshotJson: '',
      expiresAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAtUtc: new Date().toISOString(),
      isExpired: false,
      subTotalVnd: 0,
      shippingFeeRaw: 0,
      platformShippingSubsidy: 0,
      finalShippingFee: 0,
      totalAmount: 0,
      currency: 'VND',
      hash: '',
    };
  }

  const quantity = typeof raw.quantity === 'number' ? raw.quantity : 1;
  const unitPriceVnd = typeof raw.unitPriceVnd === 'number' ? raw.unitPriceVnd : Number(raw.unitPriceVnd || 0);
  const subTotalVnd =
    typeof raw.subTotalVnd === 'number'
      ? raw.subTotalVnd
      : unitPriceVnd * quantity;

  const rawShippingFee =
    typeof raw.finalShippingFee === 'number'
      ? raw.finalShippingFee
      : typeof raw.shippingFeeVnd === 'number'
        ? raw.shippingFeeVnd
        : Number(raw.shippingFeeVnd || 0);

  const platformShippingSubsidy =
    typeof raw.platformShippingSubsidy === 'number'
      ? raw.platformShippingSubsidy
      : rawShippingFee === 0
        ? 30000
        : 10000;

  const shippingFeeRaw =
    typeof raw.shippingFeeRaw === 'number'
      ? raw.shippingFeeRaw
      : rawShippingFee + platformShippingSubsidy;

  const finalShippingFee = rawShippingFee;

  const totalAmount =
    typeof raw.totalAmount === 'number'
      ? raw.totalAmount
      : typeof raw.totalVnd === 'number'
        ? raw.totalVnd
        : subTotalVnd + finalShippingFee;

  const hash = String(raw.hash || raw.configurationHash || '');
  const expiresAtUtc = String(raw.expiresAtUtc || new Date(Date.now() + 15 * 60 * 1000).toISOString());
  const isExpired =
    Boolean(raw.isExpired) ||
    new Date(expiresAtUtc).getTime() <= Date.now();

  const rawAddress = (raw.address as Record<string, unknown>) || {};
  const address: ShippingAddressDto = {
    receiverName: String(rawAddress.receiverName || ''),
    receiverPhone: String(rawAddress.receiverPhone || ''),
    streetAddress: String(rawAddress.streetAddress || ''),
    district: String(rawAddress.district || ''),
    city: String(rawAddress.city || 'Thành phố Hồ Chí Minh'),
    customerNote: rawAddress.customerNote ? String(rawAddress.customerNote) : undefined,
  };

  return {
    id: String(raw.id || ''),
    userId: String(raw.userId || ''),
    versionId: String(raw.versionId || ''),
    configurationHash: String(raw.configurationHash || hash),
    approvalId: String(raw.approvalId || ''),
    reviewId: String(raw.reviewId || ''),
    pricingPackageId: String(raw.pricingPackageId || ''),
    packageCode: String(raw.packageCode || ''),
    packageName: String(raw.packageName || ''),
    quantity,
    unitPriceVnd,
    shippingFeeVnd: finalShippingFee,
    totalVnd: totalAmount,
    address,
    snapshotJson: String(raw.snapshotJson || ''),
    expiresAtUtc,
    createdAtUtc: String(raw.createdAtUtc || new Date().toISOString()),
    isExpired,
    subTotalVnd,
    shippingFeeRaw,
    platformShippingSubsidy,
    finalShippingFee,
    totalAmount,
    currency: 'VND',
    hash,
  };
};

/**
 * 1. Tạo Báo Giá V2 (Deterministic Hash & Timeout 15 Phút - C# CreateQuoteRequest)
 */
export const createQuote = async (payload: CreateQuotePayload): Promise<QuoteDto> => {
  // Strict DTO fields for C# JsonUnmappedMemberHandling.Disallow
  const addressBody: ShippingAddressDto = {
    receiverName: payload.address.receiverName.trim(),
    receiverPhone: payload.address.receiverPhone.trim(),
    streetAddress: payload.address.streetAddress.trim(),
    district: payload.address.district.trim(),
    city: payload.address.city.trim() || 'Thành phố Hồ Chí Minh',
  };
  if (payload.address.customerNote?.trim()) {
    addressBody.customerNote = payload.address.customerNote.trim();
  }

  const body = {
    versionId: payload.versionId,
    configuration: payload.configuration,
    pricingPackageId: payload.pricingPackageId,
    quantity: payload.quantity,
    address: addressBody,
  };

  const raw = await api.post('/api/v2/quotes', body);
  return normalizeQuoteDto(unwrap<Record<string, unknown>>(raw));
};

/**
 * 2. Tra cứu chi tiết Báo Giá theo ID
 */
export const getQuoteById = async (quoteId: string): Promise<QuoteDto> => {
  const raw = await api.get(`/api/v2/quotes/${quoteId}`);
  return normalizeQuoteDto(unwrap<Record<string, unknown>>(raw));
};

/**
 * 3. Danh sách báo giá của người dùng
 */
export const listQuotes = async (page = 1): Promise<QuoteDto[]> => {
  const raw = await api.get(`/api/v2/quotes?page=${page}`);
  const data = unwrap<Record<string, unknown>[]>(raw);
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeQuoteDto(item));
};

export const quoteService = {
  createQuote,
  getQuoteById,
  listQuotes,
  normalizeQuoteDto,
};

export default quoteService;
