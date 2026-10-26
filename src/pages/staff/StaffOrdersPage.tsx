import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { FulfillmentOrder, KanbanStage } from '../../types/staff';
import { StaffFulfillmentDrawer } from '../../components/staff/StaffFulfillmentDrawer';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { staffService } from '../../services/staffService';
import { useStaffData } from '../../hooks/useStaffData';

export default function StaffOrdersPage() {
  const { data, loading, error, reload } = useStaffData(staffService.getOrders);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<'ALL' | KanbanStage>('ALL');
  const [selected, setSelected] = useState<FulfillmentOrder | null>(null);
  const orders = useMemo(() => (data || []).filter(o =>
    (stage === 'ALL' || stage === o.stage) &&
    `${o.orderCode} ${o.customerName} ${o.customerPhone}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [data, search, stage]);
  return <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
    <div className="flex gap-3 flex-wrap justify-between"><h1 className="text-xl font-bold">Danh Sách Đơn Hàng Sản Xuất In 3D</h1><Link className="staff-button" to="/staff/fulfillment">Xem Bảng Kanban Điều Phối</Link></div>
    <p className="staff-muted">Tra cứu đơn đặt in đã thanh toán và lộ trình sản xuất.</p>
    <div className="flex gap-3 flex-wrap">
      <input className="staff-input flex-1" aria-label="Tìm đơn hàng" placeholder="Mã đơn, tên khách hoặc số điện thoại" value={search} onChange={e => setSearch(e.target.value)} />
      <select className="staff-input md:max-w-xs" aria-label="Lọc giai đoạn" value={stage} onChange={e => setStage(e.target.value as typeof stage)}>
        <option value="ALL">Tất cả giai đoạn</option><option value="AwaitingLab">Chờ gán xưởng</option><option value="LabAssigned">Xưởng tiếp nhận</option><option value="InProduction">Đang sản xuất</option><option value="QualityCheck">Chờ QC</option><option value="Delivery">Giao vận</option><option value="Unknown">Trạng thái khác</option>
      </select>
      <button className="staff-button" onClick={() => void reload()} disabled={loading}>Tải lại</button>
    </div>
    <StaffDataState loading={loading} error={error} empty={!orders.length} retry={reload} />
    {!loading && !error && orders.length > 0 && <div className="staff-panel overflow-x-auto"><table className="staff-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Vật liệu & Khổ</th><th>Trạm phân công</th><th>Giai đoạn</th><th>Chi tiết</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}>
      <td className="font-mono">{o.orderCode}</td><td>{o.customerName || 'Chưa có thông tin'}<p className="staff-muted">{o.customerPhone}</p></td><td>{o.material || 'Chưa có vật liệu'} / {o.heightMm ?? '—'} mm (x{o.quantity})</td><td>{o.assignment?.partnerLabName || o.assignment?.labName || o.assignment?.partnerLabId || 'Chưa phân công'}</td><td>{o.subStatus}</td><td><button className="staff-button" onClick={() => setSelected(o)}>Xem Lộ Trình</button></td>
    </tr>)}</tbody></table></div>}
    <StaffFulfillmentDrawer order={selected} onClose={() => setSelected(null)} />
  </div>;
}
