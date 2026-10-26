import React, { useCallback, useEffect, useState } from 'react';
import {
  FaChartLine,
  FaBox,
  FaCreditCard,
  FaUndo,
  FaPaperPlane,
  FaSyncAlt,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaServer,
  FaBrain,
  FaExchangeAlt,
  FaCheckDouble,
  FaTimes,
  FaClock,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  observabilityService,
  type ObservabilityReportDto,
  type AiProviderMetricDto,
} from '../../../services/observabilityService';
import { StatusBadge } from '../components/StatusBadge';
import {
  FULFILLMENT_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  formatDateTime,
} from '../orders/orderStatus';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<ObservabilityReportDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchObservability = useCallback(async (showToastFeedback = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const report = await observabilityService.getObservabilityReport();
      setData(report);
      if (showToastFeedback) {
        toast.success('Đã cập nhật số liệu giám sát thời gian thực thành công.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo Observability.';
      setError(msg);
      toast.error(`Lỗi tải dữ liệu Observability: ${msg}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchObservability();
  }, [fetchObservability]);

  const handleDispatchOutbox = async () => {
    try {
      setIsDispatching(true);
      const res = await observabilityService.dispatchOutbox(50);
      const count = res.dispatchedCount ?? 0;
      toast.success(`Đã kích hoạt gửi Outbox thủ công thành công (${count} tin nhắn được xử lý).`);
      await fetchObservability();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kích hoạt giải phóng hàng đợi Outbox.';
      toast.error(msg);
    } finally {
      setIsDispatching(false);
    }
  };

  // Safe metrics fallbacks
  const totalOrders = data?.commerce?.totalOrders ?? 0;
  const paymentAttention = data?.commerce?.paymentAttemptsNeedsAttention ?? 0;
  const refundsAttention = data?.commerce?.refundsNeedsAttention ?? 0;
  const outboxPending = data?.messaging?.outboxPending ?? 0;

  // Fulfillment distribution calculations
  const fulfillmentDist = data?.commerce?.ordersByFulfillmentStatus ?? {};
  const fulfillmentTotal = Object.values(fulfillmentDist).reduce((sum, val) => sum + val, 0) || totalOrders || 1;

  // Payment distribution calculations
  const paymentDist = data?.commerce?.ordersByPaymentStatus ?? {};
  const paymentTotal = Object.values(paymentDist).reduce((sum, val) => sum + val, 0) || totalOrders || 1;

  // 3D AI Providers with known list coverage
  const knownProviders = ['Hunyuan3D', 'Meshy', 'Tripo'];
  const providerMetrics: AiProviderMetricDto[] = React.useMemo(() => {
    const fromApi = data?.aiGenerations ?? [];
    const map = new Map<string, AiProviderMetricDto>();
    fromApi.forEach((item) => {
      map.set(item.provider.toLowerCase(), item);
    });

    return knownProviders.map((name) => {
      const found = map.get(name.toLowerCase());
      if (found) return found;
      return {
        provider: name,
        totalJobs: 0,
        succeededJobs: 0,
        failedJobs: 0,
        runningJobs: 0,
      };
    });
  }, [data]);

  return (
    <div className="min-h-full space-y-6 pb-12 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Hệ Thống Quan Sát Thời Gian Thực • Telemetry v2
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-2.5">
            <FaChartLine className="text-cyan-400 text-xl" />
            <span>Tổng Quan &amp; Chỉ Số Vận Hành</span>
          </h1>
          <p className="text-xs text-white/60">
            Giám sát 2 trục thương mại, đối soát cổng thanh toán, giải phóng hàng đợi Outbox và hiệu năng AI 3D.
          </p>
        </div>

        {/* Operational Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDispatchOutbox}
            disabled={isDispatching}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Kích hoạt giải phóng hàng đợi Outbox"
          >
            {isDispatching ? (
              <FaSpinner className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FaPaperPlane className="w-3.5 h-3.5" />
            )}
            <span>Kích hoạt gửi Outbox thủ công</span>
          </button>

          <button
            type="button"
            onClick={() => fetchObservability(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5 text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all hover:bg-cyan-900/50 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Làm mới toàn bộ chỉ số từ server"
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới số liệu</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <FaExclamationTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <strong className="font-bold">Cảnh báo: </strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchObservability(false)}
            className="rounded bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-500/30"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 p-5"
            />
          ))}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* ROW 1: 4 KPI CARDS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Orders */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-bold uppercase tracking-wider text-cyan-300">Tổng Đơn Hàng</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                  <FaBox className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-3xl font-black text-white">
                  {totalOrders.toLocaleString('vi-VN')}
                </div>
                <p className="mt-1 text-xs text-white/50">Đơn đặt gia công trên toàn sàn</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-white/40">Fulfillment Statuses:</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {Object.keys(fulfillmentDist).length} trạng thái
                </span>
              </div>
            </div>

            {/* Card 2: Payment Attempts Needs Attention */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-bold uppercase tracking-wider text-amber-300">
                  Thanh Toán Cần Chú Ý
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-300">
                  <FaCreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-3xl font-black text-amber-400">
                  {paymentAttention}
                </div>
                <p className="mt-1 text-xs text-white/50">Ca PayOS Pending / Cần đối soát</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-white/40">Mức độ ưu tiên:</span>
                <StatusBadge
                  label={paymentAttention > 0 ? 'Cần xử lý ngay' : 'Bình thường'}
                  tone={paymentAttention > 0 ? 'amber' : 'green'}
                />
              </div>
            </div>

            {/* Card 3: Refunds Needs Attention */}
            <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-bold uppercase tracking-wider text-rose-300">
                  Hoàn Tiền Cần Chú Ý
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-950/40 text-rose-300">
                  <FaUndo className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-3xl font-black text-rose-400">
                  {refundsAttention}
                </div>
                <p className="mt-1 text-xs text-white/50">Yêu cầu hoàn tiền đang chờ duyệt</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-white/40">Trạng thái rủi ro:</span>
                <StatusBadge
                  label={refundsAttention > 0 ? 'Có khiếu nại' : 'An toàn'}
                  tone={refundsAttention > 0 ? 'rose' : 'green'}
                />
              </div>
            </div>

            {/* Card 4: Outbox Queue */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-bold uppercase tracking-wider text-emerald-300">
                  Hàng Đợi Outbox
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
                  <FaPaperPlane className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-3xl font-black text-emerald-400">
                  {outboxPending}
                </div>
                <p className="mt-1 text-xs text-white/50">Tin nhắn đang chờ chuyển đi</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-white/40">Đã gửi thành công:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {data?.messaging?.outboxProcessed ?? 0} tin
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ROW 2: DISTRIBUTION CHARTS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Chart 1: 2-Axis Orders Distribution (Fulfillment vs Payment) */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FaExchangeAlt className="text-cyan-400" />
                    <span>Phân Bổ Đơn Hàng 2 Trục (Fulfillment vs Payment)</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Đối chiếu tiến độ dây chuyền sản xuất và trạng thái dòng tiền thanh toán
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                    Tổng: {totalOrders} đơn
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Axis 1: Fulfillment Statuses */}
                <div className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      1. Tiến Độ Sản Xuất
                    </span>
                    <span className="text-[11px] font-mono text-white/40">Fulfillment</span>
                  </div>

                  {Object.keys(fulfillmentDist).length === 0 ? (
                    <p className="py-6 text-center text-xs text-white/40">Chưa có dữ liệu sản xuất</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(fulfillmentDist).map(([statusKey, count]) => {
                        const meta = FULFILLMENT_STATUS_MAP[statusKey] || {
                          label: statusKey,
                          tone: 'slate',
                        };
                        const pct = Math.round((count / fulfillmentTotal) * 100);
                        return (
                          <div key={statusKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/80 font-medium truncate max-w-[150px]">
                                {meta.label}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="font-bold text-white">{count}</span>
                                <span className="text-[10px] text-white/40">({pct}%)</span>
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Axis 2: Payment Statuses */}
                <div className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      2. Trạng Thái Thanh Toán
                    </span>
                    <span className="text-[11px] font-mono text-white/40">Payment</span>
                  </div>

                  {Object.keys(paymentDist).length === 0 ? (
                    <p className="py-6 text-center text-xs text-white/40">Chưa có dữ liệu thanh toán</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(paymentDist).map(([statusKey, count]) => {
                        const meta = PAYMENT_STATUS_MAP[statusKey] || {
                          label: statusKey,
                          tone: 'slate',
                        };
                        const pct = Math.round((count / paymentTotal) * 100);
                        return (
                          <div key={statusKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/80 font-medium truncate max-w-[150px]">
                                {meta.label}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="font-bold text-white">{count}</span>
                                <span className="text-[10px] text-white/40">({pct}%)</span>
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart 2: 3D AI Provider Performance */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FaBrain className="text-cyan-400" />
                    <span>Hiệu Suất Nhà Cung Cấp AI 3D</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Tỷ lệ Succeeded, Failed, Running trên từng engine
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {providerMetrics.map((p) => {
                  const total = p.totalJobs || 0;
                  const succPct = total > 0 ? Math.round((p.succeededJobs / total) * 100) : 0;
                  const failPct = total > 0 ? Math.round((p.failedJobs / total) * 100) : 0;
                  const runPct = total > 0 ? Math.round((p.runningJobs / total) * 100) : 0;

                  return (
                    <div
                      key={p.provider}
                      className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-cyan-300 font-mono">
                            {p.provider}
                          </span>
                          <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/60">
                            {total} jobs
                          </span>
                        </div>
                        <StatusBadge
                          label={failPct > 30 ? 'Cảnh báo lỗi cao' : succPct > 70 ? 'Ổn định' : 'Hoạt động'}
                          tone={failPct > 30 ? 'rose' : succPct > 70 ? 'green' : 'cyan'}
                        />
                      </div>

                      {/* Stacked bar */}
                      <div className="space-y-1.5">
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5 gap-0.5">
                          {succPct > 0 && (
                            <div
                              style={{ width: `${succPct}%` }}
                              className="bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500"
                              title={`Succeeded: ${p.succeededJobs} (${succPct}%)`}
                            />
                          )}
                          {runPct > 0 && (
                            <div
                              style={{ width: `${runPct}%` }}
                              className="bg-cyan-500 shadow-[0_0_8px_rgba(0,240,255,0.5)] transition-all duration-500"
                              title={`Running: ${p.runningJobs} (${runPct}%)`}
                            />
                          )}
                          {failPct > 0 && (
                            <div
                              style={{ width: `${failPct}%` }}
                              className="bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500"
                              title={`Failed: ${p.failedJobs} (${failPct}%)`}
                            />
                          )}
                        </div>

                        {/* Breakdown counters */}
                        <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] font-mono text-center">
                          <div className="rounded bg-emerald-950/20 border border-emerald-500/20 py-1 px-1.5">
                            <span className="text-emerald-400 block font-bold">{p.succeededJobs}</span>
                            <span className="text-white/40 text-[9px]">Succeeded ({succPct}%)</span>
                          </div>
                          <div className="rounded bg-cyan-950/20 border border-cyan-500/20 py-1 px-1.5">
                            <span className="text-cyan-400 block font-bold">{p.runningJobs}</span>
                            <span className="text-white/40 text-[9px]">Running ({runPct}%)</span>
                          </div>
                          <div className="rounded bg-rose-950/20 border border-rose-500/20 py-1 px-1.5">
                            <span className="text-rose-400 block font-bold">{p.failedJobs}</span>
                            <span className="text-white/40 text-[9px]">Failed ({failPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ROW 3: MESSAGING DETAILS & SECURITY FILTER SHIELD */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Outbox & Notifications Telemetry */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FaServer className="text-emerald-400" />
                  <span>Chi Tiết Hàng Đợi Outbox &amp; Thông Báo In-App</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Active Broker
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1">
                  <span className="text-white/50 block">Tin Outbox đã xử lý:</span>
                  <div className="font-mono text-xl font-bold text-white flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400 text-sm" />
                    <span>{data?.messaging?.outboxProcessed ?? 0}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1">
                  <span className="text-white/50 block">Tin Outbox chết (Dead-Letter):</span>
                  <div className="font-mono text-xl font-bold text-rose-400 flex items-center gap-2">
                    <FaTimes className="text-rose-400 text-sm" />
                    <span>{data?.messaging?.outboxDeadLettered ?? 0}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1">
                  <span className="text-white/50 block">Thông báo đã gửi (Delivered):</span>
                  <div className="font-mono text-xl font-bold text-cyan-300 flex items-center gap-2">
                    <FaPaperPlane className="text-cyan-400 text-sm" />
                    <span>{data?.messaging?.notificationsDelivered ?? 0}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1">
                  <span className="text-white/50 block">Thông báo đã đọc (Read):</span>
                  <div className="font-mono text-xl font-bold text-emerald-300 flex items-center gap-2">
                    <FaCheckDouble className="text-emerald-400 text-sm" />
                    <span>{data?.messaging?.notificationsRead ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Shield & Timestamp */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FaShieldAlt className="text-cyan-400" />
                  <span>Bộ Lọc &amp; Khiên Bảo Mật Dữ Liệu</span>
                </h3>
                <StatusBadge label="Protected" tone="green" />
              </div>

              <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
                  <FaCheckCircle className="text-emerald-400 shrink-0" />
                  <span>{data?.securityFilterStatus || 'PiiAndSecretRedactor Active. Secrets/Tokens are shielded.'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Tất cả tham số nhạy cảm (JWT Secret, API Key, Token, PayOS Credentials) và thông tin cá nhân (PII) đều được khử định danh tự động trước khi xuất ra hệ thống quan sát.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                <span className="flex items-center gap-1.5">
                  <FaClock className="text-white/40" />
                  <span>Đồng bộ lần cuối:</span>
                </span>
                <span className="font-mono text-white/80">
                  {data?.timestampUtc ? formatDateTime(data.timestampUtc) : '—'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
