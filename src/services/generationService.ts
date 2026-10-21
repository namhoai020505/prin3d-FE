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

type CreateGenerationInput = {
  image: File;
  modelName?: string;
  shouldTexture?: boolean;
  heightMm?: number;
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
