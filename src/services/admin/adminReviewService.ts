import api from '../../lib/api';
import type {
  CanonicalPrintConfig,
  PrintReviewChecklist,
  PrintReviewDto,
} from '../approvalAndReviewService';

export interface LatestPrintReviewSummary {
  decision: 'Approved' | 'Rejected' | string;
  configurationHash: string;
  createdAtUtc: string;
}

export interface GenerationTaskItem {
  id: string;
  versionId?: string | null;
  latestPrintReview?: LatestPrintReviewSummary | null;
  userId: string;
  modelName?: string | null;
  status: 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'NeedsAttention' | string;
  stage?: string | null;
  progress: number;
  requestedHeightMm: number;
  shouldTexture: boolean;
  aiModel?: string | null;
  errorMessage?: string | null;
  createdAtUtc: string;
  isWatertight: boolean;
  printability?: {
    status?: string;
    details?: string;
    metrics?: {
      volumeCm3?: number;
      surfaceAreaCm2?: number;
      dimensionsMm?: {
        x: number;
        y: number;
        z: number;
      };
      triangleCount?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  isApprovedForPrinting: boolean;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  reviewNote?: string | null;
  reviewedAtUtc?: string | null;
  imageUrl?: string | null;
  glbUrl?: string | null;
  stlUrl?: string | null;
  providerTaskIds?: {
    generation?: string;
    resize?: string;
    convert?: string;
    analysis?: string;
  } | null;
}

export interface CreateAdminPrintReviewPayload {
  versionId: string;
  decision: 'Approved' | 'Rejected';
  checklist: PrintReviewChecklist;
  configuration: CanonicalPrintConfig;
  evidenceStorageKey?: string;
  note: string;
}

export const adminReviewService = {
  getGenerations: async (page = 1, signal?: AbortSignal): Promise<GenerationTaskItem[]> => {
    const res: any = await api.get(`/api/generations?page=${page}`, { signal });
    return (Array.isArray(res) ? res : res?.data) || [];
  },

  getGenerationById: async (id: string, signal?: AbortSignal): Promise<GenerationTaskItem> => {
    const res: any = await api.get(`/api/generations/${id}`, { signal });
    return res?.data ?? res;
  },

  getModelBlobUrl: async (
    generationId: string,
    format: 'glb' | 'stl',
    signal?: AbortSignal
  ): Promise<string> => {
    const res: any = await api.get(`/api/generations/${generationId}/files/${format}`, {
      responseType: 'blob',
      signal,
    });
    const blob = res instanceof Blob ? res : (res?.data instanceof Blob ? res.data : new Blob([res]));
    return URL.createObjectURL(blob);
  },

  createPrintReview: async (payload: CreateAdminPrintReviewPayload): Promise<PrintReviewDto> => {
    const res: any = await api.post('/api/v2/reviews', payload);
    return res?.data ?? res;
  },

  recoverGeneration: async (
    id: string,
    payload?: { providerTaskId?: string }
  ): Promise<GenerationTaskItem> => {
    const res: any = await api.post(`/api/generations/${id}/recover`, payload || {});
    return res?.data ?? res;
  },
};

export default adminReviewService;

