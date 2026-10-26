import { useEffect, useState } from 'react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  Box,
  Coins,
  CreditCard,
  LogOut,
  Mail,
  Printer,
  Sparkles,
  Zap,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getMe, logout, revokeAllSessions, type CurrentUserDto } from '../../services/authService';
import CreditTopUpModal from './components/CreditTopUpModal';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMe();
      setUser(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể tải thông tin tài khoản.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    window.dispatchEvent(new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }));
  };

  const handleRevokeAllSessions = async () => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị? Mọi phiên làm việc đang mở trên các trình duyệt khác sẽ bị hủy ngay lập tức.',
    );
    if (!confirmed) return;

    setIsRevoking(true);
    try {
      await revokeAllSessions();
      toast.success('Đã thu hồi toàn bộ phiên đăng nhập thành công.');
      navigate('/');
      window.dispatchEvent(new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }));
    } catch {
      // Interceptor handles toast
    } finally {
      setIsRevoking(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên (Admin)';
      case 'staff':
        return 'Nhân viên vận hành (Staff)';
      case 'cus':
      default:
        return 'Thành viên tiêu chuẩn';
    }
  };

  const trialCredits =
    (user as unknown as { trialCredits?: number })?.trialCredits ??
    user?.freeTrialRemaining ??
    1;

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-[#231F1E]">
      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-10 px-4 sm:px-6 lg:px-8 border-b border-[#E2D9D0] bg-[#FFFFFF]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-[#FDF2F0] border border-[#B83B2A]/20 p-1 flex items-center justify-center shadow-sm">
              <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center text-[#B83B2A] text-2xl font-black uppercase">
                {user?.fullName?.slice(0, 1) || 'U'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#231F1E]">
                  {user?.fullName || 'Người dùng'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] text-xs font-semibold">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7A706C] flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#B83B2A]" />
                <span>{user?.email || 'email@domain.com'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRevokeAllSessions}
              disabled={isRevoking}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Đăng xuất khỏi mọi thiết bị đang đăng nhập"
            >
              {isRevoking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Đăng xuất mọi thiết bị</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-[#E2D9D0] bg-[#FFFFFF] hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4 text-[#7A706C]" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#B83B2A]/30 border-t-[#B83B2A] rounded-full animate-spin" />
            <p className="text-xs text-[#7A706C] font-medium">Đang tải dữ liệu hồ sơ...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-rose-200 text-center space-y-3 shadow-sm">
            <p className="text-xs text-rose-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="px-4 py-1.5 text-xs font-semibold bg-[#B83B2A] hover:bg-[#9E2F20] text-white rounded-xl transition-colors cursor-pointer"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <>
            {/* Credit Overview Cards */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#231F1E] mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#B83B2A]" />
                <span>Tài Khoản &amp; Lượt Tạo</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Free Trial Credits */}
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm flex flex-col justify-between hover:border-[#B83B2A]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7A706C] font-semibold">Lượt dùng thử (Free)</span>
                    <Sparkles className="w-4 h-4 text-[#B83B2A]" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#231F1E] font-mono tabular-nums">
                      {trialCredits}
                    </span>
                    <span className="text-xs text-[#7A706C]">lượt</span>
                  </div>
                </div>

                {/* Purchased Credits */}
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm flex flex-col justify-between hover:border-[#B83B2A]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7A706C] font-semibold">Lượt mua thêm</span>
                    <button
                      type="button"
                      onClick={() => setIsTopUpOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#B83B2A] hover:bg-[#9E2F20] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>+ Nạp thêm</span>
                    </button>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#B83B2A] font-mono tabular-nums">
                      {user?.purchasedRemaining ?? 0}
                    </span>
                    <span className="text-xs text-[#7A706C]">lượt</span>
                  </div>
                </div>

                {/* Total Used */}
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] shadow-sm flex flex-col justify-between hover:border-[#B83B2A]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7A706C] font-semibold">Mô hình đã tạo</span>
                    <Box className="w-4 h-4 text-[#B83B2A]" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#231F1E] font-mono tabular-nums">
                      {user?.totalUsed ?? 0}
                    </span>
                    <span className="text-xs text-[#7A706C]">mẫu 3D</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#231F1E] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B83B2A]" />
                <span>Truy cập nhanh</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="p-4 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2]/50 border border-[#E2D9D0] hover:border-[#B83B2A]/40 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] group-hover:scale-105 transition-transform">
                      <Box className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-bold text-sm text-[#231F1E] group-hover:text-[#B83B2A] transition-colors">
                      Studio 3D
                    </span>
                  </div>
                  <span className="text-[#7A706C] group-hover:text-[#B83B2A] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ticket-prices')}
                  className="p-4 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2]/50 border border-[#E2D9D0] hover:border-[#B83B2A]/40 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-bold text-sm text-[#231F1E] group-hover:text-[#B83B2A] transition-colors">
                      Bảng Giá
                    </span>
                  </div>
                  <span className="text-[#7A706C] group-hover:text-[#B83B2A] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/my-bookings')}
                  className="p-4 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEAE2]/50 border border-[#E2D9D0] hover:border-[#B83B2A]/40 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] group-hover:scale-105 transition-transform">
                      <Printer className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-bold text-sm text-[#231F1E] group-hover:text-[#B83B2A] transition-colors">
                      Đơn Hàng
                    </span>
                  </div>
                  <span className="text-[#7A706C] group-hover:text-[#B83B2A] group-hover:translate-x-0.5 transition-all text-sm font-bold">
                    →
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Credit Top-Up Modal */}
      {isTopUpOpen && (
        <CreditTopUpModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          onSuccess={async () => {
            try {
              const fresh = await getMe();
              setUser(fresh);
            } catch {}
          }}
          initialBalance={user?.purchasedRemaining}
        />
      )}
    </div>
  );
}
