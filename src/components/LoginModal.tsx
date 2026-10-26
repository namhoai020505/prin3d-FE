import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  Mail,
  Lock,
  User,
  KeyRound,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useGoogleLogin } from '@react-oauth/google';
import logoTheBoy from '../assets/images/LOGOTheBoy.png';
import {
  login,
  googleLogin,
  register,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
} from '../services/authService';
import { getPostLoginRedirect, getRoleFromAccessToken, normalizeRole } from '../lib/auth';

export type AuthModalMode = 'login' | 'signup' | 'verify-otp' | 'forgot-password' | 'reset-password';

export interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialMode?: AuthModalMode;
  onLoginSuccess?: () => void;
}

export default function LoginModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  initialMode = 'login',
  onLoginSuccess,
}: LoginModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  // Ẩn/Hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleClose = useCallback(() => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [controlledOnClose]);

  // Navigation state survives lazy loading, unlike an event sent before mount.
  useEffect(() => {
    if (!location.state?.openLoginModal) return;
    void Promise.resolve().then(() => {
      setMode('login');
      setInternalIsOpen(true);
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: { ...location.state, openLoginModal: false },
      });
    });
  }, [location, navigate]);

  // Lắng nghe sự kiện toàn cục mở LoginModal khi phiên hết hạn
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: AuthModalMode; email?: string }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
      }
      if (customEvent.detail?.email) {
        setEmail(customEvent.detail.email);
        setTargetEmail(customEvent.detail.email);
      }
      setInternalIsOpen(true);
    };

    window.addEventListener('idea2model:open-login-modal', handleOpenEvent);
    return () => window.removeEventListener('idea2model:open-login-modal', handleOpenEvent);
  }, []);

  // Đếm ngược gửi lại OTP 60 giây
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Phím ESC đóng Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const startResendCountdown = () => setCountdown(60);

  // Xử lý Đăng Nhập
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      toast.warn('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({ email: cleanEmail, password: password.trim() });
      toast.success('Đăng nhập thành công! Chào mừng trở lại.');
      handleClose();
      onLoginSuccess?.();

      const role = response?.user?.role || getRoleFromAccessToken();
      const normalizedRole = normalizeRole(role);
      if (normalizedRole === 'admin' || normalizedRole === 'staff' || normalizedRole === 'manager') {
        const targetUrl = getPostLoginRedirect(role);
        navigate(targetUrl, { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg = error.response?.data?.detail || error.response?.data?.message || 'Đăng nhập thất bại.';
      if (msg.includes('chưa được xác thực email')) {
        setTargetEmail(cleanEmail);
        setMode('verify-otp');
        startResendCountdown();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đăng Nhập qua Google OAuth2 với hook useGoogleLogin chính thức (Click trực tiếp vào button, không lệch hitbox)
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        toast.error('Không nhận được mã xác thực từ Google.');
        return;
      }

      setIsLoading(true);
      try {
        const response = await googleLogin(undefined, tokenResponse.access_token);
        const user = response?.user;
        toast.success(
          user?.fullName
            ? `Đăng nhập Google thành công! Chào mừng ${user.fullName}.`
            : 'Đăng nhập Google thành công!'
        );
        handleClose();
        onLoginSuccess?.();

        const role = user?.role || getRoleFromAccessToken();
        const normalizedRole = normalizeRole(role);
        if (normalizedRole === 'admin' || normalizedRole === 'staff' || normalizedRole === 'manager') {
          const targetUrl = getPostLoginRedirect(role);
          navigate(targetUrl, { replace: true });
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string; detail?: string } } };
        const msg =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Đăng nhập qua tài khoản Google thất bại.';
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      toast.error('Đăng nhập Google bị gián đoạn hoặc thất bại. Vui lòng thử lại.');
    },
  });

  // Xử lý Đăng Ký
  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanName || !cleanPassword) {
      toast.warn('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }

    if (cleanPassword.length < 10) {
      toast.warn('Mật khẩu bảo mật phải có tối thiểu 10 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        email: cleanEmail,
        fullName: cleanName,
        password: cleanPassword,
      });
      toast.success(res.message || 'Đăng ký thành công! Vui lòng nhập mã OTP gửi tới email.');
      setTargetEmail(cleanEmail);
      setMode('verify-otp');
      startResendCountdown();
    } catch {
      // Error is caught and toasted by Axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Xác thực Email OTP
  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpToken.trim();
    if (cleanOtp.length < 6) {
      toast.warn('Mã OTP xác thực gồm 6 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyEmail({ token: cleanOtp, email: targetEmail });
      toast.success(res.message || 'Xác thực email thành công! Bạn có thể đăng nhập ngay.');
      setMode('login');
      setOtpToken('');
    } catch {
      // Interceptor handles toast
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Gửi lại mã OTP xác thực email
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    if (!targetEmail) {
      toast.warn('Không xác định được email để gửi lại mã.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resendVerificationOtp({ email: targetEmail });
      toast.info(res.message || 'Đã gửi lại mã OTP. Vui lòng kiểm tra hòm thư.');
      startResendCountdown();
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Quên mật khẩu - Bước 1: Nhập Email và gửi request POST /api/auth/forgot-password
  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.warn('Vui lòng nhập địa chỉ email tài khoản cần khôi phục.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword({ email: cleanEmail });
      toast.success(res.message || 'Mã xác nhận OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!');
      setTargetEmail(cleanEmail);
      setOtpToken('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('reset-password'); // Chuyển sang khung mới /api/auth/reset-password
      startResendCountdown();    // Khởi động đếm ngược 60s
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Gửi lại mã OTP qua email sau 60s (Gọi lại /api/auth/forgot-password)
  const handleResendResetOtp = async () => {
    if (countdown > 0) return;
    const target = targetEmail || email.trim().toLowerCase();
    if (!target) {
      toast.warn('Không tìm thấy email tài khoản để gửi lại mã.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword({ email: target });
      toast.info(res.message || 'Đã gửi lại mã xác nhận OTP về email của bạn.');
      startResendCountdown();
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đặt lại mật khẩu với Token và Mật khẩu mới - Bước 2: Gọi POST /api/auth/reset-password
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpToken.trim();
    const cleanNewPass = newPassword.trim();
    const cleanConfirmPass = confirmPassword.trim();

    if (!cleanOtp) {
      toast.warn('Vui lòng nhập mã token OTP 6 ký tự nhận từ email.');
      return;
    }

    if (cleanOtp.length < 6) {
      toast.warn('Mã token OTP xác thực gồm 6 ký tự.');
      return;
    }

    if (!cleanNewPass) {
      toast.warn('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (cleanNewPass.length < 10) {
      toast.warn('Mật khẩu mới bảo mật phải có tối thiểu 10 ký tự.');
      return;
    }

    if (cleanNewPass !== cleanConfirmPass) {
      toast.warn('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({
        token: cleanOtp,
        newPassword: cleanNewPass,
      });
      toast.success(res.message || 'Đặt lại mật khẩu thành công! Hãy đăng nhập với mật khẩu mới.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpToken('');
      setMode('login');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-[440px] bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl p-7 sm:p-8 text-[#231F1E] relative shadow-[0_20px_60px_rgba(35,31,30,0.14)]">
        {/* Nút Đóng Modal */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EFEAE2]/60 hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] flex items-center justify-center transition-all cursor-pointer group z-20"
          aria-label="Đóng bảng đăng nhập"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        </button>

        {/* Logo & Tiêu Đề */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] border border-[#B83B2A]/20 p-2 flex items-center justify-center shadow-sm mb-3">
            <img src={logoTheBoy} alt="THE BOYS Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#231F1E] tracking-tight text-center">
            {mode === 'login' && 'Đăng nhập'}
            {mode === 'signup' && 'Tạo tài khoản'}
            {mode === 'verify-otp' && 'Xác thực OTP'}
            {mode === 'forgot-password' && 'Khôi phục mật khẩu'}
            {mode === 'reset-password' && 'Đặt lại mật khẩu'}
          </h2>

          {mode !== 'login' && (
            <p className="text-xs text-[#7A706C] mt-1 text-center">
              {mode === 'signup' && 'Nhận ngay 2 lượt tạo 3D miễn phí'}
              {mode === 'verify-otp' && `Nhập mã 6 chữ số gửi đến ${targetEmail || email}`}
              {mode === 'forgot-password' && 'Nhập email để nhận mã xác thực OTP'}
              {mode === 'reset-password' && `Nhập mã xác nhận gửi tới ${targetEmail || email}`}
            </p>
          )}
        </div>

        {/* 1. MÀN HÌNH ĐĂNG NHẬP */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">Email</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#231F1E]">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                    setOtpToken('');
                    setMode('forgot-password');
                  }}
                  className="text-xs text-[#B83B2A] hover:text-[#9E2F20] hover:underline transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>

            {/* Phân cách hoặc tiếp tục với Google */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-[#E2D9D0] w-full" />
              <span className="bg-[#FFFFFF] px-2.5 text-[11px] font-semibold text-[#7A706C] uppercase tracking-wider shrink-0">
                Hoặc
              </span>
              <div className="border-t border-[#E2D9D0] w-full" />
            </div>

            {/* Nút Đăng Nhập Google */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => triggerGoogleLogin()}
              className="w-full h-12 rounded-xl font-semibold text-sm bg-[#FFFFFF] hover:bg-[#F6F3EE] border border-[#E2D9D0] text-[#231F1E] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-[#7A706C]">Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs font-semibold text-[#B83B2A] hover:text-[#9E2F20] hover:underline transition-colors cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </div>
          </form>
        )}

        {/* 2. MÀN HÌNH ĐĂNG KÝ */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">Họ và tên</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <User className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">Email</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">
                Mật khẩu <span className="text-[#7A706C] font-normal">(tối thiểu 10 ký tự)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 10 ký tự bảo mật"
                  required
                  minLength={10}
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Tạo tài khoản</span>
              )}
            </button>

            {/* Phân cách hoặc tiếp tục với Google */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-[#E2D9D0] w-full" />
              <span className="bg-[#FFFFFF] px-2.5 text-[11px] font-semibold text-[#7A706C] uppercase tracking-wider shrink-0">
                Hoặc
              </span>
              <div className="border-t border-[#E2D9D0] w-full" />
            </div>

            {/* Nút Đăng Ký Google */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => triggerGoogleLogin()}
              className="w-full h-12 rounded-xl font-semibold text-sm bg-[#FFFFFF] hover:bg-[#F6F3EE] border border-[#E2D9D0] text-[#231F1E] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Đăng ký bằng Google</span>
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-[#7A706C]">Đã có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-semibold text-[#B83B2A] hover:text-[#9E2F20] hover:underline transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* 3. MÀN HÌNH XÁC THỰC EMAIL OTP */}
        {mode === 'verify-otp' && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">
                Mã OTP 6 ký tự
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.toUpperCase())}
                  placeholder="VD: 8BF4A2"
                  required
                  autoFocus
                  className="w-full tracking-[0.3em] font-mono font-bold bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 text-sm text-[#B83B2A] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <KeyRound className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kích hoạt tài khoản</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-[#7A706C] pt-2 border-t border-[#E2D9D0]">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 hover:text-[#231F1E] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || countdown > 0}
                className="flex items-center gap-1.5 text-[#B83B2A] hover:text-[#9E2F20] disabled:text-[#7A706C]/60 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${countdown > 0 ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. MÀN HÌNH QUÊN MẬT KHẨU */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1.5">
                Email tài khoản
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                  autoFocus
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-3 pl-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-[#7A706C] mt-1.5">
                Hệ thống sẽ gửi mã OTP 6 ký tự đến địa chỉ email này.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Gửi mã OTP</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-[#7A706C] hover:text-[#231F1E] transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại đăng nhập</span>
              </button>
            </div>
          </form>
        )}

        {/* 5. MÀN HÌNH ĐẶT LẠI MẬT KHẨU */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            {/* Thẻ hiển thị Email đã gửi mã */}
            <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-[#B83B2A] shrink-0" />
                <span className="text-[#7A706C]">Đã gửi mã tới: </span>
                <span className="text-[#B83B2A] font-semibold truncate font-mono">{targetEmail || email}</span>
              </div>
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-[#B83B2A] hover:text-[#9E2F20] font-medium shrink-0 cursor-pointer ml-2 hover:underline"
              >
                Đổi email
              </button>
            </div>

            {/* 1. Khung nhập Token OTP */}
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1">
                Mã OTP (6 ký tự)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.toUpperCase())}
                  placeholder="VD: 8BF4A2"
                  required
                  autoFocus
                  className="w-full tracking-[0.35em] font-mono font-bold bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-2.5 pl-11 text-sm text-[#B83B2A] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <KeyRound className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Ô Mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1">
                Mật khẩu mới <span className="text-[#7A706C] font-normal">(≥ 10 ký tự)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới an toàn"
                  required
                  minLength={10}
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-2.5 pl-11 pr-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                  title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Ô Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-[#231F1E] mb-1">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  minLength={10}
                  className="w-full bg-[#FFFFFF] hover:bg-[#F6F3EE]/60 focus:bg-[#FFFFFF] border border-[#E2D9D0] focus:border-[#B83B2A] focus:ring-1 focus:ring-[#B83B2A]/30 rounded-xl px-4 py-2.5 pl-11 pr-11 text-sm text-[#231F1E] placeholder:text-[#7A706C]/60 outline-none transition-all"
                />
                <ShieldCheck className="w-4 h-4 text-[#7A706C] absolute left-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 text-[#7A706C] hover:text-[#231F1E] cursor-pointer"
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-rose-500 mt-1">Mật khẩu xác nhận chưa khớp.</p>
              )}
            </div>

            {/* Nút submit xác nhận đổi mật khẩu */}
            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6 || newPassword.length < 10 || newPassword !== confirmPassword}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#B83B2A] hover:bg-[#9E2F20] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-98 transition-all mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cập nhật mật khẩu</span>
                </>
              )}
            </button>

            {/* Hàng điều hướng: Quay lại & Nút gửi lại mail sau 60s */}
            <div className="flex items-center justify-between text-xs text-[#7A706C] pt-2 border-t border-[#E2D9D0]">
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="flex items-center gap-1 hover:text-[#231F1E] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>

              <button
                type="button"
                onClick={handleResendResetOtp}
                disabled={isLoading || countdown > 0}
                className="flex items-center gap-1.5 text-[#B83B2A] hover:text-[#9E2F20] disabled:text-[#7A706C]/60 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title={countdown > 0 ? `Vui lòng đợi ${countdown} giây để gửi lại` : 'Gửi lại mã xác nhận qua email'}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${countdown > 0 ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
