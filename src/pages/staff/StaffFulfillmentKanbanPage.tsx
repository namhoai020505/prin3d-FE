import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { FulfillmentOrder, KanbanStage, AssignPartnerPayload, RecordQcPayload, CreateShipmentPayload } from '../../types/staff';
import { StaffFulfillmentDrawer } from '../../components/staff/StaffFulfillmentDrawer';
import { AssignLabDialog, QcReviewDialog, CreateShipmentDialog, UpdateShipmentDialog, type ShipmentEventPayload } from '../../components/staff/dialogs/StaffActionDialogs';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { fulfillmentService } from '../../services/fulfillmentService';
import { staffService } from '../../services/staffService';
import { errorMessage, useStaffData } from '../../hooks/useStaffData';

const columns: { key: KanbanStage; title: string }[] = [
  { key: 'AwaitingLab', title: 'Chờ Gán Xưởng' }, { key: 'LabAssigned', title: 'Xưởng Tiếp Nhận' },
  { key: 'InProduction', title: 'Đang In & Xử Lý' }, { key: 'QualityCheck', title: 'Chờ Kiểm Định QC' },
  { key: 'Delivery', title: 'Đóng Gói & Giao Vận' },
];
export default function StaffFulfillmentKanbanPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useStaffData(staffService.getOrders);
  const orders = data || [];
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState('');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: 'assign' | 'qc' | 'shipment' | 'event'; order: FulfillmentOrder } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const activeId = drawerId || orderId;
  const drawerOrder = orders.find(o => o.id === activeId || o.orderCode.toLowerCase() === activeId?.toLowerCase()) || null;
  const filtered = orders.filter(o => (!material || material === o.material) && `${o.orderCode} ${o.customerName} ${o.customerPhone}`.toLowerCase().includes(search.trim().toLowerCase()));
  const mutate = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setActionError(null);
    try {
      await action();
      setDialog(null);
      toast.success('Đã lưu thay đổi trên máy chủ.');
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally { lock.current = false; setBusy(false); }
  };
  const assign = async (id: string, payload: AssignPartnerPayload) => mutate(() => fulfillmentService.assignPartner(id, payload));
  const recordQc = async (_id: string, payload: RecordQcPayload) => mutate(async () => {
    const run = [...(dialog?.order.runs || [])].reverse().find(run => run.status === 'QualityCheck');
    if (!run) throw new Error('Không có lượt in đang chờ QC. Vui lòng tải lại.');
    return fulfillmentService.recordQc(run.id, payload);
  });
  const shipment = async (id: string, payload: CreateShipmentPayload) => mutate(() => fulfillmentService.createShipment(id, payload));
  const event = async (_id: string, payload: ShipmentEventPayload) => mutate(async () => {
    const id = dialog?.order.shipment?.id;
    if (!id) throw new Error('Không tìm thấy vận đơn.');
    return fulfillmentService.recordShipmentEvent(id, { ...payload, eventKey: crypto.randomUUID(), occurredAtUtc: new Date().toISOString() });
  });
  const advance = (order: FulfillmentOrder) => mutate(async () => {
    const run = [...order.runs].reverse().find(run => ['Printing', 'PostProcessing'].includes(run.status));
    if (!run) throw new Error('Không có lượt in đang hoạt động. Vui lòng tải lại.');
    return fulfillmentService.updateRunStatus(run.id, run.status === 'Printing' ? 'PostProcessing' : 'QualityCheck');
  });
  return <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
    <h1 className="text-xl font-bold">Điều phối xưởng Kanban</h1>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{columns.map(col => <div key={col.key} className="staff-panel text-sm">{col.title}<strong className="block text-xl font-mono">{loading || error ? '—' : orders.filter(o => o.stage === col.key).length}</strong></div>)}</div>
    <div className="flex gap-3 flex-wrap"><input className="staff-input flex-1" aria-label="Tìm đơn hàng" placeholder="Mã đơn, tên khách hoặc số điện thoại" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Lọc vật liệu" className="staff-input md:max-w-xs" value={material} onChange={e => setMaterial(e.target.value)}><option value="">Tất cả chất liệu</option>{[...new Set(orders.map(o => o.material).filter(Boolean))].map(m => <option key={m}>{m}</option>)}</select><button className="staff-button" onClick={() => void reload()} disabled={busy || loading}>Tải lại</button></div>
    <StaffDataState loading={loading} error={error} empty={!filtered.length} retry={reload} />
    {actionError && <p role="alert" className="staff-error">Không thể lưu thay đổi: {actionError}</p>}
    {!loading && !error && <>
      {orders.some(o => o.stage === 'Unknown') && <p role="status">Có đơn mang trạng thái chưa được hỗ trợ. Tra cứu trong danh sách đơn hàng.</p>}
      {orderId && !drawerOrder && <p role="alert">Không tìm thấy đơn hàng {orderId} trong danh sách sản xuất.</p>}
      <div className="overflow-x-auto"><div className="grid grid-cols-5 gap-3 min-w-[1200px]">
        {columns.map(col => <section key={col.key} aria-label={col.title} className="staff-panel space-y-3"><h2 className="font-bold">{col.title}</h2>{filtered.filter(o => o.stage === col.key).map(order => <article key={order.id} className="staff-panel text-sm space-y-3">
          <button className="font-mono underline" onClick={() => setDrawerId(order.id)}>{order.orderCode}</button><p>{order.customerName || 'Chưa có tên khách'}</p><p>{order.material || 'Chưa có vật liệu'} / {order.heightMm ?? '—'} mm</p><p className="staff-muted">{order.subStatus}</p>
          <div className="flex flex-col gap-2">
            {col.key === 'AwaitingLab' && <button className="staff-button" disabled={busy} onClick={() => setDialog({ type: 'assign', order })}>Gán Xưởng In</button>}
            {col.key === 'LabAssigned' && <>
              {order.assignment?.status === 'Offered' && <button className="staff-button" disabled={busy} onClick={() => void mutate(() => fulfillmentService.respondAssignment(order.assignment!.id, { accepted: true }))}>Nhận Việc</button>}
              <button className="staff-button" disabled={busy || order.assignment?.status !== 'Accepted'} onClick={() => void mutate(() => fulfillmentService.startProductionRun(order.assignment!.id, { quantity: order.quantity }))}>Bắt Đầu In</button>
            </>}
            {col.key === 'InProduction' && <button className="staff-button" disabled={busy || !order.runs.some(r => ['Printing', 'PostProcessing'].includes(r.status))} onClick={() => void advance(order)}>{order.runs.some(r => r.status === 'PostProcessing') ? 'Chuyển Chờ QC' : 'Chuyển Xử Lý Nguội'}</button>}
            {col.key === 'QualityCheck' && <button className="staff-button" disabled={busy || !order.runs.some(r => r.status === 'QualityCheck')} onClick={() => setDialog({ type: 'qc', order })}>Đánh Giá QC</button>}
            {col.key === 'Delivery' && <button className="staff-button" disabled={busy || order.subStatus === 'Delivered' || order.shipment?.status === 'Delivered'} onClick={() => setDialog({ type: order.shipment ? 'event' : 'shipment', order })}>{order.shipment ? 'Cập Nhật Giao Hàng' : 'Tạo Mã Vận Đơn'}</button>}
          </div>
        </article>)}</section>)}
      </div></div>
    </>}
    <StaffFulfillmentDrawer order={drawerOrder} onClose={() => { setDrawerId(null); if (orderId) navigate('/staff/fulfillment'); }} />
    {dialog && <>{actionError && <div role="alert" className="fixed z-[60] top-4 right-4 staff-panel staff-error">{actionError}</div>}{dialog.type === 'assign' ? <AssignLabDialog key={dialog.order.id} order={dialog.order} busy={busy} onClose={() => setDialog(null)} onSubmit={assign} /> : dialog.type === 'qc' ? <QcReviewDialog key={dialog.order.id} order={dialog.order} busy={busy} onClose={() => setDialog(null)} onSubmit={recordQc} /> : dialog.type === 'shipment' ? <CreateShipmentDialog key={dialog.order.id} order={dialog.order} busy={busy} onClose={() => setDialog(null)} onSubmit={shipment} /> : <UpdateShipmentDialog key={dialog.order.id} order={dialog.order} busy={busy} onClose={() => setDialog(null)} onSubmit={event} />}</>}
  </div>;
}

