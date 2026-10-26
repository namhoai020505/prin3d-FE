import { toast } from 'react-toastify';
import type { FulfillmentOrder } from '../../types/staff';

export function StaffFulfillmentDrawer({ order, onClose }: { order: FulfillmentOrder | null; onClose: () => void }) {
  if (!order) return null;
  return <div className="staff-overlay" style={{ justifyContent: 'flex-end', padding: 0 }}>
    <section role="dialog" aria-modal="true" aria-label={`Lộ trình ${order.orderCode}`} className="staff-panel w-full max-w-lg h-full overflow-y-auto space-y-4">
      <div className="flex justify-between gap-3"><h2 className="font-bold">Lộ trình {order.orderCode}</h2><button className="staff-button" onClick={onClose}>Đóng</button></div>
      <p>{order.customerName} / {order.customerPhone}</p>
      <section className="staff-panel space-y-2"><h3 className="font-bold">Phân công xưởng in</h3>{order.assignment ? <>
        <p>{order.assignment.partnerLabName || order.assignment.labName || order.assignment.partnerLabId}</p><p>Thời gian gán: {order.assignment.assignedAtUtc || order.assignment.createdAtUtc || '—'}</p><p>Hạn hoàn thành: {order.assignment.dueAtUtc || '—'}</p><p>Chi phí: {order.assignment.partnerCostSnapshotVnd?.toLocaleString('vi-VN') ?? '—'} VNĐ</p><p>{order.assignment.decisionNote}</p>
      </> : <p className="staff-muted">Chưa phân công xưởng in.</p>}</section>
      <section className="staff-panel space-y-2"><h3 className="font-bold">Tiến độ sản xuất & Lượt in</h3>{order.runs.length ? order.runs.map(run => <div key={run.id} className="staff-panel text-sm space-y-1"><p>Đợt in #{run.runNo ?? '—'} / {run.status}</p><p>Bắt đầu: {run.startedAtUtc}</p><p>Chi phí thực tế: {run.actualCostVnd?.toLocaleString('vi-VN') ?? '—'} VNĐ</p><p>QC: {run.qcNote || '—'}</p>{run.qcEvidenceStorageKey && <p>Bằng chứng QC: {run.qcEvidenceStorageKey}</p>}</div>) : <p className="staff-muted">Chưa có lượt in.</p>}</section>
      <section className="staff-panel space-y-2"><h3 className="font-bold">Vận đơn & Sự kiện giao hàng</h3>{order.shipment ? <>
        <p>{order.shipment.carrier}</p><p className="font-mono">{order.shipment.trackingNumber}</p><p>Cước phí: {order.shipment.shippingActualVnd?.toLocaleString('vi-VN') ?? '—'} VNĐ</p>
        <button className="staff-button" onClick={async () => { try { await navigator.clipboard.writeText(order.shipment!.trackingNumber); toast.info('Đã sao chép mã vận đơn.'); } catch { toast.error('Không thể sao chép mã vận đơn.'); } }}>Sao chép mã vận đơn</button>
        {order.shipment.events?.map(event => <div key={event.id || event.eventKey} className="staff-panel text-sm"><p>{event.status} / {event.occurredAtUtc}</p><p>{event.note}</p></div>)}
      </> : <p className="staff-muted">Chưa có vận đơn.</p>}</section>
    </section>
  </div>;
}
export default StaffFulfillmentDrawer;
