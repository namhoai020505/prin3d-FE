import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  Paperclip,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { defectService, type DefectEvidenceInput, type DefectReportDto } from '../services/defectService';
import logoTheBoy from '../assets/LOGOTheBoy.png';

export interface DefectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  deliveredAtUtc?: string | null;
  onSuccess?: (report: DefectReportDto) => void;
}

interface EvidenceItem extends DefectEvidenceInput {
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
}

const PRESET_REASONS = [
  'Sai kích thước / sai thông số kỹ thuật',
  'Bề mặt nứt vỡ / tách lớp nghiêm trọng',
  'Biến dạng nhiệt / cong vênh hình học',
  'Sai màu sắc / chất liệu so với đơn đặt',
];

export const DefectReportModal: React.FC<DefectReportModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCode,
  deliveredAtUtc,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [customStorageKey, setCustomStorageKey] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<DefectReportDto | null>(null);

  // Tính toán thời gian bảo hành 7 ngày
  const warrantyStatus = useMemo(() => {
    if (!deliveredAtUtc) {
      return {
        hasDeliveredDate: false,
        isExpired: false,
        label: 'Chính sách bảo hành 7 ngày kể từ khi nhận hàng',
        badgeColor: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300',
      };
    }
    const deliveredDate = new Date(deliveredAtUtc).getTime();
    const expiryDate = deliveredDate + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diffMs = expiryDate - now;

    if (diffMs <= 0) {
      return {
        hasDeliveredDate: true,
        isExpired: true,
        label: 'Đã quá thời hạn 7 ngày bảo hành đổi trả',
        badgeColor: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
      };
    }

    const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      hasDeliveredDate: true,
      isExpired: false,
      label: `Thời hạn khiếu nại còn: ${daysRemaining} ngày ${hoursRemaining} giờ`,
      badgeColor: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
    };
  }, [deliveredAtUtc]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceList.length + files.length > 5) {
      setErrorMessage('Chỉ được đính kèm tối đa 5 tệp bằng chứng hình ảnh/video.');
      return;
    }

    setErrorMessage(null);
    setIsHashing(true);

    try {
      const newItems: EvidenceItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let sha256Hex = '';

        try {
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          }
        } catch (hashErr) {
          console.warn('Lỗi tính toán SHA-256 client:', hashErr);
        }

        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageKey = `defect-evidence/${orderCode}/${Date.now()}-${safeFileName}`;
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

        newItems.push({
          storageKey,
          sha256Hex: sha256Hex || undefined,
          fileName: file.name,
          fileSize: file.size,
          previewUrl,
        });
      }

      setEvidenceList((prev) => [...prev, ...newItems]);
    } catch (err) {
      setErrorMessage('Không thể xử lý tệp bằng chứng. Vui lòng thử lại.');
    } finally {
      setIsHashing(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleAddCustomKey = () => {
    const trimmed = customStorageKey.trim();
    if (!trimmed) return;

    if (evidenceList.length >= 5) {
      setErrorMessage('Chỉ được đính kèm tối đa 5 bằng chứng.');
      return;
    }

    setEvidenceList((prev) => [
      ...prev,
      {
        storageKey: trimmed,
        fileName: trimmed.split('/').pop() || trimmed,
      },
    ]);
    setCustomStorageKey('');
    setErrorMessage(null);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setErrorMessage('Vui lòng nhập lý do khiếu nại chi tiết ít nhất 10 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payloadEvidences: DefectEvidenceInput[] = evidenceList.map((item) => ({
        storageKey: item.storageKey,
        ...(item.sha256Hex ? { sha256Hex: item.sha256Hex } : {}),
      }));

      const report = await defectService.createDefectReport(orderId, {
        reason: reason.trim(),
        ...(payloadEvidences.length > 0 ? { evidence: payloadEvidences } : {}),
      });

      setSuccessReport(report);
      onSuccess?.(report);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể gửi khiếu nại lúc này. Vui lòng thử lại sau.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setEvidenceList([]);
    setErrorMessage(null);
    setSuccessReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#090D14]/95 border border-cyan-500/30 text-white shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img src={logoTheBoy} alt="Idea2Model Logo" className="w-9 h-9 object-contain drop-shadow" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Bảo hành & Khiếu nại lỗi
                </span>
                <span className="text-xs text-white/50">•</span>
                <span className="text-xs font-mono font-bold text-white/90">#{orderCode}</span>
              </div>
              <h3 className="text-lg font-black text-white">Yêu Cầu Đổi Trả / In Lại Mẫu Phẩm</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Warranty Badge Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium ${warrantyStatus.badgeColor}`}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>{warrantyStatus.label}</span>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successReport ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-4 animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Khiếu Nại Đã Được Tiếp Nhận</h4>
                <p className="text-xs text-emerald-200/80 max-w-md mx-auto leading-relaxed">
                  Yêu cầu của bạn đã được chuyển đến bộ phận QC & Quản trị xưởng in. Chúng tôi sẽ phản hồi phương án in lại (Reprint) hoặc hoàn tiền (Refund) trong vòng 24 giờ làm việc.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300">
                <span>Mã khiếu nại: {successReport.id.slice(0, 13)}...</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Preset Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chọn nhanh nguyên nhân lỗi phổ biến:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason((prev) => (prev ? `${prev}. ${preset}` : preset))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-white/80 hover:text-cyan-300 transition-all text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/90">
                    Mô tả chi tiết lỗi mẫu phẩm <span className="text-cyan-400">*</span>
                  </label>
                  <span className="text-[11px] text-white/40">{reason.length}/1000 ký tự (tối thiểu 10)</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả cụ thể khuyết tật in 3D: cong vênh ở góc nào, kích thước thực tế đo được so với file 3D, mức độ nứt vỡ,..."
                  className="w-full rounded-xl bg-[#0B0F17] border border-white/10 focus:border-cyan-400 p-3.5 text-xs text-white placeholder-white/30 outline-none transition-all resize-none"
                />
              </div>

              {/* Evidence Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Đính kèm bằng chứng ảnh / video lỗi (Tối đa 5 tệp)</span>
                  </label>
                  <span className="text-[11px] text-cyan-400/80 font-mono">
                    {evidenceList.length}/5 bằng chứng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload Drop Area */}
                  <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/60 bg-white/[0.02] hover:bg-cyan-500/[0.03] transition-all cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={isHashing || evidenceList.length >= 5}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <UploadCloud className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform mb-1.5" />
                    <span className="text-xs font-bold text-white">Chọn ảnh / video chụp lỗi</span>
                    <span className="text-[10px] text-white/40 mt-0.5">Tự động băm SHA-256 đối soát</span>
                  </label>

                  {/* Direct Storage Key Input */}
                  <div className="flex flex-col justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <span className="text-[11px] text-white/60">Hoặc dán URL / Storage Key ảnh lỗi:</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customStorageKey}
                        onChange={(e) => setCustomStorageKey(e.target.value)}
                        placeholder="https://... hoặc storage/key..."
                        className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomKey}
                        disabled={!customStorageKey.trim() || evidenceList.length >= 5}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Evidence List */}
                {isHashing && (
                  <div className="flex items-center gap-2 p-2 text-xs text-cyan-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tính toán mã băm SHA-256 cho tệp...</span>
                  </div>
                )}

                {evidenceList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {evidenceList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="w-8 h-8 rounded object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-xs">{item.fileName || item.storageKey}</p>
                            {item.sha256Hex && (
                              <p className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                                <Hash className="w-2.5 h-2.5 shrink-0" />
                                <span>SHA256: {item.sha256Hex.slice(0, 10)}...{item.sha256Hex.slice(-8)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(index)}
                          className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isHashing || reason.trim().length < 10}
                  className="btn-pooled-cyan px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Đang gửi hồ sơ...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Gửi yêu cầu khiếu nại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefectReportModal;

