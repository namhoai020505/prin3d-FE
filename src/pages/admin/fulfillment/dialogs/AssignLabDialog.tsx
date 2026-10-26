import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaIndustry, FaCalendarAlt, FaMoneyBillWave, FaStickyNote } from 'react-icons/fa';
import { fulfillmentService, type PartnerLabDto } from '../../../../services/fulfillmentService';

interface AssignLabDialogProps {
  isOpen: boolean;
  orderId: string;
  orderCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignLabDialog: React.FC<AssignLabDialogProps> = ({
  isOpen,
  orderId,
  orderCode,
  onClose,
  onSuccess,
}) => {
  const [labs, setLabs] = useState<PartnerLabDto[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [partnerLabId, setPartnerLabId] = useState('');
  const [costVnd, setCostVnd] = useState<number | ''>('');
  const [dueAt, setDueAt] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setPartnerLabId('');
    setCostVnd('');
    // Default deadline: 3 days later
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setDueAt(defaultDate.toISOString().slice(0, 16));
    setDecisionNote('');

    const fetchLabs = async () => {
      setLoadingLabs(true);
      try {
        const res = await fulfillmentService.getPartnerLabs();
        setLabs(res);
        if (res.length > 0) {
          setPartnerLabId(res[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching partner labs:', err);
        setErrorMessage('Không thể tải danh sách xưởng in đối tác.');
      } finally {
        setLoadingLabs(false);
      }
    };
    fetchLabs();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerLabId) {
      setErrorMessage('Vui lòng chọn xưởng in tiếp nhận.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await fulfillmentService.assignPartner(orderId, {
        partnerLabId,
        partnerCostSnapshotVnd: costVnd ? Number(costVnd) : undefined,
        dueAtUtc: dueAt ? new Date(dueAt).toISOString() : undefined,
        decisionNote: decisionNote.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error assigning partner:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi gán xưởng.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FaIndustry className="text-amber-400" /> Gán Xưởng In Đối Tác
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
              <FaIndustry className="text-xs text-slate-400" /> Chọn xưởng in tiếp nhận <span className="text-rose-400">*</span>
            </label>
            {loadingLabs ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                <FaSpinner className="animate-spin text-cyan-400" /> Đang tải danh sách xưởng...
              </div>
            ) : (
              <select
                value={partnerLabId}
                onChange={(e) => setPartnerLabId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
              >
                {labs.length === 0 ? (
                  <option value="">Không có xưởng khả dụng</option>
                ) : (
                  labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} {lab.contactPhone ? `(${lab.contactPhone})` : ''}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FaMoneyBillWave className="text-xs text-slate-400" /> Chi phí xưởng (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                placeholder="VD: 150000"
                value={costVnd}
                onChange={(e) => setCostVnd(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FaCalendarAlt className="text-xs text-slate-400" /> Hạn hoàn thành dự kiến
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-slate-900/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FaStickyNote className="text-xs text-slate-400" /> Ghi chú điều phối (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Ghi chú yêu cầu kỹ thuật, độ mịn hoặc hướng xử lý bề mặt..."
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
              disabled={submitting || !partnerLabId}
              className="btn-pooled-cyan px-6 py-2.5 font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Đang gán xưởng...
                </>
              ) : (
                'Xác Nhận Gán Xưởng'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignLabDialog;
