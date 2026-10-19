import { useState, type FormEvent } from 'react';
import { ChevronLeft, X, Sparkles, Loader2 } from 'lucide-react';
import logoTheBoy from '../assets/LOGOTheBoy.png';
import api from '../lib/api';
import { setAuthSession } from '../lib/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setErrorMessage('Vui lòng nhập email hợp lệ, ví dụ: customer@example.com.');
      return;
    }

    if (isSignUp && password.length < 10) {
      setErrorMessage('Mật khẩu đăng ký cần có ít nhất 10 ký tự.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        await api.post('/api/auth/register', {
          email: normalizedEmail,
          password: password.trim(),
          fullName: fullName.trim() || email.split('@')[0],
        });
        setSuccessMessage('Đăng ký thành công! Đang đăng nhập...');
      }

      const response = (await api.post('/api/auth/login', {
        email: normalizedEmail,
        password: password.trim(),
      })) as {
        data?: { accessToken?: string; refreshToken?: string; fullName?: string };
        accessToken?: string;
        refreshToken?: string;
        fullName?: string;
        user?: { fullName?: string };
      };

      const token = response.data?.accessToken || response.accessToken;
      const refToken = response.data?.refreshToken || response.refreshToken;
      const name = response.data?.fullName || response.fullName || response.user?.fullName || email.split('@')[0];

      if (!token) {
        throw new Error('Backend không trả về access token.');
      }

      setAuthSession({
        accessToken: token,
        refreshToken: refToken,
        fullName: name,
      });

      setSuccessMessage('Đăng nhập thành công!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; title?: string; message?: string } }; message?: string };
      setErrorMessage(
        error.response?.data?.detail || error.response?.data?.message || error.response?.data?.title || error.message || 'Đăng nhập không thành công'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMessage('Backend hiện chưa hỗ trợ đăng nhập Google hoặc mạng xã hội. Hãy dùng email và mật khẩu.');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-[390px] rounded-[28px] bg-[#12141c] border border-white/10 p-6 shadow-2xl shadow-black/90 text-white flex flex-col items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Buttons */}
        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Quay lại"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* LOGOTheBoy with Gold Sparkle Glow */}
        <div className="relative mt-2 mb-1 flex items-center justify-center">
          <img
            src={logoTheBoy}
            alt="TheBoys Logo"
            className="w-14 h-14 object-contain rounded-2xl filter drop-shadow-[0_0_14px_rgba(255,209,102,0.45)]"
          />
          <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[#FFD166] drop-shadow-[0_0_6px_#FFD166]" />
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-xl font-bold text-white text-center tracking-tight mt-2">
          One step from your 3D model
        </h2>
        <p className="text-xs text-neutral-400 text-center mt-1">
          {isSignUp ? 'Tạo tài khoản để nhận 2 lượt tạo model miễn phí' : 'Đăng nhập hoặc tạo tài khoản để tiếp tục'}
        </p>

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full mt-4 py-2.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-black font-semibold text-xs flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          {/* Google multicolored G icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* OR Divider */}
        <div className="relative w-full flex items-center justify-center my-3.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative px-3 bg-[#12141c] text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            OR
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
          {isSignUp && (
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[11px] font-medium text-neutral-400">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyen Van A"
                className="w-full bg-[#171a24] border border-white/10 focus:border-[#FFD166] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-medium text-neutral-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yours@example.com"
              required
              className="w-full bg-[#171a24] border border-white/10 focus:border-[#FFD166] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-medium text-neutral-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full bg-[#171a24] border border-white/10 focus:border-[#FFD166] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-colors"
            />
          </div>

          {errorMessage && (
            <p className="text-[11px] text-rose-400 text-center font-medium mt-0.5">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-[11px] text-emerald-400 text-center font-medium mt-0.5">
              {successMessage}
            </p>
          )}

          {/* Continue Gold Button (matching G2C Gold theme) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] hover:brightness-110 active:scale-[0.98] text-black font-bold text-xs shadow-[0_0_16px_rgba(255,209,102,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        {/* Switch Mode & Forgot Password Links */}
        <div className="mt-3 text-center flex flex-col gap-1">
          <p className="text-xs text-neutral-400">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="font-semibold text-[#FFD166] hover:underline cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          {!isSignUp && (
            <button
              type="button"
              onClick={() => {
                setSuccessMessage('Vui lòng kiểm tra email để đặt lại mật khẩu');
              }}
              className="text-xs font-semibold text-[#FFD166] hover:underline cursor-pointer mt-0.5"
            >
              Forgot Password
            </button>
          )}
        </div>

        {/* Alternative login notice */}
        <p className="text-[11px] text-neutral-500 text-center mt-3">
          Hỗ trợ đăng nhập nhanh bằng tài khoản email đã đăng ký.
        </p>

        {/* Footer Legal Terms */}
        <p className="text-[10px] text-neutral-500 text-center mt-4 leading-normal">
          By continuing, you agree to our{' '}
          <span className="text-neutral-400 hover:text-white cursor-pointer underline">Terms of Use</span>{' '}
          and{' '}
          <span className="text-neutral-400 hover:text-white cursor-pointer underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
