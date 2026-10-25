import { useState, useEffect, type FormEvent } from 'react';
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
} from 'lucide-react';
import { toast } from 'react-toastify';
import logoTheBoy from '../assets/images/LOGOTheBoy.png';
import {
  login,
  register,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
} from '../services/authService';

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
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
  }, [isOpen]);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

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
      await login({ email: cleanEmail, password: password.trim() });
      toast.success('Đăng nhập thành công! Chào mừng trở lại.');
      handleClose();
      onLoginSuccess?.();
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

  // Xử lý Gửi lại mã OTP
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

  // Xử lý Quên mật khẩu
  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.warn('Vui lòng nhập địa chỉ email nhận mã đặt lại mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword({ email: cleanEmail });
      toast.info(res.message || 'Đã gửi mã xác nhận đặt lại mật khẩu.');
      setTargetEmail(cleanEmail);
      setMode('reset-password');
      startResendCountdown();
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đặt lại mật khẩu với OTP
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpToken.trim();
    const cleanNewPass = newPassword.trim();

    if (!cleanOtp || !cleanNewPass) {
      toast.warn('Vui lòng nhập mã OTP và Mật khẩu mới.');
      return;
    }

    if (cleanNewPass.length < 10) {
      toast.warn('Mật khẩu mới phải có tối thiểu 10 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({
        token: cleanOtp,
        newPassword: cleanNewPass,
        email: targetEmail,
      });
      toast.success(res.message || 'Đặt lại mật khẩu thành công! Hãy đăng nhập với mật khẩu mới.');
      setPassword('');
      setNewPassword('');
      setOtpToken('');
      setMode('login');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Cyberpunk Glass Card Container */}
      <div
        className="w-full max-w-[440px] rounded-2xl bg-[#0c1017]/95 border border-cyan-500/25 p-7 sm:p-8 text-white relative shadow-[0_0_50px_rgba(0,240,255,0.15)] backdrop-blur-2xl transition-all duration-300"
        style={{
          boxShadow:
            '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 240, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Nút Đóng Modal */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer group"
          aria-label="Đóng bảng đăng nhập"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform text-slate-300 group-hover:text-cyan-300" />
        </button>

        {/* Logo & Tiêu Đề */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#090D14] to-[#121c2c] border border-cyan-400/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.25)] mb-3">
            <img src={logoTheBoy} alt="THE BOYS Logo" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight">
            {mode === 'login' && 'Đăng Nhập Tài Khoản'}
            {mode === 'signup' && 'Khởi Tạo Tài Khoản'}
            {mode === 'verify-otp' && 'Xác Thực Email OTP'}
            {mode === 'forgot-password' && 'Khôi Phục Mật Khẩu'}
            {mode === 'reset-password' && 'Thiết Lập Mật Khẩu Mới'}
          </h2>

          <p className="text-xs text-slate-400 mt-1 text-center">
            {mode === 'login' && 'Nền tảng Sáng tạo 3D AI & Đặt in đa chiều THE BOYS'}
            {mode === 'signup' && 'Nhận ngay 2 lượt tạo 3D AI miễn phí khi kích hoạt'}
            {mode === 'verify-otp' && `Nhập mã 6 chữ số gửi đến ${targetEmail || email}`}
            {mode === 'forgot-password' && 'Nhập email để nhận mã OTP khôi phục mật khẩu'}
            {mode === 'reset-password' && 'Nhập mã OTP 6 số và mật khẩu bảo mật mới (≥ 10 ký tự)'}
          </p>
        </div>

        {/* 1. MÀN HÌNH ĐĂNG NHẬP */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email / Tên đăng nhập</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com hoặc admin@123"
                  required
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-pooled-cyan w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Đăng Nhập Ngay</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Đăng ký thành viên
              </button>
            </div>
          </form>
        )}

        {/* 2. MÀN HÌNH ĐĂNG KÝ */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Họ và tên</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email / Tên đăng nhập</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com hoặc admin@123"
                  required
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu <span className="text-slate-400 font-normal">(tối thiểu 10 ký tự)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 10 ký tự"
                  required
                  minLength={10}
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-pooled-cyan w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Tạo Tài Khoản &amp; Nhận OTP</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">Đã có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* 3. MÀN HÌNH NHẬP MÃ OTP XÁC THỰC EMAIL */}
        {mode === 'verify-otp' && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                Mã xác thực 6 ký tự
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.toUpperCase())}
                  placeholder="VD: 7A9K2M"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold bg-[#080d14]/90 border border-cyan-500/50 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/40 rounded-xl px-4 py-3.5 text-cyan-300 placeholder:text-slate-600 outline-none transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6}
              className="btn-pooled-cyan w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Kích Hoạt</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || countdown > 0}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 disabled:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${countdown > 0 ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. MÀN HÌNH QUÊN MẬT KHẨU */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nhập Email tài khoản cần khôi phục
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-pooled-cyan w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Gửi Mã Khôi Phục</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Nhớ mật khẩu? Quay lại đăng nhập</span>
              </button>
            </div>
          </form>
        )}

        {/* 5. MÀN HÌNH ĐẶT LẠI MẬT KHẨU VỚI MÃ OTP */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mã OTP xác thực 6 ký tự
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
                  className="w-full tracking-[0.3em] font-mono font-bold bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-cyan-300 placeholder:text-slate-500 outline-none transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu mới <span className="text-slate-400 font-normal">(tối thiểu 10 ký tự)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới an toàn"
                  required
                  minLength={10}
                  className="w-full bg-[#080d14]/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6 || newPassword.length < 10}
              className="btn-pooled-cyan w-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Lưu Mật Khẩu Mới &amp; Hoàn Tất</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Hủy và quay lại đăng nhập</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

