import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaPlay, FaBoxes, FaMoneyBillWave } from 'react-icons/fa';
import { fulfillmentService } from '../../../../services/fulfillmentService';

interface StartProductionRunDialogProps {
  isOpen: boolean;
  assignmentId: string;
  orderCode: string;
  defaultQuantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const StartProductionRunDialog: React.FC<StartProductionRunDialogProps> = ({
  isOpen,
  assignmentId,
  orderCode,
  defaultQuantity = 1,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(defaultQuantity || 1);
  const [actualCostVnd, setActualCostVnd] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(defaultQuantity || 1);
    setActualCostVnd('');
    setErrorMessage(null);
  }, [isOpen, defaultQuantity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setErrorMessage('Số lượng in phải lớn hơn 0.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await fulfillmentService.startProductionRun(assignmentId, {
        quantity: Number(quantity),
        actualCostVnd: actualCostVnd ? Number(actualCostVnd) : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error starting production run:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi khởi chạy lượt in.';
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
              <FaPlay className="text-cyan-400 text-sm" /> Khởi Chạy Lượt In 3D
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
              <FaBoxes className="text-xs text-slate-400" /> Số lượng in (mẫu) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaMoneyBillWave className="text-xs text-slate-400" /> Chi phí sản xuất thực tế (VNĐ - tùy chọn)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              placeholder="VD: 120000"
              value={actualCostVnd}
              onChange={(e) => setActualCostVnd(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs leading-relaxed">
            Hệ thống sẽ cập nhật trạng thái đơn hàng sang <strong>Đang In (Printing)</strong> và ghi nhận dòng thời gian sản xuất cho khách hàng theo dõi.
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
                  <FaSpinner className="animate-spin text-xs" /> Đang khởi động...
                </>
              ) : (
                'Bắt Đầu In Ngay'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartProductionRunDialog;

