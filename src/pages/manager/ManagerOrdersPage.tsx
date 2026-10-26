import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useStaffData } from '../../hooks/useStaffData';
import { managerService } from '../../services/managerService';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { OrderDetailDrawer } from '../admin/orders/OrderDetailDrawer';
import { CancelOrderModal } from '../admin/orders/CancelOrderModal';
import { formatDateTime, formatVND, getFulfillmentStatusMeta, getPaymentStatusMeta } from '../admin/orders/orderStatus';

export function ManagerStatus({ status, payment = false }: { status?: string; payment?: boolean }) {
  return <span className="manager-status" data-status={status}>{(payment ? getPaymentStatusMeta(status) : getFulfillmentStatusMeta(status)).label}</span>;
}

export default function ManagerOrdersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useStaffData(managerService.getOrders);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [payment, setPayment] = useState('');
  const [page, setPage] = useState(1);
  const [cancel, setCancel] = useState<{ id: string; code: string } | null>(null);
  const orders = data || [];
  const filtered = orders.filter(order => (!stage || stage === (order.fulfillmentStatus || order.status)) && (!payment || payment === order.orderPaymentStatus) && `${order.orderCode} ${order.receiverName || ''} ${order.receiverPhone || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="manager-page">
    <div className="manager-heading"><div><h2>Quản lý đơn hàng</h2><p>Tra cứu, theo dõi lộ trình và xử lý yêu cầu hủy đơn.</p></div><Link className="staff-button" to="/manager/fulfillment">Bảng điều phối<ArrowRight size={14} /></Link></div>
    <div className="manager-metrics">{[['Tổng đơn hàng', orders.length], ['Đã thanh toán', orders.filter(o => o.orderPaymentStatus === 'Paid').length], ['Đã giao hàng', orders.filter(o => o.fulfillmentStatus === 'Delivered').length], ['Đã hủy', orders.filter(o => o.fulfillmentStatus === 'Cancelled').length]].map(([label, value]) => <div className="staff-panel manager-metric" key={label}><span>{label}</span><strong>{loading || error ? '—' : value}</strong></div>)}</div>
    <div className="manager-filters"><div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 staff-muted" size={16} /><input style={{ paddingLeft: 36 }} className="staff-input" aria-label="Tìm đơn hàng" placeholder="Mã đơn, khách hàng, số điện thoại..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div><select className="staff-input" aria-label="Lọc tiến độ" value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}><option value="">Tất cả tiến độ</option>{[...new Set(orders.map(o => o.fulfillmentStatus || o.status))].map(status => <option key={status} value={status}>{getFulfillmentStatusMeta(status).label}</option>)}</select><select className="staff-input" aria-label="Lọc thanh toán" value={payment} onChange={e => { setPayment(e.target.value); setPage(1); }}><option value="">Tất cả thanh toán</option>{[...new Set(orders.map(o => o.orderPaymentStatus).filter(Boolean))].map(status => <option key={status} value={status}>{getPaymentStatusMeta(status).label}</option>)}</select><button className="staff-button" disabled={loading} onClick={() => void reload()}><RefreshCw size={14} />Tải lại</button></div>
    <StaffDataState loading={loading} error={error} empty={!filtered.length} retry={reload} />
    {!loading && !error && visible.length > 0 && <><div className="staff-panel overflow-x-auto"><table className="staff-table"><thead><tr><th>Mã đơn / Ngày tạo</th><th>Khách hàng</th><th>Vật liệu / Số lượng</th><th>Tiến độ</th><th>Thanh toán</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead><tbody>{visible.map(order => <tr key={order.id}><td><Link className="manager-link font-mono" to={`/manager/orders/${order.id}`}>{order.orderCode}</Link><p className="staff-muted text-xs mt-1">{formatDateTime(order.createdAtUtc)}</p></td><td>{order.receiverName || '—'}<p className="staff-muted text-xs mt-1">{order.receiverPhone}</p></td><td>{order.material || '—'}<p className="staff-muted text-xs mt-1">{order.dimensions?.heightMm ?? '—'} mm · x{order.quantity}</p></td><td><ManagerStatus status={order.fulfillmentStatus || order.status} /></td><td><ManagerStatus status={order.orderPaymentStatus} payment /></td><td className="font-mono whitespace-nowrap">{formatVND(order.totalVnd)}</td><td><div className="flex gap-2"><button className="staff-button" onClick={() => navigate(`/manager/orders/${order.id}`)}>Chi tiết</button>{!['Cancelled', 'Delivered', 'Shipped', 'Shipping'].includes(order.fulfillmentStatus || order.status) && <button className="staff-button" onClick={() => setCancel({ id: order.id, code: order.orderCode })}>Hủy đơn</button>}</div></td></tr>)}</tbody></table></div><div className="manager-heading"><span className="manager-subtitle">{filtered.length} đơn · Trang {currentPage} / {pageCount}</span><div className="flex gap-2"><button className="staff-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</button><button className="staff-button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Trang sau</button></div></div></>}
    <OrderDetailDrawer orderId={id || null} onClose={() => navigate('/manager/orders')} onOrderUpdated={() => void reload()} />
    {cancel && <CancelOrderModal key={cancel.id} isOpen orderId={cancel.id} orderCode={cancel.code} onClose={() => setCancel(null)} onSuccess={() => void reload()} />}
  </div>;
}
