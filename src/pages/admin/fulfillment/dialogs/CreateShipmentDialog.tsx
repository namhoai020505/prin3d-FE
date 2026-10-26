import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaShippingFast, FaBarcode, FaMoneyBillWave } from 'react-icons/fa';
import { fulfillmentService } from '../../../../services/fulfillmentService';

interface CreateShipmentDialogProps {
  isOpen: boolean;
  orderId: string;
  orderCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CARRIERS = [
  'Giao Hàng Nhanh (GHN)',
  'Giao Hàng Tiết Kiệm (GHTK)',
  'Viettel Post',
  'VNPost',
  'J&T Express',
  'Ahamove / Grab (Hỏa tốc)',
];

export const CreateShipmentDialog: React.FC<CreateShipmentDialogProps> = ({
  isOpen,
  orderId,
  orderCode,
  onClose,
  onSuccess,
}) => {
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingActualVnd, setShippingActualVnd] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCarrier(CARRIERS[0]);
    // Auto generate a dummy tracking number based on carrier code or timestamp for staff convenience
    const prefix = 'TB-SHIP-';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setTrackingNumber(`${prefix}${randomSuffix}`);
    setShippingActualVnd('');
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setErrorMessage('Vui lòng nhập mã vận đơn.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await fulfillmentService.createShipment(orderId, {
        carrier,
        trackingNumber: trackingNumber.trim(),
        shippingActualVnd: shippingActualVnd ? Number(shippingActualVnd) : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi tạo vận đơn.';
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
              <FaShippingFast className="text-emerald-400" /> Tạo Vận Đơn Giao Hàng
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
              <FaShippingFast className="text-xs text-slate-400" /> Đơn vị vận chuyển <span className="text-rose-400">*</span>
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaBarcode className="text-xs text-slate-400" /> Mã vận đơn (Tracking Code) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Nhập mã vận đơn từ bưu cục..."
              required
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaMoneyBillWave className="text-xs text-slate-400" /> Cước phí vận chuyển thực tế (VNĐ - tùy chọn)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="VD: 30000"
              value={shippingActualVnd}
              onChange={(e) => setShippingActualVnd(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
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
              disabled={submitting || !trackingNumber.trim()}
              className="btn-pooled-cyan px-6 py-2.5 font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Đang tạo...
                </>
              ) : (
                'Tạo Mã Vận Đơn'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShipmentDialog;

