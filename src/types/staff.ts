import type { PrintReviewPayload } from '../services/approvalAndReviewService';
import type { PartnerAssignmentDto, ProductionRunDto, ShipmentDto } from '../services/fulfillmentService';

export type CreatePrintReviewPayload = PrintReviewPayload;
export interface AssignPartnerPayload {
  partnerLabId: string;
  dueAtUtc?: string;
  decisionNote?: string;
  partnerCostSnapshotVnd?: number;
}
export interface RecordQcPayload {
  passed: boolean;
  qcNote?: string;
  qcEvidenceStorageKey?: string;
  triggerReprint?: boolean;
  actualCostVnd?: number;
}
export interface CreateShipmentPayload {
  carrier: string;
  trackingNumber: string;
  shippingActualVnd?: number;
}
export interface ResolveDefectPayload {
  resolutionType: 'ReprintApproved' | 'RefundApproved' | 'Rejected';
  resolutionNote?: string;
}
export type KanbanStage = 'AwaitingLab' | 'LabAssigned' | 'InProduction' | 'QualityCheck' | 'Delivery' | 'Unknown';
export interface FulfillmentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  material: string;
  heightMm?: number | null;
  quantity: number;
  stage: KanbanStage;
  subStatus: string;
  assignment?: PartnerAssignmentDto;
  runs: ProductionRunDto[];
  shipment?: ShipmentDto;
}
