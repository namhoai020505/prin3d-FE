import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaTruckLoading, FaStickyNote, FaCheckDouble } from 'react-icons/fa';
import { fulfillmentService } from '../../../../services/fulfillmentService';

interface UpdateShipmentEventDialogProps {
  isOpen: boolean;
  shipmentId: string;
  orderCode: string;
  currentStatus?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SHIPMENT_STATUSES = [
  { value: 'InTransit', label: 'Đang Trung Chuyển (In Transit)', desc: 'Kiện hàng đang trên xe chuyển phát giữa các kho bưu cục' },
  { value: 'OutForDelivery', label: 'Đang Đi Giao (Out For Delivery)', desc: 'Bưu tá đang mang kiện hàng đi giao tới địa chỉ khách hàng' },
  { value: 'Delivered', label: 'Đã Giao Thành Công (Delivered)', desc: 'Khách hàng đã nhận và ký biên bản giao nhận' },
];

export const UpdateShipmentEventDialog: React.FC<UpdateShipmentEventDialogProps> = ({
  isOpen,
  shipmentId,
  orderCode,
  currentStatus,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState('OutForDelivery');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (currentStatus === 'Created' || currentStatus === 'InTransit') {
      setStatus('OutForDelivery');
    } else if (currentStatus === 'OutForDelivery') {
      setStatus('Delivered');
    } else {
      setStatus('InTransit');
    }
    setNote('');
    setErrorMessage(null);
  }, [isOpen, currentStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await fulfillmentService.recordShipmentEvent(shipmentId, {
        eventKey: crypto.randomUUID(),
        status,
        note: note.trim() || (status === 'Delivered' ? 'Khách hàng đã nhận và ký biên bản giao nhận.' : undefined),
        source: 'StaffAdmin',
        deliveryEvidenceStorageKey: status === 'Delivered' ? `evidence/delivery/${shipmentId}.jpg` : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording shipment event:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái vận đơn.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FaTruckLoading className="text-cyan-400" /> Cập Nhật Trạng Thái Giao Vận
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Đơn hàng: <span className="font-semibold text-cyan-400">{orderCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaCheckDouble className="text-xs text-slate-400" /> Mốc sự kiện tiếp theo <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-2">
              {SHIPMENT_STATUSES.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    status === item.value
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                      : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipmentStatus"
                    value={item.value}
                    checked={status === item.value}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 text-cyan-500 focus:ring-cyan-400"
                  />
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaStickyNote className="text-xs text-slate-400" /> Ghi chú sự kiện (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Kiện hàng đã đến bưu cục quận 1, chuẩn bị phát..."
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-pooled-cyan px-6 py-2.5 font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Đang lưu...
                </>
              ) : (
                'Ghi Nhận Sự Kiện'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateShipmentEventDialog;
