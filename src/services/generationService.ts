import type { AxiosRequestConfig } from 'axios';
import api from '../lib/api';

export type GenerationStatus =
  | 'queued'
  | 'processing'
  | 'meshOptimizing'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'needsAttention';

export type GenerationTask = {
  id: string;
  versionId?: string | null;
  modelName?: string | null;
  status: GenerationStatus;
  stage: string;
  progress: number;
  errorMessage?: string | null;
  createdAtUtc: string;
  completedAtUtc?: string | null;
  imageUrl: string;
  glbUrl?: string | null;
  stlUrl?: string | null;
  dimensions?: { widthMm: number; depthMm: number; heightMm: number } | null;
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
  prompt?: string;
  modelName?: string;
  shouldTexture?: boolean;
  heightMm?: number;
};

export type GenerationApiError = {
  status?: number;
  code?: string;
  message: string;
  isNsfwBlocked: boolean;
};

export const parseGenerationError = (error: unknown): GenerationApiError => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          code?: string;
          message?: string;
          detail?: string;
          title?: string;
        };
      };
      message?: string;
    };

    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const code = data?.code;
    const isNsfwBlocked = status === 422 || code === 'NSFW_CONTENT_BLOCKED';

    const message =
      data?.message ||
      data?.detail ||
      data?.title ||
      (isNsfwBlocked
        ? 'Nội dung hình ảnh hoặc từ khóa vi phạm tiêu chuẩn kiểm duyệt (nhạy cảm, bạo lực hoặc 18+).'
        : axiosError.message || 'Không thể tạo mô hình 3D.');

    return {
      status,
      code,
      message,
      isNsfwBlocked,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      isNsfwBlocked: false,
    };
  }

  return {
    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
    isNsfwBlocked: false,
  };
};

const toTask = (value: unknown) => value as GenerationTask;

const keepStudioOpenOnAuthFailure: AxiosRequestConfig & { skipAuthRedirect: boolean } = {
  skipAuthRedirect: true,
};

export const createImageGeneration = async ({
  image,
  modelName,
  shouldTexture = false,
  heightMm = 100,
}: CreateGenerationInput) => {
  if (!image) {
    throw new Error('Ảnh nguồn là bắt buộc để tạo mô hình 3D.');
  }
  const form = new FormData();
  form.append('image', image);
  form.append('heightMm', String(heightMm));
  form.append('shouldTexture', String(shouldTexture));
  if (modelName) form.append('modelName', modelName);

  const response = await api.post('/api/generations/image', form, {
    ...keepStudioOpenOnAuthFailure,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Idempotency-Key': crypto.randomUUID(),
    },
  });

  return toTask(response);
};

export const getGeneration = async (id: string) =>
  toTask(await api.get(`/api/generations/${id}`, keepStudioOpenOnAuthFailure));

export const listGenerations = async (page = 1) => {
  const response = await api.get(`/api/generations?page=${page}`, keepStudioOpenOnAuthFailure);
  return response as unknown as GenerationTask[];
};

export const getPrintQuote = async (
  id: string,
  packageId: string,
  quantity = 1,
): Promise<PrintQuote> => {
  const response = await api.get(`/api/generations/${id}/quote`, {
    params: { packageId, quantity },
  });
  return response as unknown as PrintQuote;
};

export const reviewGeneration = async (
  id: string,
  approved: boolean,
  note: string,
): Promise<GenerationTask> => {
  const response = await api.post(`/api/generations/${id}/review`, { approved, note });
  return toTask(response);
};

export const recoverGeneration = async (
  id: string,
  providerTaskId?: string,
): Promise<GenerationTask> => {
  const response = await api.post(`/api/generations/${id}/recover`, { providerTaskId });
  return toTask(response);
};

export const downloadGenerationFile = async (url: string, fileName: string) => {
  const response = await api.get(url, {
    ...keepStudioOpenOnAuthFailure,
    responseType: 'blob',
  });
  const blob = response as unknown as Blob;
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
