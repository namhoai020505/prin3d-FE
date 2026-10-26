import { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { AI_CONSENT_POLICY_VERSION, AI_CONSENT_PURPOSE } from '../lib/env';
import {
  AUTH_SESSION_EVENT,
  getAccessToken,
  getRoleFromAccessToken,
  isAdminRole,
  isManagerRole,
  isStaffRole,
} from '../lib/auth';

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

      // Không tự mở consent modal đối với quản trị viên / nhân viên hoặc khi đang ở phân hệ /admin
      const role = getRoleFromAccessToken(token);
      const isManagement = role && (isAdminRole(role) || isStaffRole(role) || isManagerRole(role));
      if (isManagement || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) {
        return;
      }

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

  if (!isOpen || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div className="w-full max-w-[460px] rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] p-6 sm:p-7 text-[#231F1E] relative shadow-xl">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EFEAE2]/60 hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] flex items-center justify-center transition-all cursor-pointer group disabled:opacity-50"
          aria-label="Đóng thỏa thuận"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#231F1E] tracking-tight">
              Thỏa Thuận Xử Lý AI 3D
            </h3>
          </div>
        </div>

        {/* 3 Cam kết ngắn gọn */}
        <div className="rounded-xl bg-[#F6F3EE] border border-[#E2D9D0] p-4 space-y-3 text-xs mb-5">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#B83B2A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#231F1E]">Chuyển đổi 3D:</span>{' '}
              <span className="text-[#7A706C]">Ảnh/văn bản chỉ dùng để tạo file 3D của riêng bạn.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#B83B2A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#231F1E]">Bản quyền 100%:</span>{' '}
              <span className="text-[#7A706C]">Bạn giữ toàn quyền sở hữu mẫu 3D đã tạo.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#B83B2A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#231F1E]">An toàn nội dung:</span>{' '}
              <span className="text-[#7A706C]">Không tải lên hình ảnh nhạy cảm, bạo lực hoặc vi phạm pháp luật.</span>
            </div>
          </div>
        </div>

        {/* Checkbox xác nhận */}
        <label className="flex items-center gap-2.5 text-xs text-[#231F1E] cursor-pointer select-none mb-6">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="w-4 h-4 rounded border border-[#E2D9D0] bg-[#FFFFFF] text-[#B83B2A] focus:ring-0 cursor-pointer accent-[#B83B2A]"
          />
          <span className="font-medium text-[#231F1E]">
            Tôi đồng ý với điều khoản sử dụng AI Studio
          </span>
        </label>

        {/* Buttons hành động */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[#E2D9D0] bg-[#FFFFFF] hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Để sau
          </button>

          <button
            type="button"
            onClick={handleAgree}
            disabled={isSubmitting || !acknowledged}
            className="px-5 py-2 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Đồng ý &amp; Tiếp tục</span>
          </button>
        </div>
      </div>
    </div>
  );
}
