import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminOrderService } from '../../../services/admin/adminOrderService';

interface CancelOrderModalProps {
  isOpen: boolean;
  orderId: string | null;
  orderCode?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  orderId,
  orderCode,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !orderId) return null;

  const isReasonValid = reason.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      await adminOrderService.cancelOrder(orderId, {
        reason: reason.trim(),
        decisionNote: decisionNote.trim() || undefined,
      });
      toast.success(`Đã hủy đơn hàng ${orderCode || ''} thành công`);
      setReason('');
      setDecisionNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể hủy đơn hàng';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0d131f] p-6 shadow-2xl text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Xác nhận hủy đơn hàng</h3>
              {orderCode && <p className="text-xs text-slate-400 font-mono">Mã đơn: {orderCode}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Lý do hủy đơn <span className="text-rose-400">* (tối thiểu 10 ký tự)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="Nhập lý do hủy đơn (ví dụ: Khách hàng đổi ý, hết vật liệu sản xuất...)"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            <div className="flex justify-between items-center mt-1 text-[11px]">
              <span className={reason.trim().length < 10 ? 'text-amber-400' : 'text-emerald-400'}>
                {reason.trim().length} / 10 ký tự tối thiểu
              </span>
              {reason.trim().length > 0 && reason.trim().length < 10 && (
                <span className="text-rose-400">Cần thêm {10 - reason.trim().length} ký tự</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ghi chú quyết định <span className="text-slate-500 font-normal">(tùy chọn)</span>
            </label>
            <input
              type="text"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              disabled={loading}
              placeholder="Ghi chú nội bộ cho ban vận hành..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!isReasonValid || loading}
              className="px-5 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/40 disabled:text-rose-400/50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận hủy đơn'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

