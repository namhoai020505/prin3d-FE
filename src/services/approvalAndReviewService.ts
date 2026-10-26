import api from '../lib/api';

export interface CanonicalPrintConfig {
  material: string;
  heightMm: number;
  scale: number;
}

/**
 * Shared canonical print configuration builder.
 * Guarantees 100% identical JSON serialization and deterministic SHA-256 ConfigurationHash
 * between Customer Approval and Quote creation on Backend (.NET 8).
 */
export const buildCanonicalPrintConfig = (input: {
  material: string;
  heightMm: number;
  scale?: number;
}): CanonicalPrintConfig => ({
  material: input.material.trim(),
  heightMm: Math.min(120, Math.max(100, Math.round(input.heightMm))),
  scale: Number((input.scale ?? 1).toFixed(2)),
});

export type CustomerApprovalConfiguration = CanonicalPrintConfig;

export interface CustomerApprovalPayload {
  versionId: string;
  configuration: CanonicalPrintConfig | Record<string, unknown>;
  policyVersion?: string;
}

export interface CustomerApprovalDto {
  id: string;
  userId: string;
  versionId: string;
  configurationHash: string;
  configurationJson: string;
  policyVersion: string;
  createdAtUtc: string;
}

export interface PrintReviewChecklist {
  orientation: string;
  supportConfirmation: boolean;
  material: string;
  printHeightMm: number;
  buildVolumeConfirmation: boolean;
  slicingSoftware?: string;
  exceptionReason?: string;
}

export interface PrintReviewPayload {
  versionId: string;
  decision: 'Approved' | 'Rejected' | 'NeedsModification' | string;
  checklist: PrintReviewChecklist;
  configuration: unknown;
  evidenceStorageKey?: string;
  note: string;
}

export interface PrintReviewDto {
  id: string;
  versionId: string;
  configurationHash: string;
  reviewerUserId: string;
  decision: string;
  checklistJson: string;
  evidenceStorageKey?: string;
  note: string;
  createdAtUtc: string;
}

const unwrap = <T>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res && 'headers' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
};

/**
 * 1. Khách hàng bấm "Xác nhận chốt mẫu in 3D" (Customer Approval - C# CreateCustomerApprovalRequest)
 */
export const createCustomerApproval = async (
  payload: CustomerApprovalPayload,
): Promise<CustomerApprovalDto> => {
  const body: { versionId: string; configuration: unknown; policyVersion?: string } = {
    versionId: payload.versionId,
    configuration: payload.configuration,
  };
  if (payload.policyVersion) {
    body.policyVersion = payload.policyVersion;
  }

  const raw = await api.post('/api/v2/approvals', body);
  return unwrap<CustomerApprovalDto>(raw);
};

/**
 * 2. Kỹ thuật viên / Staff duyệt kỹ thuật in 3D (Print Review - Role Management - C# CreatePrintReviewRequest)
 */
export const createPrintReview = async (
  payload: PrintReviewPayload,
): Promise<PrintReviewDto> => {
  const body: {
    versionId: string;
    decision: string;
    checklist: PrintReviewChecklist;
    configuration: unknown;
    evidenceStorageKey?: string;
    note: string;
  } = {
    versionId: payload.versionId,
    decision: payload.decision,
    checklist: payload.checklist,
    configuration: payload.configuration,
    note: payload.note,
  };
  if (payload.evidenceStorageKey) {
    body.evidenceStorageKey = payload.evidenceStorageKey;
  }

  const raw = await api.post('/api/v2/reviews', body);
  return unwrap<PrintReviewDto>(raw);
};

export const approvalAndReviewService = {
  buildCanonicalPrintConfig,
  createCustomerApproval,
  createPrintReview,
};

export default approvalAndReviewService;
