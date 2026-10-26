import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { type GenerationTaskItem, adminReviewService } from '../../../services/admin/adminReviewService';
import { buildCanonicalPrintConfig } from '../../../services/approvalAndReviewService';

interface ReviewFormProps {
  task: GenerationTaskItem;
  onSuccess: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ task, onSuccess }) => {
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [orientation, setOrientation] = useState('Vertical');
  const [material, setMaterial] = useState('Resin Tiêu chuẩn');
  const [printHeightMm, setPrintHeightMm] = useState<number>(task.requestedHeightMm || 100);
  const [supportConfirmation, setSupportConfirmation] = useState(true);
  const [buildVolumeConfirmation, setBuildVolumeConfirmation] = useState(true);
  const [slicingSoftware, setSlicingSoftware] = useState('ChituBox');
  const [exceptionReason, setExceptionReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize when task changes
  useEffect(() => {
    setPrintHeightMm(task.requestedHeightMm || 100);
    setDecision('Approved');
    setNote('');
    setError(null);
  }, [task.id, task.requestedHeightMm]);

  const hasVersion = Boolean(task.versionId);
  const isWatertight = task.isWatertight;
  const isPrintabilityOk = task.printability?.status?.toLowerCase() !== 'failed';

  // Client validation
  let canApprove = true;
  const approvalValidationErrors: string[] = [];

  if (!hasVersion) {
    canApprove = false;
    approvalValidationErrors.push('Mẫu chưa hoàn tất phân tích Mesh (chưa có ModelVersion Id).');
  }
  if (!isWatertight) {
    canApprove = false;
    approvalValidationErrors.push('Mô hình bị hở lưới (không kín nước / non-watertight).');
  }
  if (!isPrintabilityOk) {
    canApprove = false;
    approvalValidationErrors.push('Chỉ số in ấn (Printability) được đánh giá là Failed.');
  }
  if (!orientation.trim()) {
    canApprove = false;
    approvalValidationErrors.push('Cần chọn hoặc nhập hướng in (Orientation).');
  }
  if (!material.trim()) {
    canApprove = false;
    approvalValidationErrors.push('Cần chọn vật liệu in.');
  }
  if (!printHeightMm || printHeightMm <= 0) {
    canApprove = false;
    approvalValidationErrors.push('Chiều cao in phải lớn hơn 0 mm.');
  }
  if (!supportConfirmation && !exceptionReason.trim()) {
    canApprove = false;
    approvalValidationErrors.push('Cần xác nhận support hoặc nhập lý do ngoại lệ.');
  }
  if (!buildVolumeConfirmation && !exceptionReason.trim()) {
    canApprove = false;
    approvalValidationErrors.push('Cần xác nhận build volume hoặc nhập lý do ngoại lệ.');
  }
  if (!note.trim() || note.trim().length < 3) {
    canApprove = false;
    approvalValidationErrors.push('Ghi chú thẩm định bắt buộc (tối thiểu 3 ký tự).');
  }

  const canReject = Boolean(note.trim().length >= 3 && hasVersion);

  const isFormValid = decision === 'Approved' ? canApprove : canReject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting || !task.versionId) return;

    setSubmitting(true);
    setError(null);

    try {
      // Build canonical print configuration to match Customer Approval hashing
      const canonicalConfig = buildCanonicalPrintConfig({
        material: material.trim(),
        heightMm: printHeightMm,
        scale: 1,
      });

      await adminReviewService.createPrintReview({
        versionId: task.versionId,
        decision,
        checklist: {
          orientation: orientation.trim(),
          supportConfirmation,
          material: material.trim(),
          printHeightMm: Math.round(printHeightMm),
          buildVolumeConfirmation,
          slicingSoftware: slicingSoftware.trim() || 'ChituBox',
          exceptionReason: exceptionReason.trim() || undefined,
        },
        configuration: canonicalConfig,
        note: note.trim(),
      });

      toast.success(
        decision === 'Approved'
          ? '⚡ Đã phê duyệt thẩm định kỹ thuật mẫu in thành công!'
          : 'Đã gửi quyết định từ chối mẫu in.'
      );
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể gửi kết quả thẩm định';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-[#0d131f] p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>📋</span> Phiếu thẩm định kỹ thuật in 3D
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Version: {task.versionId ? `${task.versionId.substring(0, 8)}...` : 'Chưa có'}
        </span>
      </div>

      {!hasVersion && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          ⚠️ Mô hình chưa có phiên bản sản xuất (ModelVersion). Vui lòng đợi hệ thống phân tích hình học xong trước khi thẩm định.
        </div>
      )}

      {/* Decision Radio/Toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Quyết định thẩm định <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDecision('Approved')}
            disabled={!isWatertight || !isPrintabilityOk}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
              decision === 'Approved'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            } ${(!isWatertight || !isPrintabilityOk) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>✓</span> Đạt yêu cầu (Approved)
          </button>
          <button
            type="button"
            onClick={() => setDecision('Rejected')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
              decision === 'Rejected'
                ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>✕</span> Từ chối (Rejected)
          </button>
        </div>
      </div>

      {/* Warning Banner regarding canonical config */}
      {decision === 'Approved' && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-xs leading-relaxed">
          <strong>⚠️ Cảnh báo nghiệp vụ:</strong> Cấu hình duyệt (vật liệu, chiều cao, tỉ lệ) phải trùng với cấu hình khách hàng sẽ chốt. Nếu không trùng, khách hàng sẽ không thể lấy báo giá hoặc đặt in.
        </div>
      )}

      {/* Checklist Inputs (Only active/visible if Approved) */}
      {decision === 'Approved' && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hướng in (Orientation) <span className="text-rose-400">*</span>
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Vertical">Thẳng đứng (Vertical)</option>
                <option value="Flat">Nằm ngang (Flat)</option>
                <option value="Angled 45">Nghiêng 45 độ (Angled 45°)</option>
                <option value="Optimized">Tối ưu theo mesh (Optimized)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Vật liệu duyệt <span className="text-rose-400">*</span>
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Resin Tiêu chuẩn">Resin Tiêu chuẩn (SLA)</option>
                <option value="Resin Kỹ thuật Tough">Resin Kỹ thuật Tough</option>
                <option value="Nhựa PLA">Nhựa PLA (FDM)</option>
                <option value="Nhựa PETG">Nhựa PETG (FDM)</option>
                <option value="Nhựa ABS">Nhựa ABS (FDM)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Chiều cao in (mm) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={printHeightMm}
                onChange={(e) => setPrintHeightMm(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">
                Yêu cầu ban đầu: {task.requestedHeightMm} mm
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phần mềm cắt lớp (Slicer)
              </label>
              <input
                type="text"
                value={slicingSoftware}
                onChange={(e) => setSlicingSoftware(e.target.value)}
                placeholder="ChituBox, Lychee, Cura..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={supportConfirmation}
                onChange={(e) => setSupportConfirmation(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Xác nhận kết cấu đỡ (Support) đạt tiêu chuẩn in</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={buildVolumeConfirmation}
                onChange={(e) => setBuildVolumeConfirmation(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Xác nhận nằm trong khổ in (Build Volume) của máy</span>
            </label>
          </div>

          {(!supportConfirmation || !buildVolumeConfirmation) && (
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1">
                Lý do ngoại lệ <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Giải thích lý do không cần support hoặc vượt khổ..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-amber-600/50 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Note Field */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Ghi chú của kiểm định viên <span className="text-rose-400">* (tối thiểu 3 ký tự)</span>
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            decision === 'Approved'
              ? 'Ví dụ: Mô hình mesh kín nước, độ dày thành đạt chuẩn, đã kiểm tra slicing...'
              : 'Ví dụ: Mô hình bị hở đáy, chi tiết quá mỏng dưới 0.4mm, đề nghị khách sửa lại...'
          }
          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
          <span>{note.trim().length} ký tự</span>
          {note.trim().length < 3 && <span className="text-rose-400">Cần tối thiểu 3 ký tự</span>}
        </div>
      </div>

      {/* Validation Checklist Errors */}
      {decision === 'Approved' && approvalValidationErrors.length > 0 && note.trim().length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-amber-400 space-y-0.5">
          {approvalValidationErrors.map((err, i) => (
            <div key={i}>• {err}</div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className="w-full h-11 text-xs font-semibold tracking-wide btn-pooled-cyan disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang lưu kết quả thẩm định...
            </>
          ) : decision === 'Approved' ? (
            '✓ Xác nhận phê duyệt mẫu in 3D'
          ) : (
            '✕ Xác nhận từ chối mẫu in'
          )}
        </button>
      </div>
    </form>
  );
};
