import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CreditCard, Package, RefreshCw, TriangleAlert } from 'lucide-react';
import { useStaffData, errorMessage } from '../../hooks/useStaffData';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { managerService } from '../../services/managerService';
import { notificationService } from '../../services/notificationService';
import { formatDateTime, formatVND, getFulfillmentStatusMeta, getPaymentStatusMeta } from '../admin/orders/orderStatus';
import { ManagerStatus } from './ManagerOrdersPage';

export default function ManagerDashboard() {
  const { data, loading, error, reload } = useStaffData(managerService.getOverview);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatchError, setDispatchError] = useState('');
  const report = data?.report;
  const commerce = report?.commerce;
  const paidTotal = data?.orders.filter(order => order.orderPaymentStatus === 'Paid').reduce((total, order) => total + order.totalVnd, 0);
  const latest = [...(data?.orders || [])].sort((a, b) => (b.createdAtUtc || '').localeCompare(a.createdAtUtc || '')).slice(0, 5);
  const metrics = [
    { label: 'Tổng đơn hàng', value: commerce?.totalOrders.toLocaleString('vi-VN'), detail: 'Toàn bộ đơn trên hệ thống', icon: Package },
    { label: 'Giá trị đơn đã thanh toán', value: paidTotal === undefined ? undefined : formatVND(paidTotal), detail: 'Tổng giá trị các đơn có trạng thái Paid', icon: CreditCard },
    { label: 'Tác vụ AI đang chạy', value: report?.aiGenerations.reduce((sum, provider) => sum + provider.runningJobs, 0).toLocaleString('vi-VN'), detail: 'Đang xử lý hoặc chờ xử lý', icon: Activity },
    { label: 'Giao dịch cần xử lý', value: commerce ? (commerce.paymentAttemptsNeedsAttention + commerce.refundsNeedsAttention).toLocaleString('vi-VN') : undefined, detail: 'Thanh toán và hoàn tiền cần đối soát', icon: TriangleAlert },
  ];
  const dispatch = async () => {
    if (dispatching) return;
    setDispatching(true); setDispatchMessage(''); setDispatchError('');
    try { const result = await notificationService.dispatchOutbox(); setDispatchMessage(result.message || `Đã xử lý ${result.dispatchedCount ?? 0} thông báo.`); await reload(); }
    catch (err) { setDispatchError(errorMessage(err)); }
    finally { setDispatching(false); }
  };
  return <div className="manager-page">
    <div className="manager-heading"><div><h2>Toàn cảnh vận hành</h2><p>Theo dõi đơn hàng, sản xuất và các giao dịch cần xử lý.</p></div><button className="staff-button" disabled={loading} onClick={() => void reload()}><RefreshCw size={14} />Làm mới dữ liệu</button></div>
    <StaffDataState loading={loading} error={error} retry={reload} />
    {!error && <div className="manager-metrics">{metrics.map(({ label, value, detail, icon: Icon }) => <div className="staff-panel manager-metric" key={label}><span>{label}<Icon size={17} /></span><strong>{loading ? '—' : value ?? '—'}</strong><small>{detail}</small></div>)}</div>}
    {!loading && !error && report && <>
      <p className="manager-subtitle">Cập nhật lúc {formatDateTime(report.timestampUtc)}</p>
      <div className="manager-grid">
        <section className="staff-panel"><h3 className="manager-panel-title">Tiến độ đơn hàng<Link to="/manager/fulfillment">Mở Kanban →</Link></h3><div className="manager-bars">{Object.entries(report.commerce.ordersByFulfillmentStatus).map(([status, count]) => <div key={status}><div className="manager-bar-label"><span>{getFulfillmentStatusMeta(status).label}</span><strong>{count}</strong></div><div className="manager-bar-track"><span style={{ width: `${report.commerce.totalOrders ? count / report.commerce.totalOrders * 100 : 0}%` }} /></div></div>)}{!report.commerce.totalOrders && <p className="staff-muted">Chưa có đơn hàng.</p>}</div></section>
        <section className="staff-panel"><h3 className="manager-panel-title">Thanh toán & đối soát<Link to="/manager/payments">Xử lý giao dịch →</Link></h3><div className="manager-bars">{Object.entries(report.commerce.ordersByPaymentStatus).map(([status, count]) => <div className="manager-bar-label" key={status}><ManagerStatus status={status} payment /><strong>{count}</strong></div>)}</div><p className="manager-note mt-5">{report.commerce.paymentAttemptsNeedsAttention} lượt thanh toán và {report.commerce.refundsNeedsAttention} lượt hoàn tiền cần kiểm tra.</p></section>
      </div>
      <section className="staff-panel overflow-x-auto"><h3 className="manager-panel-title">Đơn hàng gần đây<Link to="/manager/orders">Xem tất cả →</Link></h3>{latest.length ? <table className="staff-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tiến độ</th><th>Thanh toán</th><th>Tổng tiền</th></tr></thead><tbody>{latest.map(order => <tr key={order.id}><td><Link className="manager-link font-mono" to={`/manager/orders/${order.id}`}>{order.orderCode}</Link></td><td>{order.receiverName || '—'}</td><td><ManagerStatus status={order.fulfillmentStatus || order.status} /></td><td>{getPaymentStatusMeta(order.orderPaymentStatus).label}</td><td className="font-mono">{formatVND(order.totalVnd)}</td></tr>)}</tbody></table> : <p className="staff-muted">Chưa có đơn hàng.</p>}</section>
      <div className="manager-grid">
        <section className="staff-panel overflow-x-auto"><h3 className="manager-panel-title">Hiệu suất tạo mô hình AI</h3>{report.aiGenerations.length ? <table className="staff-table" style={{ minWidth: 360 }}><thead><tr><th>Nhà cung cấp</th><th>Thành công</th><th>Thất bại</th><th>Đang chạy</th></tr></thead><tbody>{report.aiGenerations.map(provider => <tr key={provider.provider}><td>{provider.provider}</td><td>{provider.succeededJobs}</td><td>{provider.failedJobs}</td><td>{provider.runningJobs}</td></tr>)}</tbody></table> : <p className="staff-muted">Chưa có tác vụ AI.</p>}</section>
        <section className="staff-panel"><h3 className="manager-panel-title">Thông báo vận hành<button className="staff-button" disabled={dispatching || !report.messaging.outboxPending} onClick={() => void dispatch()}>{dispatching ? 'Đang xử lý...' : 'Xử lý hàng đợi'}</button></h3><div className="manager-bars">{[['Đang chờ', report.messaging.outboxPending], ['Đã xử lý', report.messaging.outboxProcessed], ['Lỗi cần kiểm tra', report.messaging.outboxDeadLettered], ['Đã gửi / Đã đọc', `${report.messaging.notificationsDelivered} / ${report.messaging.notificationsRead}`]].map(([label, value]) => <div className="manager-bar-label" key={label}><span className="staff-muted">{label}</span><strong>{value}</strong></div>)}</div>{dispatchMessage && <p role="status" className="manager-note mt-4">{dispatchMessage}</p>}{dispatchError && <p role="alert" className="staff-error mt-4">{dispatchError}</p>}</section>
      </div>
    </>}
  </div>;
}
