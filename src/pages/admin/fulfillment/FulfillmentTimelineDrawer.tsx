import React, { useEffect, useState } from 'react';
import {
  FaTimes,
  FaSpinner,
  FaIndustry,
  FaShippingFast,
  FaPrint,
  FaBarcode,
} from 'react-icons/fa';
import {
  fulfillmentService,
  type FulfillmentTimelineDto,
  type PartnerAssignmentDto,
  type ProductionRunDto,
  type ShipmentDto,
} from '../../../services/fulfillmentService';
import StatusBadge from '../components/StatusBadge';

interface FulfillmentTimelineDrawerProps {
  orderId: string | null;
  orderCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent?: () => void;
}

const formatVnDateTime = (utcDate?: string | null) => {
  if (!utcDate) return '—';
  try {
    return new Date(utcDate).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return utcDate;
  }
};

const formatCurrency = (val?: number | null) => {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const FulfillmentTimelineDrawer: React.FC<FulfillmentTimelineDrawerProps> = ({
  orderId,
  orderCode,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<FulfillmentTimelineDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTimeline = async (id: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fulfillmentService.getOrderTimeline(id);
      setTimeline(data);
    } catch (err: any) {
      console.error('Error fetching order timeline:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Không thể tải dòng thời gian sản xuất.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchTimeline(orderId);
    } else {
      setTimeline(null);
      setErrorMessage(null);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const currentFulfillmentStatus =
    timeline?.fulfillmentStatus || timeline?.currentFulfillmentStatus || 'Khởi tạo';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-2xl border-l border-white/10 bg-[#0A0F1D] text-slate-100 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/80">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-cyan-400">
                  {timeline?.orderCode || orderCode || 'Chi tiết đơn'}
                </span>
                <StatusBadge
                  label={currentFulfillmentStatus}
                  tone={
                    currentFulfillmentStatus === 'Delivered'
                      ? 'success'
                      : currentFulfillmentStatus === 'QualityCheck'
                      ? 'rose'
                      : currentFulfillmentStatus === 'Printing'
                      ? 'purple'
                      : 'cyan'
                  }
                  size="sm"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Toàn bộ tiến trình dây chuyền sản xuất & giao nhận (Giờ chuẩn Việt Nam UTC+7)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <FaSpinner className="animate-spin text-3xl text-cyan-400" />
                <span className="text-sm">Đang tải tiến trình xưởng...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => orderId && fetchTimeline(orderId)}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
                >
                  Thử lại
                </button>
              </div>
            ) : !timeline ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Không có dữ liệu tiến trình.
              </div>
            ) : (
              <>
                {/* 1. Partner Assignment Section */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <FaIndustry /> 1. Phân Công Xưởng In
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {timeline.assignments?.length || 0} lượt gán
                    </span>
                  </div>

                  {(!timeline.assignments || timeline.assignments.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Đơn hàng chưa được gán cho xưởng in đối tác nào.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {timeline.assignments.map((assign: PartnerAssignmentDto, idx: number) => (
                        <div
                          key={assign.id || idx}
                          className="p-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">
                              {assign.partnerLabName || assign.labName || 'Xưởng in đối tác'}
                            </span>
                            <StatusBadge
                              label={assign.status}
                              tone={assign.status === 'Accepted' ? 'emerald' : assign.status === 'Rejected' ? 'rose' : 'amber'}
                              size="sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                            <div>
                              Chi phí xưởng: <strong className="text-slate-300">{formatCurrency(assign.partnerCostSnapshotVnd)}</strong>
                            </div>
                            <div>
                              Hạn hoàn thành: <strong className="text-slate-300">{formatVnDateTime(assign.dueAtUtc)}</strong>
                            </div>
                          </div>
                          {assign.decisionNote && (
                            <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-lg">
                              "{assign.decisionNote}"
                            </p>
                          )}
                          <div className="text-[10px] text-slate-500 pt-1">
                            Gán lúc: {formatVnDateTime(assign.assignedAtUtc || assign.createdAtUtc)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Production Runs Section */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                      <FaPrint /> 2. Tiến Độ Sản Xuất & Lượt In
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {/* Gather runs */}
                      {(timeline.assignments?.flatMap((a) => a.productionRuns || []) || []).length} đợt in
                    </span>
                  </div>

                  {(() => {
                    const allRuns =
                      timeline.assignments?.flatMap((a) => a.productionRuns || []) ||
                      timeline.productionRuns ||
                      [];

                    if (allRuns.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic py-2">
                          Chưa có đợt in nào được khởi động.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {allRuns.map((run: ProductionRunDto, idx: number) => (
                          <div
                            key={run.id || idx}
                            className="p-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-purple-300">
                                Đợt in #{run.runNo ?? idx + 1} (SL: {run.quantity || 1})
                              </span>
                              <StatusBadge
                                label={run.status}
                                tone={
                                  run.status === 'Passed'
                                    ? 'emerald'
                                    : run.status === 'Failed'
                                    ? 'rose'
                                    : run.status === 'QualityCheck'
                                    ? 'amber'
                                    : 'purple'
                                }
                                size="sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <div>Bắt đầu: {formatVnDateTime(run.startedAtUtc)}</div>
                              <div>Hoàn thành: {formatVnDateTime(run.completedAtUtc)}</div>
                            </div>
                            {run.actualCostVnd && (
                              <div className="text-[11px] text-slate-400">
                                Chi phí thực tế: <strong className="text-slate-300">{formatCurrency(run.actualCostVnd)}</strong>
                              </div>
                            )}
                            {run.qcNote && (
                              <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                                <strong>Ghi chú QC:</strong> {run.qcNote}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Shipments & Delivery Events Section */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <FaShippingFast /> 3. Vận Đơn & Sự Kiện Giao Hàng
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {timeline.shipments?.length || 0} vận đơn
                    </span>
                  </div>

                  {(!timeline.shipments || timeline.shipments.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Đơn hàng chưa tạo vận đơn giao hàng.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {timeline.shipments.map((shipment: ShipmentDto, idx: number) => (
                        <div
                          key={shipment.id || idx}
                          className="p-3.5 rounded-xl border border-white/5 bg-slate-950/40 text-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-200">{shipment.carrier}</span>
                              <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] mt-0.5">
                                <FaBarcode /> {shipment.trackingNumber}
                              </div>
                            </div>
                            <StatusBadge
                              label={shipment.status || 'Created'}
                              tone={shipment.status === 'Delivered' ? 'success' : 'cyan'}
                              size="sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                            <div>Cước phí: {formatCurrency(shipment.shippingActualVnd)}</div>
                            <div>Giao lúc: {formatVnDateTime(shipment.deliveredAtUtc)}</div>
                          </div>

                          {/* Events List */}
                          {shipment.events && shipment.events.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Lịch trình di chuyển kiện hàng
                              </span>
                              <div className="relative pl-4 space-y-2 border-l border-white/10 ml-1">
                                {shipment.events.map((evt, eIdx) => (
                                  <div key={evt.id || eIdx} className="relative text-[11px]">
                                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-950" />
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-300">{evt.status}</span>
                                      <span className="text-[10px] text-slate-500">
                                        {formatVnDateTime(evt.occurredAtUtc)}
                                      </span>
                                    </div>
                                    {evt.note && <p className="text-slate-400 mt-0.5">{evt.note}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentTimelineDrawer;
