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

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getMe();
        if (isMounted) {
          setUser(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : 'Không thể tải thông tin tài khoản.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
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

  return (
    <div className="min-h-screen bg-[#090D14] text-white selection:bg-cyan-500/30">
      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-10 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-gradient-to-b from-[#0e1624] to-[#090D14]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_25px_rgba(0,240,255,0.3)]">
              <div className="w-full h-full rounded-[22px] bg-[#0c1017] flex items-center justify-center text-cyan-300 text-2xl font-black uppercase">
                {user?.fullName?.slice(0, 1) || 'U'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {user?.fullName || 'Người dùng'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-semibold">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{user?.email || 'user@example.com'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRevokeAllSessions}
              disabled={isRevoking}
              className="px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Đăng xuất khỏi mọi thiết bị đang đăng nhập"
            >
              {isRevoking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Đăng xuất mọi thiết bị</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:border-cyan-400/50 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Đang tải dữ liệu hồ sơ...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-3">
            <p className="text-sm text-white">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <>
            {/* Credit Overview Cards */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span>Số dư Lượt Tạo 3D AI (Credits)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Free Trial Credits */}
                <div className="p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/40 backdrop-blur-xl relative overflow-hidden group transition-all shadow-md hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Lượt dùng thử (Free)</span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {user?.freeTrialRemaining ?? 0}
                    </span>
                    <span className="text-xs text-slate-400">lượt</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Cấp miễn phí cho mỗi tài khoản mới.</p>
                </div>

                {/* Purchased Credits */}
                <div className="p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/40 backdrop-blur-xl relative overflow-hidden group transition-all shadow-md hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Lượt mua thêm</span>
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {user?.purchasedRemaining ?? 0}
                    </span>
                    <span className="text-xs text-slate-400">lượt</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Lượt tạo mua gói hoặc được cấp bởi quản trị viên.</p>
                </div>

                {/* Total Used */}
                <div className="p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/40 backdrop-blur-xl relative overflow-hidden group transition-all shadow-md hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Mô hình đã tạo</span>
                    <Box className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {user?.totalUsed ?? 0}
                    </span>
                    <span className="text-xs text-slate-400">mẫu 3D</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Tổng tác vụ AI generation đã hoàn thành.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Truy cập nhanh</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/50 hover:bg-[#121c2c]/50 text-left transition-all cursor-pointer group space-y-2 shadow-md hover:shadow-[0_0_25px_rgba(0,240,255,0.15)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Box className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    Studio Tạo 3D
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nhập ảnh hoặc mô tả để tạo mô hình 3D ngay tức thì.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ticket-prices')}
                  className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/50 hover:bg-[#121c2c]/50 text-left transition-all cursor-pointer group space-y-2 shadow-md hover:shadow-[0_0_25px_rgba(0,240,255,0.15)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    Bảng giá & Gói in
                  </h3>
                  <p className="text-xs text-slate-400">
                    Xem biểu phí in 3D nhựa Resin SLA & nhựa FDM.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 hover:border-cyan-400/50 hover:bg-[#121c2c]/50 text-left transition-all cursor-pointer group space-y-2 shadow-md hover:shadow-[0_0_25px_rgba(0,240,255,0.15)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    Đơn in 3D của tôi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Theo dõi trạng thái sản xuất và giao nhận mẫu phẩm.
                  </p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
