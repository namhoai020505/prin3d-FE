import { useCallback, useRef, useState, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useStaffData, errorMessage } from '../../hooks/useStaffData';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { managerService } from '../../services/managerService';
import { paymentService } from '../../services/paymentService';
import { formatDateTime, formatVND } from '../admin/orders/orderStatus';

const paymentLabels: Record<string, string> = { Pending: 'Đang chờ', Succeeded: 'Thành công', Failed: 'Thất bại', NeedsAttention: 'Cần đối soát', Expired: 'Hết hạn', Submitted: 'Đã gửi', Requested: 'Đã yêu cầu', Approved: 'Đã duyệt' };

function Transactions({ orderId, refreshOrders }: { orderId: string; refreshOrders: () => Promise<void> }) {
  const load = useCallback(async () => {
    const [attempts, refunds] = await Promise.all([paymentService.getPaymentAttempts(orderId), paymentService.getOrderRefunds(orderId)]);
    return { attempts, refunds };
  }, [orderId]);
  const { data, loading, error, reload } = useStaffData(load);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [actionError, setActionError] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const captured = data?.attempts.filter(a => a.status === 'Succeeded').reduce((sum, a) => sum + a.amountVnd, 0) || 0;
  const reserved = data?.refunds.filter(r => r.status !== 'Failed').reduce((sum, r) => sum + r.amountVnd, 0) || 0;
  const refundable = Math.max(0, captured - reserved);
  const mutate = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setActionError('');
    try { await action(); toast.success('Đã lưu kết quả xử lý giao dịch.'); setRefundOpen(false); setAmount(''); setReason(''); await reload(); await refreshOrders(); }
    catch (err) { setActionError(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  const refund = (event: FormEvent) => {
    event.preventDefault();
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > refundable || reason.trim().length < 3) { setActionError('Nhập số tiền trong hạn mức còn lại và lý do từ 3 ký tự.'); return; }
    void mutate(() => paymentService.createRefund(orderId, { amountVnd: Number(amount), reason: reason.trim() }));
  };
  return <>
    <StaffDataState loading={loading} error={error} retry={reload} />
    {actionError && <p role="alert" className="staff-error">{actionError}</p>}
    {!loading && !error && data && <>
      <section className="staff-panel overflow-x-auto"><h3 className="manager-panel-title">Lịch sử thanh toán<button className="staff-button" disabled={busy || loading} onClick={() => void reload()}><RefreshCw size={14} />Cập nhật</button></h3>{data.attempts.length ? <table className="staff-table"><thead><tr><th>Mã tham chiếu</th><th>Cổng thanh toán</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>{data.attempts.map(attempt => <tr key={attempt.id}><td className="font-mono">{attempt.merchantReference}</td><td>{attempt.gateway}</td><td className="font-mono">{formatVND(attempt.amountVnd)}</td><td><span className="manager-status" data-status={attempt.status}>{paymentLabels[attempt.status] || attempt.status}</span>{attempt.failureReason && <p className="staff-error mt-2">{attempt.failureReason}</p>}</td><td>{formatDateTime(attempt.createdAtUtc)}</td><td>{['Pending', 'NeedsAttention'].includes(attempt.status) && <button className="staff-button" disabled={busy} onClick={() => void mutate(() => paymentService.reconcilePaymentAttempt(attempt.id))}>Đối soát thanh toán</button>}</td></tr>)}</tbody></table> : <p className="staff-muted">Đơn hàng chưa có lượt thanh toán.</p>}</section>
      <section className="staff-panel overflow-x-auto"><h3 className="manager-panel-title">Hoàn tiền<button className="staff-button" disabled={busy || refundable <= 0} onClick={() => setRefundOpen(true)}>Tạo yêu cầu hoàn tiền</button></h3><p className="manager-subtitle mb-4">Số tiền còn có thể hoàn: {formatVND(refundable)}</p>{data.refunds.length ? <table className="staff-table"><thead><tr><th>Mã hoàn tiền</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>{data.refunds.map(item => <tr key={item.id}><td className="font-mono">{item.id}</td><td>{formatVND(item.amountVnd)}</td><td>{item.reason || '—'}</td><td><span className="manager-status" data-status={item.status}>{paymentLabels[item.status] || item.status}</span></td><td>{formatDateTime(item.createdAtUtc)}</td><td>{['Submitted', 'NeedsAttention'].includes(item.status) && <button className="staff-button" disabled={busy} onClick={() => void mutate(() => paymentService.reconcileRefund(item.id))}>Đối soát hoàn tiền</button>}</td></tr>)}</tbody></table> : <p className="staff-muted">Chưa có yêu cầu hoàn tiền.</p>}</section>
      {refundOpen && <div className="staff-overlay"><form className="staff-panel space-y-4" role="dialog" aria-modal="true" aria-labelledby="refund-title" onSubmit={refund}><h3 id="refund-title" className="font-bold text-lg">Tạo yêu cầu hoàn tiền</h3><p className="staff-muted">Hạn mức còn lại: {formatVND(refundable)}</p>{actionError && <p className="staff-error" role="alert">{actionError}</p>}<fieldset disabled={busy} className="space-y-4"><label>Số tiền (VND)<input autoFocus required className="staff-input mt-2" type="number" min="1" max={refundable} step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Lý do hoàn tiền<textarea required minLength={3} maxLength={1000} className="staff-input mt-2" value={reason} onChange={e => setReason(e.target.value)} /></label><div className="flex justify-end gap-3"><button type="button" className="staff-button" onClick={() => { setRefundOpen(false); setActionError(''); }}>Đóng</button><button className="staff-button" type="submit">{busy ? 'Đang gửi...' : 'Xác nhận hoàn tiền'}</button></div></fieldset></form></div>}
    </>}
  </>;
}

export default function ManagerPaymentsPage() {
  const { data: orders, loading, error, reload } = useStaffData(managerService.getOrders);
  const [orderId, setOrderId] = useState('');
  const selectedOrder = orders?.find(order => order.id === orderId);
  return <div className="manager-page"><div className="manager-heading"><div><h2>Thanh toán & hoàn tiền</h2><p>Kiểm tra lịch sử và đối soát giao dịch theo đơn hàng.</p></div><button className="staff-button" disabled={loading} onClick={() => void reload()}><RefreshCw size={14} />Tải lại đơn hàng</button></div><StaffDataState loading={loading} error={error} empty={!orders?.length} retry={reload} /><label className="staff-panel">Chọn đơn hàng<select className="staff-input mt-2" aria-label="Chọn đơn hàng thanh toán" value={selectedOrder?.id || ''} onChange={e => setOrderId(e.target.value)} disabled={loading || Boolean(error)}><option value="">Chọn đơn cần kiểm tra giao dịch</option>{orders?.map(order => <option key={order.id} value={order.id}>{order.orderCode} · {order.receiverName || '—'} · {formatVND(order.totalVnd)}</option>)}</select></label>{selectedOrder ? <Transactions key={selectedOrder.id} orderId={selectedOrder.id} refreshOrders={reload} /> : !loading && !error && Boolean(orders?.length) && <p className="manager-note">Chọn một đơn hàng để xem lịch sử thanh toán và hoàn tiền.</p>}</div>;
}
