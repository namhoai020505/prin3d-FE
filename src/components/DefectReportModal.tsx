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
        badgeColor: 'border-[#E2D9D0] bg-[#F6F3EE] text-[#7A706C]',
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
        badgeColor: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    }

    const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      hasDeliveredDate: true,
      isExpired: false,
      label: `Thời hạn khiếu nại còn: ${daysRemaining} ngày ${hoursRemaining} giờ`,
      badgeColor: 'border-emerald-200 bg-emerald-50 text-emerald-700',
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
    } catch {
      setErrorMessage('Không thể xử lý tệp bằng chứng. Vui lòng thử lại.');
    } finally {
      setIsHashing(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] text-[#231F1E] shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2D9D0] flex items-center justify-between bg-[#EFEAE2]/30">
          <div className="flex items-center gap-3">
            <img src={logoTheBoy} alt="Idea2Model Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B83B2A]">
                  Bảo hành &amp; Khiếu nại lỗi
                </span>
                <span className="text-xs text-[#7A706C]">•</span>
                <span className="text-xs font-mono font-bold text-[#231F1E]">#{orderCode}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#231F1E]">Yêu Cầu Đổi Trả / In Lại Mẫu Phẩm</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successReport ? (
            <div className="p-6 rounded-2xl bg-[#F6F3EE] border border-emerald-300 text-center space-y-4 animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#231F1E]">Khiếu Nại Đã Được Tiếp Nhận</h4>
                <p className="text-xs text-[#7A706C] max-w-md mx-auto leading-relaxed">
                  Yêu cầu của bạn đã được chuyển đến bộ phận QC &amp; Quản trị xưởng in. Chúng tôi sẽ phản hồi phương án in lại (Reprint) hoặc hoàn tiền (Refund) trong vòng 24 giờ làm việc.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] text-xs font-mono text-[#231F1E]">
                <span>Mã khiếu nại: {successReport.id.slice(0, 13)}...</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Preset Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#231F1E] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#B83B2A]" />
                  <span>Chọn nhanh nguyên nhân lỗi phổ biến:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason((prev) => (prev ? `${prev}. ${preset}` : preset))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F6F3EE] hover:bg-[#FDF2F0] border border-[#E2D9D0] hover:border-[#B83B2A]/40 text-[#231F1E] hover:text-[#B83B2A] transition-all text-left cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#231F1E]">
                    Mô tả chi tiết lỗi mẫu phẩm <span className="text-[#B83B2A]">*</span>
                  </label>
                  <span className="text-[11px] text-[#7A706C]">{reason.length}/1000 ký tự (tối thiểu 10)</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả cụ thể khuyết tật in 3D: cong vênh ở góc nào, kích thước thực tế đo được so với file 3D, mức độ nứt vỡ,..."
                  className="w-full rounded-xl bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 p-3.5 text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all resize-none"
                />
              </div>

              {/* Evidence Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#231F1E] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#B83B2A]" />
                    <span>Đính kèm bằng chứng ảnh / video lỗi (Tối đa 5 tệp)</span>
                  </label>
                  <span className="text-[11px] text-[#7A706C] font-mono">
                    {evidenceList.length}/5 bằng chứng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload Drop Area */}
                  <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-[#E2D9D0] hover:border-[#B83B2A]/60 bg-[#F6F3EE]/50 hover:bg-[#FDF2F0]/50 transition-all cursor-pointer group">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={isHashing || evidenceList.length >= 5}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <UploadCloud className="w-6 h-6 text-[#B83B2A] group-hover:scale-110 transition-transform mb-1.5" />
                    <span className="text-xs font-bold text-[#231F1E]">Chọn ảnh / video chụp lỗi</span>
                    <span className="text-[10px] text-[#7A706C] mt-0.5">Tự động băm SHA-256 đối soát</span>
                  </label>

                  {/* Direct Storage Key Input */}
                  <div className="flex flex-col justify-between p-3 rounded-xl bg-[#F6F3EE]/50 border border-[#E2D9D0] space-y-2">
                    <span className="text-[11px] text-[#7A706C]">Hoặc dán URL / Storage Key ảnh lỗi:</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customStorageKey}
                        onChange={(e) => setCustomStorageKey(e.target.value)}
                        placeholder="https://... hoặc storage/key..."
                        className="flex-1 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] px-2.5 py-1 text-xs text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none focus:border-[#B83B2A]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomKey}
                        disabled={!customStorageKey.trim() || evidenceList.length >= 5}
                        className="px-3 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#231F1E] hover:text-[#B83B2A] text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Evidence List */}
                {isHashing && (
                  <div className="flex items-center gap-2 p-2 text-xs text-[#B83B2A]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tính toán mã băm SHA-256 cho tệp...</span>
                  </div>
                )}

                {evidenceList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {evidenceList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="w-8 h-8 rounded object-cover border border-[#E2D9D0] shrink-0"
                            />
                          ) : (
                            <Paperclip className="w-4 h-4 text-[#B83B2A] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#231F1E] truncate max-w-xs">{item.fileName || item.storageKey}</p>
                            {item.sha256Hex && (
                              <p className="text-[10px] font-mono text-[#7A706C] flex items-center gap-1">
                                <Hash className="w-2.5 h-2.5 shrink-0 text-[#B83B2A]" />
                                <span>SHA256: {item.sha256Hex.slice(0, 10)}...{item.sha256Hex.slice(-8)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(index)}
                          className="p-1.5 text-[#7A706C] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#E2D9D0]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isHashing || reason.trim().length < 10}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
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
