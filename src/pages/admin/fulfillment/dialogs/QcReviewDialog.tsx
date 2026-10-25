import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCheckCircle, FaTimesCircle, FaRedo, FaStickyNote } from 'react-icons/fa';
import { fulfillmentService } from '../../../../services/fulfillmentService';

interface QcReviewDialogProps {
  isOpen: boolean;
  runId: string;
  orderCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const QcReviewDialog: React.FC<QcReviewDialogProps> = ({
  isOpen,
  runId,
  orderCode,
  onClose,
  onSuccess,
}) => {
  const [passed, setPassed] = useState(true);
  const [triggerReprint, setTriggerReprint] = useState(true);
  const [qcNote, setQcNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPassed(true);
    setTriggerReprint(true);
    setQcNote('Mẫu in đạt chuẩn dung sai, bề mặt mịn đẹp và kín nước.');
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const noteToSend = qcNote.trim() || (passed ? 'Mẫu in đạt chuẩn dung sai và bề mặt kỹ thuật.' : 'Mẫu in lỗi kỹ thuật.');
      const storageKey = passed ? `evidence/qc/${runId || 'default'}.jpg` : undefined;

      await fulfillmentService.recordQc(runId, {
        passed,
        qcNote: noteToSend,
        qcEvidenceStorageKey: storageKey,
        triggerReprint: !passed ? triggerReprint : false,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording QC:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi ghi nhận đánh giá QC.';
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
              Đánh Giá Chất Lượng Mẫu In (QC)
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPassed(true)}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                passed
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <FaCheckCircle className="text-lg text-emerald-400" />
              <span className="text-xs font-bold">Đạt Tiêu Chuẩn (Passed)</span>
            </button>
            <button
              type="button"
              onClick={() => setPassed(false)}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                !passed
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <FaTimesCircle className="text-lg text-rose-400" />
              <span className="text-xs font-bold">Lỗi Kỹ Thuật (Failed)</span>
            </button>
          </div>

          {!passed && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-rose-300 select-none">
                <input
                  type="checkbox"
                  checked={triggerReprint}
                  onChange={(e) => setTriggerReprint(e.target.checked)}
                  className="rounded border-rose-500/40 text-rose-500 focus:ring-rose-400"
                />
                <FaRedo className="text-xs" /> Tự động yêu cầu in lại mẫu mới (Trigger Reprint)
              </label>
              <p className="text-[11px] text-rose-200/70 pl-6">
                Khi tích chọn, hệ thống sẽ tự động chuyển đơn hàng về giai đoạn sản xuất để in lại lượt mới.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaStickyNote className="text-xs text-slate-400" /> Ghi chú kiểm định chất lượng
            </label>
            <textarea
              rows={3}
              value={qcNote}
              onChange={(e) => setQcNote(e.target.value)}
              placeholder={
                passed
                  ? 'Mẫu in hoàn thiện sắc nét, đúng kích thước thiết kế, bề mặt mịn đẹp...'
                  : 'Mô tả lỗi: cong vênh đế, tách lớp (delamination), thiếu chi tiết, nứt vỡ...'
              }
              className="w-full p-3 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
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
              className={`${
                passed ? 'btn-pooled-cyan' : 'bg-rose-600 hover:bg-rose-500 text-white'
              } px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Đang lưu...
                </>
              ) : passed ? (
                'Chấp Nhận QC & Đóng Gói'
              ) : (
                'Ghi Nhận Lỗi QC'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QcReviewDialog;
