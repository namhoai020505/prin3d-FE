import { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { AI_CONSENT_POLICY_VERSION, AI_CONSENT_PURPOSE } from '../lib/env';
import { AUTH_SESSION_EVENT, getAccessToken } from '../lib/auth';

// Module-level cache: Mỗi accessToken chỉ gọi thăm dò getConsent đúng 1 lần duy nhất
const checkedConsentTokens = new Set<string>();

export interface AiConsentModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConsentGranted?: () => void;
}

export default function AiConsentModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onConsentGranted,
}: AiConsentModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // 1. Lắng nghe sự kiện toàn cục mở Consent Modal
  useEffect(() => {
    const handleOpen = () => setInternalIsOpen(true);
    window.addEventListener('idea2model:open-ai-consent-modal', handleOpen);
    return () => window.removeEventListener('idea2model:open-ai-consent-modal', handleOpen);
  }, []);

  // 2. Tự động kiểm tra trạng thái Consent khi người dùng đăng nhập (chỉ 1 lần/token)
  useEffect(() => {
    const checkConsent = async () => {
      const token = getAccessToken();
      if (!token || checkedConsentTokens.has(token)) return;
      checkedConsentTokens.add(token);

      try {
        const res = await authService.getConsent(AI_CONSENT_PURPOSE, AI_CONSENT_POLICY_VERSION);
        if (res && res.hasConsent === false) {
          setInternalIsOpen(true);
        }
      } catch {
        // Bỏ qua lỗi mạng trong quá trình thăm dò ngầm
      }
    };

    void checkConsent();
    window.addEventListener(AUTH_SESSION_EVENT, checkConsent);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, checkConsent);
  }, []);

  // 3. Phím ESC đóng Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleAgree = async () => {
    if (!acknowledged) {
      toast.warn('Vui lòng tích chọn xác nhận bạn đã đọc và đồng ý với điều khoản.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.updateConsent({
        purpose: AI_CONSENT_PURPOSE,
        policyVersion: AI_CONSENT_POLICY_VERSION,
        granted: true,
      });
      toast.success('Đã lưu xác nhận điều khoản xử lý 3D AI thành công!');
      onConsentGranted?.();
      handleClose();
    } catch {
      // Interceptor đã bắt và hiển thị toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        className="w-full max-w-[500px] rounded-2xl bg-[#0c1017]/95 border border-cyan-500/30 p-6 sm:p-7 text-white relative shadow-[0_0_50px_rgba(0,240,255,0.15)] backdrop-blur-2xl"
        style={{
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer group disabled:opacity-50"
        >
          <X className="w-4 h-4 text-slate-300 group-hover:text-cyan-300" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Thỏa Thuận Xử Lý AI 3D
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 font-bold">
                {AI_CONSENT_POLICY_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Quyền riêng tư &amp; Sở hữu trí tuệ mô hình (`{AI_CONSENT_PURPOSE}`)
            </p>
          </div>
        </div>

        {/* Nội dung điều khoản kính mờ */}
        <div className="rounded-xl bg-[#080d14]/80 border border-slate-800 p-4 space-y-3 text-xs text-slate-300 max-h-[220px] overflow-y-auto mb-5 leading-relaxed selection:bg-cyan-500/30">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">1. Xử lý ảnh sang 3D qua Neural Mesh:</strong> Dữ
              liệu hình ảnh 2D người dùng tải lên sẽ được chuyển đổi sang định dạng đa giác 3D
              (GLB/STL) bằng các cỗ máy AI chuyên dụng của hệ thống THE BOYS.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">2. Quyền sở hữu và Bảo mật bản quyền:</strong> Bạn giữ
              toàn quyền sở hữu đối với tác phẩm gốc và file 3D được sinh ra. Hệ thống cam kết không
              bán hoặc phân phối lại mô hình của bạn cho bên thứ ba khi chưa có sự chấp thuận bằng văn
              bản.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">3. Kiểm duyệt an toàn:</strong> Không tải lên hình ảnh
              vi phạm thuần phong mỹ tục, bạo lực hoặc xâm phạm quyền sở hữu công nghiệp đã đăng ký.
            </div>
          </div>
        </div>

        {/* Checkbox xác nhận */}
        <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer select-none mb-6">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border border-slate-700 bg-[#080d14] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-400"
          />
          <span>
            Tôi đã đọc kỹ và đồng ý cho phép nền tảng xử lý dữ liệu ảnh thành mô hình 3D theo chính
            sách <strong className="text-cyan-300">v1.0 (GDPR &amp; AI Privacy)</strong>.
          </span>
        </label>

        {/* Buttons hành động */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Để sau
          </button>

          {/* 18-Stop Pooled-Light Shader Button */}
          <button
            type="button"
            onClick={handleAgree}
            disabled={isSubmitting || !acknowledged}
            className="btn-pooled-cyan px-5 py-2.5 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Tôi Đồng Ý &amp; Tiếp Tục</span>
          </button>
        </div>
      </div>
    </div>
  );
}
