import type { AxiosRequestConfig } from 'axios';
import api from '../lib/api';
import { API_BASE_URL } from '../lib/env';
import { IdempotencyManager } from '../lib/idempotency';

export type GenerationStatus =
  | 'queued'
  | 'processing'
  | 'meshOptimizing'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'needsAttention';

export type LatestPrintReview = {
  decision: 'Approved' | 'Rejected' | string;
  configurationHash: string;
  createdAtUtc: string;
};

export type GenerationTask = {
  id: string;
  versionId?: string | null;
  latestPrintReview?: LatestPrintReview | null;
  userId?: string;
  modelName?: string | null;
  status: GenerationStatus;
  stage: string;
  progress: number;
  errorMessage?: string | null;
  createdAtUtc: string;
  completedAtUtc?: string | null;
  durationSeconds?: number | null;
  imageUrl: string;
  glbUrl?: string | null;
  stlUrl?: string | null;
  requestedHeightMm?: number;
  shouldTexture?: boolean;
  aiModel?: string;
  dimensions?: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
  modelVolumeCm3?: number | null;
  printabilityStatus?: string;
  isWatertight?: boolean;
  printability?: unknown;
  isApprovedForPrinting?: boolean;
  reviewStatus?: string;
  reviewNote?: string;
  reviewedAtUtc?: string | null;
};

export type PrintQuote = {
  generationTaskId: string;
  pricingPackageId: string;
  material: string;
  requestedHeightMm: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  modelVolumeCm3?: number | null;
  quantity: number;
  unitPriceVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  approvedForPrinting: boolean;
  pricingBasis: string;
};

export type CreateGenerationInput = {
  image?: File;
  modelName?: string;
  shouldTexture?: boolean;
  heightMm?: number;
  idempotencyKey?: string;
};

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

const toTask = (value: unknown): GenerationTask => {
  return unwrap<GenerationTask>(value);
};

const keepStudioOpenOnAuthFailure: AxiosRequestConfig & { skipAuthRedirect: boolean } = {
  skipAuthRedirect: true,
};

/**
 * Tạo tác vụ sinh mô hình 3D AI kèm header Idempotency-Key UUID v4.
 * Hỗ trợ nhận cả FormData hoặc CreateGenerationInput để tương thích 100% với code hiện tại.
 */
export const createImageGeneration = async (
  inputOrFormData: CreateGenerationInput | FormData,
  explicitIdempotencyKey?: string,
): Promise<GenerationTask> => {
  let form: FormData;
  let key: string | undefined = explicitIdempotencyKey;

  if (inputOrFormData instanceof FormData) {
    form = inputOrFormData;
  } else {
    form = new FormData();
    if (inputOrFormData.image) form.append('image', inputOrFormData.image);
    form.append('heightMm', String(inputOrFormData.heightMm ?? 100));
    form.append('shouldTexture', String(inputOrFormData.shouldTexture ?? false));
    if (inputOrFormData.modelName) form.append('modelName', inputOrFormData.modelName);
    if (!key && inputOrFormData.idempotencyKey) {
      key = inputOrFormData.idempotencyKey;
    }
  }

  const finalKey = key || IdempotencyManager.getOrCreateKey('generation:image');

  const response = await api.post('/api/generations/image', form, {
    ...keepStudioOpenOnAuthFailure,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Idempotency-Key': finalKey,
    },
  });

  IdempotencyManager.clearKey('generation:image');

  return toTask(response);
};

export const getGeneration = async (id: string): Promise<GenerationTask> => {
  const raw = await api.get(`/api/generations/${id}`, keepStudioOpenOnAuthFailure);
  return toTask(raw);
};

export const listGenerations = async (page = 1, onlyMine = false): Promise<GenerationTask[]> => {
  const raw = await api.get('/api/generations', {
    params: { page, onlyMine: onlyMine ? 'true' : 'false' },
    ...keepStudioOpenOnAuthFailure,
  });
  return unwrap<GenerationTask[]>(raw) || [];
};

export const getPrintQuote = async (
  id: string,
  packageId: string,
  quantity = 1,
): Promise<PrintQuote> => {
  const raw = await api.get(`/api/generations/${id}/quote`, {
    params: { packageId, quantity },
  });
  return unwrap<PrintQuote>(raw);
};

export const reviewGeneration = async (
  id: string,
  approved: boolean,
  note: string,
): Promise<GenerationTask> => {
  const raw = await api.post(`/api/generations/${id}/review`, { approved, note });
  return toTask(raw);
};

export const recoverGeneration = async (
  id: string,
  providerTaskId?: string,
): Promise<GenerationTask> => {
  const raw = await api.post(`/api/generations/${id}/recover`, { providerTaskId });
  return toTask(raw);
};

export const getDownloadUrl = (taskId: string, kind: 'glb' | 'stl' | 'image'): string => {
  return `${API_BASE_URL}/api/generations/${taskId}/files/${kind}`;
};

export const getGenerationModelBlobUrl = async (
  taskId: string,
  kind: 'glb' | 'stl' | 'image' = 'glb',
  signal?: AbortSignal
): Promise<string> => {
  const res: any = await api.get(`/api/generations/${taskId}/files/${kind}`, {
    ...keepStudioOpenOnAuthFailure,
    responseType: 'blob',
    signal,
  });
  const blob = res instanceof Blob ? res : (res?.data instanceof Blob ? res.data : new Blob([res]));
  return URL.createObjectURL(blob);
};

export const downloadGenerationFile = async (url: string, fileName: string): Promise<void> => {
  const response = await api.get(url, {
    ...keepStudioOpenOnAuthFailure,
    responseType: 'blob',
  });
  const blob = unwrap<Blob>(response);
  if (!(blob instanceof Blob)) {
    throw new Error('Backend không trả về file model hợp lệ.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const generationService = {
  createImageGeneration,
  getGeneration,
  listGenerations,
  getPrintQuote,
  reviewGeneration,
  recoverGeneration,
  getDownloadUrl,
  downloadGenerationFile,
  getGenerationModelBlobUrl,
};

export default generationService;
