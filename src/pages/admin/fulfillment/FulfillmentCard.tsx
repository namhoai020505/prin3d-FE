import React from 'react';
import {
  FaIndustry,
  FaClock,
  FaExclamationTriangle,
  FaShippingFast,
  FaCheckCircle,
  FaPlay,
  FaChevronRight,
  FaUser,
} from 'react-icons/fa';
import StatusBadge, { type StatusBadgeTone } from '../components/StatusBadge';
import type { OrderSummaryItem } from '../../../services/admin/adminOrderService';

export interface FulfillmentCardProps {
  order: OrderSummaryItem;
  columnId: 'col-awaiting' | 'col-assigned' | 'col-production' | 'col-qc' | 'col-delivery';
  onCardClick: (order: OrderSummaryItem) => void;
  onAssignLab: (order: OrderSummaryItem) => void;
  onRespondAssignment: (order: OrderSummaryItem, accepted: boolean) => void;
  onStartRun: (order: OrderSummaryItem) => void;
  onUpdateRunStatus: (order: OrderSummaryItem, status: 'PostProcessing' | 'QualityCheck') => void;
  onQcReview: (order: OrderSummaryItem) => void;
  onCreateShipment: (order: OrderSummaryItem) => void;
  onUpdateShipment: (order: OrderSummaryItem) => void;
}

const formatCurrency = (val?: number) => {
  if (!val && val !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const getStatusBadgeConfig = (status?: string): { label: string; tone: StatusBadgeTone } => {
  switch (status) {
    case 'AwaitingAssignment':
      return { label: 'Chờ Gán Xưởng', tone: 'amber' };
    case 'Assigned':
      return { label: 'Xưởng Tiếp Nhận', tone: 'blue' };
    case 'Printing':
    case 'InProduction':
      return { label: 'Đang In 3D', tone: 'purple' };
    case 'PostProcessing':
      return { label: 'Xử Lý Nguội', tone: 'cyan' };
    case 'QualityCheck':
      return { label: 'Chờ Kiểm Định QC', tone: 'rose' };
    case 'Packaged':
      return { label: 'Đã Đóng Gói', tone: 'emerald' };
    case 'Shipping':
      return { label: 'Đang Giao Vận', tone: 'cyan' };
    case 'Delivered':
      return { label: 'Đã Giao Hàng', tone: 'success' };
    default:
      return { label: status || 'Khởi tạo', tone: 'slate' };
  }
};

export const FulfillmentCard: React.FC<FulfillmentCardProps> = ({
  order,
  columnId,
  onCardClick,
  onAssignLab,
  onRespondAssignment,
  onStartRun,
  onUpdateRunStatus,
  onQcReview,
  onCreateShipment,
  onUpdateShipment,
}) => {
  const fStatus = order.fulfillmentStatus || 'AwaitingAssignment';
  const { label: statusLabel, tone: statusTone } = getStatusBadgeConfig(fStatus);

  // Check overdue: e.g. created > 5 days ago and not yet delivered
  const isOverdue =
    order.createdAtUtc &&
    fStatus !== 'Delivered' &&
    new Date().getTime() - new Date(order.createdAtUtc).getTime() > 5 * 24 * 60 * 60 * 1000;

  return (
    <div
      onClick={() => onCardClick(order)}
      className="group relative rounded-xl border border-white/10 bg-slate-900/70 p-4 transition-all duration-200 hover:border-cyan-400/50 hover:bg-slate-900/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] cursor-pointer text-slate-200"
    >
      {/* Top Header: Order Code + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
            {order.orderCode}
          </span>
          <FaChevronRight className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <StatusBadge label={statusLabel} tone={statusTone} size="sm" />
      </div>

      {/* Customer Info */}
      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-300">
        <FaUser className="text-[11px] text-slate-500 shrink-0" />
        <span className="font-medium truncate">{order.receiverName || 'Khách hàng'}</span>
        {order.receiverPhone && (
          <span className="text-[11px] text-slate-500 shrink-0">• {order.receiverPhone}</span>
        )}
      </div>

      {/* Material & Specs */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          Vật liệu: <strong className="text-slate-300 font-medium">{order.material || 'Resin Chuẩn'}</strong>
        </span>
        <span className="shrink-0 font-semibold text-slate-300">
          SL: {order.quantity || 1}
        </span>
      </div>

      {/* Price & Date */}
      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
        <span className="font-bold text-white tracking-wide">
          {formatCurrency(order.totalVnd)}
        </span>

        {isOverdue ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
            <FaExclamationTriangle className="text-[10px]" /> Quá hạn
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <FaClock className="text-[10px]" />
            {order.createdAtUtc ? new Date(order.createdAtUtc).toLocaleDateString('vi-VN') : '—'}
          </span>
        )}
      </div>

      {/* Quick Action Buttons per Stage */}
      <div
        className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {columnId === 'col-awaiting' && (
          <button
            type="button"
            onClick={() => onAssignLab(order)}
            className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.2)]"
          >
            <FaIndustry className="text-xs" /> Gán Xưởng In
          </button>
        )}

        {columnId === 'col-assigned' && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => onRespondAssignment(order, true)}
              className="btn-pooled-cyan py-2 px-2 text-xs font-bold flex items-center justify-center gap-1 rounded-lg"
            >
              <FaCheckCircle className="text-xs text-emerald-300" /> Nhận Việc
            </button>
            <button
              type="button"
              onClick={() => onStartRun(order)}
              className="py-2 px-2 text-xs font-semibold rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center justify-center gap-1"
            >
              <FaPlay className="text-[10px]" /> Bắt Đầu In
            </button>
          </div>
        )}

        {columnId === 'col-production' && (
          <div className="w-full">
            {fStatus === 'Printing' ? (
              <button
                type="button"
                onClick={() => onUpdateRunStatus(order, 'PostProcessing')}
                className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg"
              >
                Chuyển Xử Lý Nguội →
              </button>
            ) : fStatus === 'PostProcessing' ? (
              <button
                type="button"
                onClick={() => onUpdateRunStatus(order, 'QualityCheck')}
                className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg"
              >
                Chuyển Chờ QC →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartRun(order)}
                className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg"
              >
                <FaPlay className="text-xs" /> Khởi Chạy In
              </button>
            )}
          </div>
        )}

        {columnId === 'col-qc' && (
          <button
            type="button"
            onClick={() => onQcReview(order)}
            className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-[0_0_12px_rgba(244,63,94,0.2)]"
          >
            <FaCheckCircle className="text-xs" /> Đánh Giá QC
          </button>
        )}

        {columnId === 'col-delivery' && (
          <div className="w-full">
            {fStatus === 'Packaged' && !order.trackingNumber ? (
              <button
                type="button"
                onClick={() => onCreateShipment(order)}
                className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg"
              >
                <FaShippingFast className="text-xs" /> Tạo Mã Vận Đơn
              </button>
            ) : fStatus === 'Shipping' || (fStatus === 'Packaged' && order.trackingNumber) ? (
              <button
                type="button"
                onClick={() => onUpdateShipment(order)}
                className="btn-pooled-cyan w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg"
              >
                <FaShippingFast className="text-xs" /> Cập Nhật Giao Hàng
              </button>
            ) : (
              <div className="w-full py-1.5 text-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-center gap-1.5">
                <FaCheckCircle /> Đã Hoàn Thành Giao Hàng
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FulfillmentCard;
