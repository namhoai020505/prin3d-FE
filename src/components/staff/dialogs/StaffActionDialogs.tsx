import { useState, type FormEvent, type ReactNode } from 'react';
import type { FulfillmentOrder, AssignPartnerPayload, RecordQcPayload, CreateShipmentPayload } from '../../../types/staff';
import { fulfillmentService } from '../../../services/fulfillmentService';
import { useStaffData } from '../../../hooks/useStaffData';
import { StaffDataState } from '../StaffDataState';

type DialogProps<P> = { order: FulfillmentOrder; busy: boolean; onClose: () => void; onSubmit: (id: string, payload: P) => Promise<void> };
function Dialog({ title, busy, onClose, onSubmit, children }: { title: string; busy: boolean; onClose: () => void; onSubmit: (e: FormEvent) => void; children: ReactNode }) {
  return <div className="staff-overlay"><form role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit} className="staff-panel space-y-4">
    <div className="flex justify-between gap-3"><h2 className="font-bold">{title}</h2><button type="button" className="staff-button" disabled={busy} onClick={onClose}>Đóng</button></div>
    <fieldset disabled={busy} className="space-y-4">{children}<button type="submit" className="staff-button w-full">{busy ? 'Đang lưu...' : 'Xác nhận'}</button></fieldset>
  </form></div>;
}
export function AssignLabDialog({ order, busy, onClose, onSubmit }: DialogProps<AssignPartnerPayload>) {
  const { data: labs, loading, error, reload } = useStaffData(fulfillmentService.getPartnerLabs);
  const [labId, setLabId] = useState('');
  const [cost, setCost] = useState('');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  return <Dialog title={`Phân công xưởng in ${order.orderCode}`} busy={busy} onClose={onClose} onSubmit={e => {
    e.preventDefault();
    if (!labs?.some(lab => lab.id === labId && lab.isActive !== false)) return;
    void onSubmit(order.id, { partnerLabId: labId, partnerCostSnapshotVnd: cost === '' ? undefined : Number(cost), dueAtUtc: due ? new Date(due).toISOString() : undefined, decisionNote: note.trim() || undefined });
  }}>
    <StaffDataState loading={loading} error={error} empty={labs?.length === 0} retry={reload} />
    <label>Trạm in đối tác<select className="staff-input" required value={labId} onChange={e => setLabId(e.target.value)}><option value="">Chọn xưởng in</option>{labs?.filter(lab => lab.isActive !== false).map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}</select></label>
    <label>Chi phí xưởng (VNĐ)<input className="staff-input" type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} /></label>
    <label>Hạn hoàn thành dự kiến<input className="staff-input" type="datetime-local" value={due} onChange={e => setDue(e.target.value)} /></label>
    <label>Ghi chú kỹ thuật<textarea className="staff-input" value={note} onChange={e => setNote(e.target.value)} /></label>
  </Dialog>;
}
export function QcReviewDialog({ order, busy, onClose, onSubmit }: DialogProps<RecordQcPayload>) {
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [reprint, setReprint] = useState(false);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState('');
  return <Dialog title={`Kiểm định QC ${order.orderCode}`} busy={busy} onClose={onClose} onSubmit={e => {
    e.preventDefault();
    void onSubmit(order.id, { passed: decision === 'Passed', qcNote: decision === 'Failed' ? `${reason.trim()}: ${note.trim()}` : note.trim() || undefined, triggerReprint: decision === 'Failed' && reprint, qcEvidenceStorageKey: evidence.trim() || undefined });
  }}>
    <label>Kết quả QC<select required className="staff-input" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Chọn kết quả</option><option value="Passed">Đạt chuẩn</option><option value="Failed">Không đạt chuẩn</option></select></label>
    {decision === 'Failed' && <><label>Lý do lỗi<input required className="staff-input" value={reason} onChange={e => setReason(e.target.value)} /></label><label><input type="checkbox" checked={reprint} onChange={e => setReprint(e.target.checked)} /> Kích hoạt in lại tự động</label></>}
    <label>Mã lưu trữ ảnh bằng chứng QC<input className="staff-input" value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
    <p className="staff-muted text-xs">Nhập mã của ảnh đã được lưu trữ. Chức năng tải ảnh cần API lưu trữ từ máy chủ.</p>
    <label>Ghi chú QC<textarea className="staff-input" value={note} onChange={e => setNote(e.target.value)} /></label>
  </Dialog>;
}
export function CreateShipmentDialog({ order, busy, onClose, onSubmit }: DialogProps<CreateShipmentPayload>) {
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [cost, setCost] = useState('');
  return <Dialog title={`Tạo vận đơn ${order.orderCode}`} busy={busy} onClose={onClose} onSubmit={e => { e.preventDefault(); if (!carrier.trim() || !tracking.trim()) return; void onSubmit(order.id, { carrier: carrier.trim(), trackingNumber: tracking.trim(), shippingActualVnd: cost === '' ? undefined : Number(cost) }); }}>
    <label>Đơn vị vận chuyển<input className="staff-input" required value={carrier} onChange={e => setCarrier(e.target.value)} /></label>
    <label>Mã vận đơn<input className="staff-input" required value={tracking} onChange={e => setTracking(e.target.value)} /></label>
    <label>Cước phí thực tế (VNĐ)<input type="number" min="0" className="staff-input" value={cost} onChange={e => setCost(e.target.value)} /></label>
  </Dialog>;
}
export interface ShipmentEventPayload { status: string; note?: string; deliveryEvidenceStorageKey?: string }
export function UpdateShipmentDialog({ order, busy, onClose, onSubmit }: DialogProps<ShipmentEventPayload>) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState('');
  return <Dialog title={`Cập nhật giao hàng ${order.orderCode}`} busy={busy} onClose={onClose} onSubmit={e => { e.preventDefault(); void onSubmit(order.id, { status, note: note.trim() || undefined, deliveryEvidenceStorageKey: evidence.trim() || undefined }); }}>
    <label>Sự kiện giao hàng<select required className="staff-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Chọn trạng thái</option>{['PickedUp', 'InTransit', 'OutForDelivery', 'Delivered'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <label>Ghi chú<textarea className="staff-input" value={note} onChange={e => setNote(e.target.value)} /></label>
    <label>Mã lưu trữ bằng chứng bàn giao<input className="staff-input" value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
  </Dialog>;
}
