import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCheckCircle, FaTimesCircle, FaStickyNote } from 'react-icons/fa';
import { fulfillmentService } from '../../../../services/fulfillmentService';

interface RespondAssignmentDialogProps {
  isOpen: boolean;
  assignmentId: string;
  orderCode: string;
  defaultAccepted?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RespondAssignmentDialog: React.FC<RespondAssignmentDialogProps> = ({
  isOpen,
  assignmentId,
  orderCode,
  defaultAccepted = true,
  onClose,
  onSuccess,
}) => {
  const [accepted, setAccepted] = useState(defaultAccepted);
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAccepted(defaultAccepted);
    setDecisionNote('');
    setErrorMessage(null);
  }, [isOpen, defaultAccepted]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await fulfillmentService.respondAssignment(assignmentId, {
        accepted,
        decisionNote: decisionNote.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error responding to assignment:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi phản hồi đơn gán.';
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
              Phản Hồi Tiếp Nhận Đơn
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
              onClick={() => setAccepted(true)}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                accepted
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <FaCheckCircle className="text-lg" />
              <span className="text-xs font-bold">Xác Nhận Nhận Việc</span>
            </button>
            <button
              type="button"
              onClick={() => setAccepted(false)}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                !accepted
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
              }`}
            >
              <FaTimesCircle className="text-lg" />
              <span className="text-xs font-bold">Từ Chối Đơn</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaStickyNote className="text-xs text-slate-400" />
              {accepted ? 'Ghi chú xác nhận (tùy chọn)' : 'Lý do từ chối (bắt buộc)'}
            </label>
            <textarea
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder={
                accepted
                  ? 'Ghi chú máy in dự kiến, ca sản xuất...'
                  : 'Lý do: quá tải công suất, thiếu vật liệu nhựa/resin...'
              }
              required={!accepted}
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
              disabled={submitting || (!accepted && !decisionNote.trim())}
              className={`${
                accepted ? 'btn-pooled-cyan' : 'bg-rose-600 hover:bg-rose-500 text-white'
              } px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Đang xử lý...
                </>
              ) : accepted ? (
                'Chấp Nhận Đơn'
              ) : (
                'Xác Nhận Từ Chối'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RespondAssignmentDialog;

