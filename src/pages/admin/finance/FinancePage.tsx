import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  FaCreditCard,
  FaUndo,
  FaSyncAlt,
  FaSearch,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaPlus,
  FaShieldAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import {
  paymentService,
  type PaymentAttemptDto,
  type RefundDto,
} from '../../../services/paymentService';
import {
  adminOrderService,
  type OrderSummaryItem,
} from '../../../services/admin/adminOrderService';
import { StatusBadge, type StatusBadgeTone } from '../components/StatusBadge';
import { DataTable, type Column } from '../components/DataTable';
import { formatVND, formatDateTime } from '../orders/orderStatus';

interface EnrichedPaymentAttempt extends PaymentAttemptDto {
  orderCode: string;
  orderTotalVnd?: number;
}

interface EnrichedRefund extends RefundDto {
  orderCode: string;
  orderTotalVnd?: number;
}

export const FinancePage: React.FC = () => {
  // Tab state: 'reconciliation' | 'refunds'
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'refunds'>('reconciliation');

  // Orders and data state
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [paymentAttempts, setPaymentAttempts] = useState<EnrichedPaymentAttempt[]>([]);
  const [refunds, setRefunds] = useState<EnrichedRefund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Action loading states
  const [reconcilingAttemptId, setReconcilingAttemptId] = useState<string | null>(null);

  // Reconcile refund modal state
  const [reconcileRefundTarget, setReconcileRefundTarget] = useState<EnrichedRefund | null>(null);
  const [reconcileNote, setReconcileNote] = useState<string>('');
  const [reconcileSubmitting, setReconcileSubmitting] = useState<boolean>(false);

  // Create refund modal state
  const [isCreateRefundOpen, setIsCreateRefundOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState<boolean>(false);
  const [createRefundError, setCreateRefundError] = useState<string | null>(null);

  // Accessible IDs for form controls
  const searchInputId = useId();
  const statusFilterSelectId = useId();
  const orderSelectId = useId();
  const refundAmountInputId = useId();
  const refundReasonTextareaId = useId();
  const reconcileNoteInputId = useId();

  // Load finance data
  const loadFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch orders list
      const fetchedOrders = await adminOrderService.getOrders(1);
      setOrders(fetchedOrders);

      const orderMap = new Map<string, OrderSummaryItem>();
      fetchedOrders.forEach((o) => {
        orderMap.set(o.id, o);
      });

      // 2. Fetch payment attempts for all orders
      const allAttempts: EnrichedPaymentAttempt[] = [];
      const allRefunds: EnrichedRefund[] = [];

      await Promise.all(
        fetchedOrders.map(async (order) => {
          try {
            // Get payment attempts
            const attempts = await paymentService.getPaymentAttempts(order.id);
            if (Array.isArray(attempts)) {
              attempts.forEach((att) => {
                allAttempts.push({
                  ...att,
                  orderCode: order.orderCode || att.merchantReference || 'TB-ORDER',
                  orderTotalVnd: order.totalVnd,
                });
              });
            }
          } catch {
            // If payment attempts query fails for an order, continue
          }

          try {
            // Get order refunds
            const orderRefunds = await paymentService.getOrderRefunds(order.id);
            if (Array.isArray(orderRefunds)) {
              orderRefunds.forEach((ref) => {
                allRefunds.push({
                  ...ref,
                  orderCode: order.orderCode || 'TB-ORDER',
                  orderTotalVnd: order.totalVnd,
                });
              });
            }
          } catch {
            // If refunds query fails for an order, continue
          }
        }),
      );

      // Sort by newest first
      allAttempts.sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
      allRefunds.sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());

      setPaymentAttempts(allAttempts);
      setRefunds(allRefunds);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu tài chính.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Handle Payment Reconciliation action
  const handleReconcilePayment = async (attempt: EnrichedPaymentAttempt) => {
    try {
      setReconcilingAttemptId(attempt.id);
      const res = await paymentService.reconcilePaymentAttempt(attempt.id);

      const successMsg = res.message || `Đối soát đơn ${attempt.orderCode} hoàn tất: ${res.status || 'Thành công'}`;
      toast.success(successMsg);

      // Update attempt in local state immediately
      setPaymentAttempts((prev) =>
        prev.map((item) =>
          item.id === attempt.id
            ? { ...item, status: res.status || 'Succeeded' }
            : item,
        ),
      );

      // Refresh data
      loadFinanceData();
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { message?: string } } };
      const msg = errResponse?.response?.data?.message || 'Lỗi đối soát thanh toán PayOS.';
      toast.error(msg);
    } finally {
      setReconcilingAttemptId(null);
    }
  };

  // Open Reconcile Refund Modal
  const handleOpenReconcileRefund = (refund: EnrichedRefund) => {
    setReconcileRefundTarget(refund);
    setReconcileNote('Đối soát kiểm tra cổng thanh toán PayOS');
  };

  // Submit Reconcile Refund
  const handleSubmitReconcileRefund = async () => {
    if (!reconcileRefundTarget) return;
    try {
      setReconcileSubmitting(true);
      const res = await paymentService.reconcileRefund(reconcileRefundTarget.id, reconcileNote);
      toast.success(res.message || 'Đối soát hoàn tiền thành công!');
      setReconcileRefundTarget(null);
      loadFinanceData();
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { message?: string } } };
      const msg = errResponse?.response?.data?.message || 'Lỗi đối soát hoàn tiền.';
      toast.error(msg);
    } finally {
      setReconcileSubmitting(false);
    }
  };

  // Open Create Refund Modal
  const handleOpenCreateRefund = (preselectedOrderId?: string) => {
    setSelectedOrderId(preselectedOrderId || (orders.length > 0 ? orders[0].id : ''));
    setRefundAmount('');
    setRefundReason('');
    setIdempotencyKey(uuidv4());
    setCreateRefundError(null);
    setIsCreateRefundOpen(true);
  };

  // Selected order details for refund validation
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const maxRefundableAmount = selectedOrder ? selectedOrder.totalVnd : 0;
  const parsedRefundAmount = Number(refundAmount) || 0;
  const isAmountValid = parsedRefundAmount > 0 && parsedRefundAmount <= maxRefundableAmount;
  const isReasonValid = refundReason.trim().length >= 10;
  const isCreateRefundFormValid = isAmountValid && isReasonValid && !!selectedOrderId;

  // Submit Create Refund
  const handleSubmitCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreateRefundFormValid) {
      if (!isAmountValid) {
        setCreateRefundError(
          `Số tiền hoàn phải lớn hơn 0 và không vượt quá tổng đơn hàng (${formatVND(maxRefundableAmount)}).`,
        );
      } else if (!isReasonValid) {
        setCreateRefundError('Lý do hoàn tiền bắt buộc từ 10 ký tự trở lên.');
      }
      return;
    }

    try {
      setIsSubmittingRefund(true);
      setCreateRefundError(null);

      const generatedKey = idempotencyKey || uuidv4();

      await paymentService.createRefund(
        selectedOrderId,
        {
          amountVnd: parsedRefundAmount,
          reason: refundReason.trim(),
        },
        generatedKey,
      );

      toast.success('Tạo lệnh hoàn tiền thành công!');
      setIsCreateRefundOpen(false);
      loadFinanceData();
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { message?: string } } };
      const msg = errResponse?.response?.data?.message || 'Không thể tạo lệnh hoàn tiền.';
      setCreateRefundError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  // Filtered payment attempts
  const filteredAttempts = useMemo(() => {
    return paymentAttempts.filter((att) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = att.orderCode?.toLowerCase().includes(query);
        const refMatch = att.merchantReference?.toLowerCase().includes(query);
        const gatewayMatch = att.gateway?.toLowerCase().includes(query);
        if (!codeMatch && !refMatch && !gatewayMatch) return false;
      }
      if (statusFilter !== 'ALL') {
        if (att.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [paymentAttempts, searchTerm, statusFilter]);

  // Filtered refunds
  const filteredRefunds = useMemo(() => {
    return refunds.filter((ref) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = ref.orderCode?.toLowerCase().includes(query);
        const reasonMatch = ref.reason?.toLowerCase().includes(query);
        const idMatch = ref.id?.toLowerCase().includes(query);
        if (!codeMatch && !reasonMatch && !idMatch) return false;
      }
      if (statusFilter !== 'ALL') {
        if (ref.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [refunds, searchTerm, statusFilter]);

  // Status badge styling helper for attempts
  const getAttemptStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    let tone: StatusBadgeTone = 'slate';
    let label = status;

    if (s === 'succeeded' || s === 'paid') {
      tone = 'green';
      label = 'Thành công';
    } else if (s === 'pending') {
      tone = 'amber';
      label = 'Đang xử lý';
    } else if (s === 'needsattention') {
      tone = 'rose';
      label = 'Cần đối soát';
    } else if (s === 'failed') {
      tone = 'red';
      label = 'Thất bại';
    } else if (s === 'expired') {
      tone = 'slate';
      label = 'Đã hết hạn';
    }

    return <StatusBadge label={label} tone={tone} />;
  };

  // Status badge styling helper for refunds
  const getRefundStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    let tone: StatusBadgeTone = 'slate';
    let label = status;

    if (s === 'succeeded') {
      tone = 'green';
      label = 'Hoàn tất';
    } else if (s === 'submitted') {
      tone = 'cyan';
      label = 'Đã gửi cổng';
    } else if (s === 'pending') {
      tone = 'amber';
      label = 'Chờ xử lý';
    } else if (s === 'needsattention') {
      tone = 'rose';
      label = 'Cần đối soát';
    } else if (s === 'failed') {
      tone = 'red';
      label = 'Thất bại';
    }

    return <StatusBadge label={label} tone={tone} />;
  };

  // Column definitions for Payment Attempts
  const attemptColumns: Column<EnrichedPaymentAttempt>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn hàng',
      render: (item) => (
        <div>
          <span className="font-mono text-cyan-400 font-semibold tracking-wide block">
            {item.orderCode}
          </span>
          <span className="text-[10px] text-slate-500 font-mono truncate block max-w-[140px]">
            {item.merchantReference}
          </span>
        </div>
      ),
    },
    {
      key: 'gateway',
      header: 'Cổng thanh toán',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
          <FaCreditCard className="text-cyan-400 text-[10px]" />
          {item.gateway || 'PayOS'}
        </span>
      ),
    },
    {
      key: 'amountVnd',
      header: 'Số tiền (VNĐ)',
      render: (item) => (
        <span className="font-mono font-bold text-white tracking-wide text-xs">
          {formatVND(item.amountVnd)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (item) => getAttemptStatusBadge(item.status),
    },
    {
      key: 'createdAtUtc',
      header: 'Thời gian tạo',
      render: (item) => (
        <span className="text-slate-400 text-[11px]">
          {formatDateTime(item.createdAtUtc)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (item) => {
        const isReconciling = reconcilingAttemptId === item.id;
        return (
          <button
            onClick={() => handleReconcilePayment(item)}
            disabled={isReconciling}
            title="Kiểm tra trạng thái thanh toán trên cổng PayOS"
            className="btn-pooled-cyan px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,240,255,0.2)]"
          >
            <FaSyncAlt className={`text-[10px] ${isReconciling ? 'animate-spin' : ''}`} />
            <span>{isReconciling ? 'Đang đối soát...' : 'Kiểm tra & Đối soát PayOS'}</span>
          </button>
        );
      },
    },
  ];

  // Column definitions for Refunds
  const refundColumns: Column<EnrichedRefund>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn hàng',
      render: (item) => (
        <div>
          <span className="font-mono text-cyan-400 font-semibold tracking-wide block">
            {item.orderCode}
          </span>
          <span className="text-[10px] text-slate-500 font-mono truncate block max-w-[140px]">
            {item.id}
          </span>
        </div>
      ),
    },
    {
      key: 'amountVnd',
      header: 'Số tiền hoàn',
      render: (item) => (
        <span className="font-mono font-bold text-rose-300 tracking-wide text-xs">
          {formatVND(item.amountVnd)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Lý do hoàn',
      render: (item) => (
        <span className="text-slate-300 text-xs line-clamp-2 max-w-[220px]" title={item.reason}>
          {item.reason || 'Không có ghi chú'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (item) => getRefundStatusBadge(item.status),
    },
    {
      key: 'createdAtUtc',
      header: 'Ngày lập lệnh',
      render: (item) => (
        <span className="text-slate-400 text-[11px]">
          {formatDateTime(item.createdAtUtc)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (item) => {
        const isReconciling = reconcileSubmitting && reconcileRefundTarget?.id === item.id;
        return (
          <button
            onClick={() => handleOpenReconcileRefund(item)}
            disabled={isReconciling}
            title="Đối soát lệnh hoàn tiền qua cổng thanh toán"
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FaUndo className="text-[10px]" />
            <span>Đối Soát Hoàn Tiền</span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="min-h-full bg-[#090D14] text-white p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FaCreditCard className="text-sm" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Giao Dịch & Hoàn Tiền
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-10.5">
            Quản lý dòng tiền, đối soát giao dịch PayOS và xử lý hoàn tiền đơn hàng trực tuyến
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3 pl-10.5 md:pl-0">
          <button
            onClick={() => loadFinanceData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu tài chính"
          >
            <FaSyncAlt className={`text-xs text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {activeTab === 'refunds' && (
            <button
              onClick={() => handleOpenCreateRefund()}
              className="btn-pooled-cyan px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              <FaPlus className="text-xs" />
              <span>Tạo Lệnh Hoàn Tiền</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        <button
          onClick={() => {
            setActiveTab('reconciliation');
            setStatusFilter('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
            activeTab === 'reconciliation'
              ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/30 border-b-transparent shadow-[0_-2px_10px_rgba(0,240,255,0.1)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.02]'
          }`}
        >
          <FaCreditCard className="text-xs" />
          <span>Đối Soát Thanh Toán</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-slate-300">
            {paymentAttempts.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('refunds');
            setStatusFilter('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t border-x ${
            activeTab === 'refunds'
              ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/30 border-b-transparent shadow-[0_-2px_10px_rgba(0,240,255,0.1)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.02]'
          }`}
        >
          <FaUndo className="text-xs" />
          <span>Quản Lý Hoàn Tiền</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-slate-300">
            {refunds.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Tìm kiếm theo mã đơn hoặc mã tham chiếu
          </label>
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            id={searchInputId}
            type="text"
            placeholder={
              activeTab === 'reconciliation'
                ? 'Tìm kiếm theo mã đơn hoặc mã tham chiếu...'
                : 'Tìm kiếm theo mã đơn hoặc lý do hoàn...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0F17] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusFilterSelectId} className="text-xs text-slate-400 whitespace-nowrap">
            Trạng thái:
          </label>
          <select
            id={statusFilterSelectId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {activeTab === 'reconciliation' ? (
              <>
                <option value="NeedsAttention">Cần đối soát (NeedsAttention)</option>
                <option value="Pending">Đang xử lý (Pending)</option>
                <option value="Succeeded">Thành công (Succeeded)</option>
                <option value="Failed">Thất bại (Failed)</option>
              </>
            ) : (
              <>
                <option value="Submitted">Đã gửi cổng (Submitted)</option>
                <option value="NeedsAttention">Cần đối soát (NeedsAttention)</option>
                <option value="Succeeded">Hoàn tất (Succeeded)</option>
                <option value="Failed">Thất bại (Failed)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        {activeTab === 'reconciliation' ? (
          <DataTable<EnrichedPaymentAttempt>
            columns={attemptColumns}
            data={filteredAttempts}
            loading={loading}
            error={error}
            keyExtractor={(item) => item.id}
            emptyTitle="Chưa có giao dịch thanh toán"
            emptyDescription="Không tìm thấy lịch sử thanh toán nào phù hợp với bộ lọc hiện tại."
          />
        ) : (
          <DataTable<EnrichedRefund>
            columns={refundColumns}
            data={filteredRefunds}
            loading={loading}
            error={error}
            keyExtractor={(item) => item.id}
            emptyTitle="Chưa có lệnh hoàn tiền"
            emptyDescription="Chưa có yêu cầu hoặc lịch sử hoàn tiền nào được ghi nhận."
          />
        )}
      </div>

      {/* Modal: Tạo Lệnh Hoàn Tiền */}
      {isCreateRefundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0D121F] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FaUndo className="text-xs" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tạo Lệnh Hoàn Tiền Mới
                </h2>
              </div>
              <button
                onClick={() => setIsCreateRefundOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCreateRefund} className="p-6 space-y-4">
              {createRefundError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <FaExclamationTriangle className="shrink-0" />
                  <span>{createRefundError}</span>
                </div>
              )}

              {/* Order Selection */}
              <div>
                <label htmlFor={orderSelectId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chọn đơn hàng cần hoàn tiền <span className="text-rose-400">*</span>
                </label>
                <select
                  id={orderSelectId}
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setRefundAmount('');
                  }}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer font-mono"
                >
                  <option value="">-- Chọn đơn hàng --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderCode} — {o.receiverName || 'Khách hàng'} — {formatVND(o.totalVnd)} ({o.orderPaymentStatus || o.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Info Card */}
              {selectedOrder && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Tổng giá trị đơn hàng:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {formatVND(selectedOrder.totalVnd)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Trạng thái thanh toán:</span>
                    <span className="text-slate-200 font-semibold">
                      {selectedOrder.orderPaymentStatus || 'Unpaid'}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={refundAmountInputId} className="text-xs font-semibold text-slate-300">
                    Số tiền hoàn (VNĐ) <span className="text-rose-400">*</span>
                  </label>
                  {selectedOrder && (
                    <button
                      type="button"
                      onClick={() => setRefundAmount(String(maxRefundableAmount))}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                    >
                      Toàn bộ ({formatVND(maxRefundableAmount)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id={refundAmountInputId}
                    type="number"
                    min="1"
                    max={maxRefundableAmount || undefined}
                    placeholder="Nhập số tiền hoàn (VNĐ)"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                    VNĐ
                  </span>
                </div>
                {parsedRefundAmount > maxRefundableAmount && (
                  <p className="text-[11px] text-rose-400 mt-1">
                    Số tiền hoàn không được vượt quá {formatVND(maxRefundableAmount)}.
                  </p>
                )}
              </div>

              {/* Reason Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={refundReasonTextareaId} className="text-xs font-semibold text-slate-300">
                    Lý do hoàn tiền <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      refundReason.trim().length >= 10 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {refundReason.trim().length} / 10 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  id={refundReasonTextareaId}
                  rows={3}
                  placeholder="Nhập chi tiết lý do hoàn tiền (tối thiểu 10 ký tự)..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
                {refundReason.trim().length > 0 && refundReason.trim().length < 10 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Vui lòng nhập thêm ít nhất {10 - refundReason.trim().length} ký tự nữa.
                  </p>
                )}
              </div>

              {/* Idempotency Key Info */}
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-cyan-300 font-mono truncate mr-2">
                  <FaShieldAlt className="text-cyan-400 shrink-0" />
                  <span className="text-slate-400">Key:</span>
                  <span className="truncate">{idempotencyKey}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(uuidv4())}
                  className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold uppercase shrink-0 cursor-pointer"
                >
                  Đổi Key
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateRefundOpen(false)}
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!isCreateRefundFormValid || isSubmittingRefund}
                  className="btn-pooled-cyan px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                >
                  {isSubmittingRefund ? (
                    <>
                      <FaSyncAlt className="animate-spin text-xs" />
                      <span>Đang tạo lệnh...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-xs" />
                      <span>Xác nhận Hoàn Tiền</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đối Soát Lệnh Hoàn Tiền */}
      {reconcileRefundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D121F] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <FaUndo className="text-cyan-400 text-xs" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Đối Soát Lệnh Hoàn Tiền
                </h2>
              </div>
              <button
                onClick={() => setReconcileRefundTarget(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã đơn hàng:</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {reconcileRefundTarget.orderCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số tiền hoàn:</span>
                  <span className="font-mono text-rose-300 font-bold">
                    {formatVND(reconcileRefundTarget.amountVnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái hiện tại:</span>
                  <span className="font-semibold text-slate-200">
                    {reconcileRefundTarget.status}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor={reconcileNoteInputId} className="block text-slate-300 font-semibold mb-1">
                  Ghi chú đối soát (tùy chọn)
                </label>
                <input
                  id={reconcileNoteInputId}
                  type="text"
                  placeholder="Ghi chú xác thực hoàn tiền..."
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReconcileRefundTarget(null)}
                  disabled={reconcileSubmitting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReconcileRefund}
                  disabled={reconcileSubmitting}
                  className="btn-pooled-cyan px-4 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {reconcileSubmitting ? (
                    <>
                      <FaSyncAlt className="animate-spin text-[10px]" />
                      <span>Đang đối soát...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-[10px]" />
                      <span>Xác nhận Đối Soát</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
