import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  User as UserIcon,
  Lock as LockIcon,
  Mail as MailIcon,
  Loader2,
  Globe,
  Home as HomeIcon,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import {
  getPostLoginRedirect,
  getRoleFromAccessToken,
  setAuthSession,
} from '../../lib/auth';
import heroCharacterVideo from '../../assets/videos/hero_character.mp4';

const TECH_3D_BG_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4';

export default function Login() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSource, setVideoSource] = useState<string>(TECH_3D_BG_VIDEO_URL);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('open') === 'true' || params.get('auth') === '1';
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-detect ready state on mount if video was already cached
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setIsVideoReady(true);
    }
  }, [videoSource]);

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Vui lòng nhập Username hoặc Email.');
      return;
    }

    if (isForgotPassword) {
      if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ để nhận liên kết khôi phục.');
        return;
      }
      setIsLoading(true);
      try {
        await api.post('/api/auth/forgot-password', {
          email: normalizedEmail,
        });
        setSuccessMessage('Đã gửi hướng dẫn khôi phục mật khẩu về email của bạn.');
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { detail?: string; title?: string; message?: string } };
          message?: string;
        };
        setErrorMessage(
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.response?.data?.title ||
          error.message ||
          'Không thể gửi yêu cầu đặt lại mật khẩu.'
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    if (isSignUp && password.length < 6) {
      setErrorMessage('Mật khẩu đăng ký cần có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        await api.post('/api/auth/register', {
          email: normalizedEmail,
          password: password.trim(),
          fullName: fullName.trim() || normalizedEmail.split('@')[0],
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
      const name =
        response.data?.fullName ||
        response.fullName ||
        response.user?.fullName ||
        normalizedEmail.split('@')[0];

      if (!token) {
        throw new Error('Backend không trả về access token.');
      }

      setAuthSession({
        accessToken: token,
        refreshToken: refToken,
        fullName: name,
      });

      setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        const dest = getPostLoginRedirect(getRoleFromAccessToken(token)) || '/';
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
          document.startViewTransition(() => {
            navigate(dest, { viewTransition: true });
          });
        } else {
          navigate(dest, { viewTransition: true });
        }
      }, 400);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string; title?: string; message?: string } };
        message?: string;
      };
      setErrorMessage(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.title ||
        error.message ||
        (isSignUp ? 'Đăng ký thất bại. Vui lòng thử lại.' : 'Đăng nhập thất bại. Kiểm tra lại thông tin.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setErrorMessage('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = (await api.post('/api/auth/google-login', {
        idToken: credentialResponse.credential,
      })) as {
        data?: { accessToken?: string; refreshToken?: string; fullName?: string };
        accessToken?: string;
        refreshToken?: string;
        fullName?: string;
        user?: { fullName?: string };
      };

      const token = response.data?.accessToken || response.accessToken;
      const refToken = response.data?.refreshToken || response.refreshToken;
      const name =
        response.data?.fullName ||
        response.fullName ||
        response.user?.fullName ||
        'Google User';

      if (!token) {
        throw new Error('Backend không trả về token xác thực Google.');
      }

      setAuthSession({
        accessToken: token,
        refreshToken: refToken,
        fullName: name,
      });

      setSuccessMessage('Đăng nhập Google thành công! Đang chuyển hướng...');
      setTimeout(() => {
        const dest = getPostLoginRedirect(getRoleFromAccessToken(token)) || '/';
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
          document.startViewTransition(() => {
            navigate(dest, { viewTransition: true });
          });
        } else {
          navigate(dest, { viewTransition: true });
        }
      }, 400);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string; title?: string; message?: string } };
        message?: string;
      };
      setErrorMessage(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.title ||
        error.message ||
        'Máy chủ chưa hỗ trợ đồng bộ Google OAuth. Vui lòng đăng nhập bằng Email/Password.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#020907] text-white select-none">
      {/* Background Video: High-Tech 3D Spatial Mesh / 3D Studio Video */}
      <video
        ref={videoRef}
        src={videoSource}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onLoadedData={() => setIsVideoReady(true)}
        onCanPlay={() => setIsVideoReady(true)}
        onError={() => setVideoSource(heroCharacterVideo)}
        className={`fixed inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0 transition-opacity duration-1000 ease-out ${
          isVideoReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Atmospheric Overlays & Vignettes (Dark Emerald / Cyan Studio Tint) */}
      <div
        className="pointer-events-none fixed inset-0 bg-[#020b09]/55 z-[1]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(4,20,17,0.45)_0%,rgba(2,10,8,0.85)_100%)] z-[1]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.07)_0%,transparent_65%)] z-[1]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-44 bg-gradient-to-b from-[#020907]/95 via-[#020d0b]/55 to-transparent z-[1]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#020907]/98 via-[#020d0b]/60 to-transparent z-[1]"
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link
          to="/"
          viewTransition
          className="liquid-glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-emerald-100/90 hover:text-white transition-all shadow-md group"
        >
          <HomeIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Về Trang chủ</span>
        </Link>

        {/* Button: Nhấn để đăng nhập placed at top right header */}
        <button
          type="button"
          onClick={() => setIsModalOpen((prev) => !prev)}
          className="group inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/25 hover:border-white/50 backdrop-blur-xl text-xs sm:text-[13px] font-medium text-white/90 hover:text-white shadow-[0_6px_20px_rgba(0,0,0,0.4),0_0_15px_rgba(250,204,21,0.15)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.6),0_0_22px_rgba(250,204,21,0.35)] transition-all duration-200 cursor-pointer active:scale-95"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300 shadow-[0_0_8px_#fde047]" />
          </span>
          <span className="tracking-wide">Nhấn để đăng nhập</span>
        </button>
      </header>

      {/* Center Auth Portal Card — Toggleable to allow viewing background scenery and THE BOYS logo */}
      <main
        className="relative z-20 flex-1 flex items-center justify-center px-4 py-8"
        onClick={(e) => {
          if (e.target === e.currentTarget && isModalOpen) {
            setIsModalOpen(false);
          }
        }}
      >
        {isModalOpen && (
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] rounded-[34px] px-8 py-9 sm:px-9 sm:py-10 text-white flex flex-col relative transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{
              background: 'rgba(5, 18, 15, 0.72)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1.5px solid rgba(45, 212, 191, 0.28)',
              boxShadow:
                '0 24px 64px rgba(0, 0, 0, 0.75), 0 0 40px rgba(45, 212, 191, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
            }}
          >
            {/* Close Button to hide card and view background logo */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer group shadow-sm"
              title="Đóng bảng để ngắm không gian 3D"
              aria-label="Đóng bảng đăng nhập"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Card Title */}
            <h1 className="text-3xl sm:text-[34px] font-bold text-white text-center tracking-tight mb-8">
              {isForgotPassword ? 'Reset Password' : isSignUp ? 'Register' : 'Login'}
            </h1>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              {/* Full name input (if register) */}
              {isSignUp && !isForgotPassword && (
                <div className="relative flex items-center w-full">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-transparent border border-white/35 focus:border-white focus:bg-white/[0.08] rounded-full px-5 py-3.5 pr-12 text-sm text-white placeholder:text-white/60 outline-none transition-all shadow-inner"
                  />
                  <UserIcon className="w-4 h-4 text-white/80 absolute right-4.5 pointer-events-none" />
                </div>
              )}

              {/* Email / Username Input */}
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isForgotPassword ? 'Email address' : 'Username'}
                  className="w-full bg-transparent border border-white/35 focus:border-white focus:bg-white/[0.08] rounded-full px-5 py-3.5 pr-12 text-sm text-white placeholder:text-white/60 outline-none transition-all shadow-inner"
                />
                <MailIcon className="w-4 h-4 text-white/80 absolute right-4.5 pointer-events-none" />
              </div>

              {/* Password Input (hidden in Forgot Password mode) */}
              {!isForgotPassword && (
                <div className="relative flex items-center w-full">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent border border-white/35 focus:border-white focus:bg-white/[0.08] rounded-full px-5 py-3.5 pr-12 text-sm text-white placeholder:text-white/60 outline-none transition-all shadow-inner"
                  />
                  <LockIcon className="w-4 h-4 text-white/80 absolute right-4.5 pointer-events-none" />
                </div>
              )}

              {/* Options row (Remember me & Forgot Password) */}
              {!isForgotPassword && (
                <div className="flex items-center justify-between text-xs text-white/85 px-1 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-white/40 bg-transparent text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-white hover:underline transition-all cursor-pointer font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Error & Success Messages */}
              {errorMessage && (
                <p
                  role="alert"
                  className="text-xs text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl px-3.5 py-2 text-center"
                >
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p
                  role="status"
                  className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-center"
                >
                  {successMessage}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm sm:text-base shadow-[0_4px_22px_rgba(255,255,255,0.22)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-neutral-900" />
                ) : (
                  <span>
                    {isForgotPassword ? 'Reset Password' : isSignUp ? 'Register' : 'Login'}
                  </span>
                )}
              </button>
            </form>

            {/* Synchronized Google Login Button */}
            {!isForgotPassword && (
              <div className="w-full mt-3.5 flex flex-col items-center">
                <div className="relative w-full overflow-hidden rounded-full">
                  {/* Visual Glassmorphic Capsule Button */}
                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    className="w-full py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/30 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        {/* Multicolored Google 'G' icon */}
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                      </>
                    )}
                  </button>

                  {/* Real Google OAuth Component layered transparently on top */}
                  <div className="absolute inset-0 opacity-0 z-10 cursor-pointer overflow-hidden flex items-center justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        setErrorMessage('Đăng nhập Google thất bại.');
                      }}
                      useOneTap={false}
                      theme="filled_black"
                      shape="pill"
                      size="large"
                      width="400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Register / Login / Reset Links */}
            <div className="w-full text-center mt-6 text-xs text-white/80">
              {isForgotPassword ? (
                <p>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-white font-bold hover:underline cursor-pointer"
                  >
                    Back to Login
                  </button>
                </p>
              ) : isSignUp ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-white font-bold hover:underline cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-white font-bold hover:underline cursor-pointer"
                  >
                    Register
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Atmospheric Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 py-8 flex flex-col items-center gap-6">
        {/* Floating Capsule Quick Nav */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            viewTransition
            className="liquid-glass rounded-full px-5 py-2.5 text-xs font-semibold text-emerald-100/90 hover:text-white hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all flex items-center gap-2 group"
          >
            <span>Trang chủ</span>
          </Link>

          <Link
            to="/create"
            className="liquid-glass rounded-full px-5 py-2.5 text-xs font-semibold text-emerald-100/90 hover:text-white hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all flex items-center gap-2 group"
          >
            <span>Studio Tạo 3D</span>
          </Link>

          <Link
            to="/ticket-prices"
            className="liquid-glass rounded-full px-5 py-2.5 text-xs font-semibold text-emerald-100/90 hover:text-white hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all flex items-center gap-2 group"
          >
            <span>Bảng giá in 3D</span>
          </Link>

          {/* Social Icons */}
          <a
            href="https://www.facebook.com/Nina11122005"
            target="_blank"
            rel="noreferrer"
            aria-label="Kênh tin tức THE BOYS 3D"
            className="liquid-glass rounded-full p-3.5 text-emerald-100/85 hover:text-[#7ef7e1] hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </a>

          <Link
            to="/create"
            aria-label="Mở Studio 3D"
            className="liquid-glass rounded-full p-3.5 text-emerald-100/85 hover:text-[#7ef7e1] hover:bg-emerald-400/10 shadow-[0_4px_20px_rgba(2,12,10,0.6)] transition-all"
          >
            <Globe className="w-4.5 h-4.5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-100/60 text-center">
          <span>© 2026 THE BOYS · Idea2Model (AI Image-to-3D &amp; 3D Printing)</span>
          <span>Hotline: 1900 1234</span>
          <span>studio@idea2model.com</span>
          <Link to="/create" className="hover:text-[#7ef7e1] transition-colors">
            AI 3D Studio
          </Link>
          <Link to="/profile" className="hover:text-[#7ef7e1] transition-colors">
            Hồ sơ cá nhân
          </Link>
          <Link to="/my-bookings" className="hover:text-[#7ef7e1] transition-colors">
            Đơn hàng &amp; Lịch sử in 3D
          </Link>
        </div>
      </footer>
    </div>
  );
}
