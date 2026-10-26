import React, { useCallback, useEffect, useState } from 'react';
import {
  FaUsersCog,
  FaUserShield,
  FaCoins,
  FaTag,
  FaEdit,
  FaSyncAlt,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaKey,
  FaLayerGroup,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaToggleOn,
  FaToggleOff,
  FaSearch,
  FaCube,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import {
  adminService,
  type AdminUserItem,
  type AdminPricingPackage,
  type UpdatePricingPackagePayload,
} from '../../../services/adminService';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatVND } from '../orders/orderStatus';

export const SystemAdminPage: React.FC = () => {
  // =========================================================================
  // STATE: USERS MANAGEMENT
  // =========================================================================
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userPage, setUserPage] = useState<number>(1);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');

  // Lock / Unlock User Modal
  const [lockModalUser, setLockModalUser] = useState<AdminUserItem | null>(null);
  const [lockReason, setLockReason] = useState<string>('');
  const [isSubmittingLock, setIsSubmittingLock] = useState<boolean>(false);

  // Grant AI Credits Modal
  const [creditModalUser, setCreditModalUser] = useState<AdminUserItem | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(10);
  const [creditReason, setCreditReason] = useState<string>('Quản trị viên cấp bổ sung lượt tạo 3D AI');
  const [creditIdempotencyKey, setCreditIdempotencyKey] = useState<string>('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState<boolean>(false);

  // Role updating state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // =========================================================================
  // STATE: PRICING PACKAGES
  // =========================================================================
  const [pricingPackages, setPricingPackages] = useState<AdminPricingPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(true);

  // Edit Pricing Package Modal
  const [editingPackage, setEditingPackage] = useState<AdminPricingPackage | null>(null);
  const [editPriceVnd, setEditPriceVnd] = useState<number>(300000);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSubmittingPackage, setIsSubmittingPackage] = useState<boolean>(false);

  // =========================================================================
  // DATA FETCHING
  // =========================================================================
  const fetchUsers = useCallback(async (page: number) => {
    try {
      setIsLoadingUsers(true);
      const res = await adminService.getUsers(page);
      setUsers(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể nạp danh sách người dùng.';
      toast.error(`Lỗi tải người dùng: ${msg}`);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      const res = await adminService.getPricingPackages();
      setPricingPackages(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể nạp bảng giá in 3D.';
      toast.error(`Lỗi tải gói in: ${msg}`);
      setPricingPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(userPage);
  }, [fetchUsers, userPage]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  // =========================================================================
  // HANDLERS: ROLE CHANGE
  // =========================================================================
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingRoleId(userId);
      await adminService.updateUserRole(userId, newRole);
      toast.success(`Đã cập nhật vai trò người dùng thành '${newRole}'`);
      await fetchUsers(userPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đổi vai trò người dùng.';
      toast.error(`Lỗi cập nhật vai trò: ${msg}`);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // =========================================================================
  // HANDLERS: LOCK / UNLOCK USER
  // =========================================================================
  const handleOpenLockModal = (user: AdminUserItem) => {
    const isLocked = user.accountStatus?.toLowerCase() === 'locked';
    if (isLocked) {
      // Direct unlock or modal
      setLockModalUser(user);
      setLockReason('');
    } else {
      setLockModalUser(user);
      setLockReason('Vi phạm quy tắc sử dụng tài nguyên nền tảng in 3D');
    }
  };

  const handleConfirmLockOrUnlock = async () => {
    if (!lockModalUser) return;
    const isLocked = lockModalUser.accountStatus?.toLowerCase() === 'locked';

    try {
      setIsSubmittingLock(true);
      if (isLocked) {
        await adminService.unlockUser(lockModalUser.id);
        toast.success(`Đã mở khóa tài khoản ${lockModalUser.email} thành công.`);
      } else {
        if (!lockReason || lockReason.trim().length < 3) {
          toast.warn('Lý do khóa tài khoản phải có ít nhất 3 ký tự.');
          return;
        }
        await adminService.lockUser(lockModalUser.id, lockReason.trim());
        toast.success(`Đã khóa tài khoản ${lockModalUser.email} thành công.`);
      }
      setLockModalUser(null);
      await fetchUsers(userPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác khóa/mở khóa thất bại.';
      toast.error(msg);
    } finally {
      setIsSubmittingLock(false);
    }
  };

  // =========================================================================
  // HANDLERS: ADD USER CREDITS
  // =========================================================================
  const handleOpenCreditModal = (user: AdminUserItem) => {
    setCreditModalUser(user);
    setCreditAmount(10);
    setCreditReason('Quản trị viên cấp bổ sung lượt tạo 3D AI');
    setCreditIdempotencyKey(uuidv4());
  };

  const handleConfirmCredit = async () => {
    if (!creditModalUser) return;
    if (creditAmount < 1 || creditAmount > 100) {
      toast.warn('Số lượng credit phải từ 1 đến 100.');
      return;
    }
    if (!creditReason || creditReason.trim().length < 3) {
      toast.warn('Lý do cấp credit là bắt buộc (tối thiểu 3 ký tự).');
      return;
    }

    try {
      setIsSubmittingCredit(true);
      const key = creditIdempotencyKey || uuidv4();
      await adminService.addUserCredits(
        creditModalUser.id,
        creditAmount,
        creditReason.trim(),
        key
      );
      toast.success(
        `Đã cấp thành công ${creditAmount} credit AI cho tài khoản ${creditModalUser.email}`
      );
      setCreditModalUser(null);
      await fetchUsers(userPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cấp credit AI thất bại.';
      toast.error(msg);
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // =========================================================================
  // HANDLERS: EDIT PRICING PACKAGE
  // =========================================================================
  const handleOpenEditPackage = (pkg: AdminPricingPackage) => {
    setEditingPackage(pkg);
    setEditPriceVnd(pkg.priceVnd);
    setEditIsActive(pkg.isActive ?? true);
  };

  const handleConfirmUpdatePackage = async () => {
    if (!editingPackage) return;
    if (editPriceVnd < 1000) {
      toast.warn('Đơn giá in 3D phải từ 1.000 VNĐ trở lên.');
      return;
    }

    try {
      setIsSubmittingPackage(true);
      const payload: UpdatePricingPackagePayload = {
        priceVnd: editPriceVnd,
        isActive: editIsActive,
      };
      await adminService.updatePricingPackage(editingPackage.id, payload);
      toast.success(
        `Đã cập nhật giá gói "${editingPackage.name}" thành ${formatVND(editPriceVnd)}`
      );
      setEditingPackage(null);
      await fetchPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật giá gói in thất bại.';
      toast.error(msg);
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  // Filtered users for local search
  const filteredUsers = users.filter((u) => {
    if (!userSearchTerm.trim()) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.fullName.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-full space-y-8 pb-16 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Quản Trị Hệ Thống &amp; Cấu Hình Toàn Sàn • Tab 7
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-2.5">
            <FaUsersCog className="text-cyan-400 text-xl" />
            <span>Quản Trị Hệ Thống &amp; Cấu Hình</span>
          </h1>
          <p className="text-xs text-white/60">
            Quản lý danh sách tài khoản, phân quyền quản trị viên, cấp credit AI và điều chỉnh bảng giá gói in 3D.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void fetchUsers(userPage);
              void fetchPackages();
              toast.info('Đang làm mới dữ liệu hệ thống...');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5 text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all hover:bg-cyan-900/50 active:scale-95 cursor-pointer"
          >
            <FaSyncAlt className="w-3.5 h-3.5" />
            <span>Làm mới toàn bộ</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOCK 1: QUẢN TRỊ NGƯỜI DÙNG (USER MANAGEMENT) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-xl overflow-hidden space-y-0">
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <FaUserShield className="text-cyan-400" />
              <span>Quản Trị Người Dùng &amp; Tài Khoản</span>
            </h2>
            <p className="text-xs text-white/50">
              Phân trang 20 tài khoản/trang, điều chỉnh vai trò quản trị, khóa/mở khóa và cấp lượt tạo 3D AI
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
              <input
                type="text"
                placeholder="Tìm email, họ tên, vai trò..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-64 rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchUsers(userPage)}
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              title="Tải lại người dùng"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F17]/90 text-white/60 border-b border-white/10 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Họ Tên</th>
                <th className="p-4">Vai Trò (Role)</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Lượt Tạo 3D AI</th>
                <th className="p-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FaSpinner className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Đang nạp danh sách tài khoản từ API...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLocked = user.accountStatus?.toLowerCase() === 'locked';
                  const isUpdatingRole = updatingRoleId === user.id;

                  // Normalize user role for select dropdown
                  const currentRole = user.role?.toLowerCase() || 'cus';

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Email */}
                      <td className="p-4 font-mono font-semibold text-cyan-300">
                        {user.email}
                      </td>

                      {/* Full Name */}
                      <td className="p-4 font-medium text-white">
                        {user.fullName || '—'}
                      </td>

                      {/* Role Dropdown */}
                      <td className="p-4">
                        <div className="relative inline-block">
                          <select
                            value={currentRole === 'customer' ? 'cus' : currentRole}
                            disabled={isUpdatingRole}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="appearance-none rounded-lg border border-cyan-500/30 bg-black/60 px-3 py-1.5 pr-8 text-xs font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400 cursor-pointer disabled:opacity-50"
                            title="Thay đổi vai trò người dùng"
                          >
                            <option value="admin" className="bg-slate-900 text-white">
                              admin
                            </option>
                            <option value="staff" className="bg-slate-900 text-white">
                              staff
                            </option>
                            <option value="cus" className="bg-slate-900 text-white">
                              cus
                            </option>
                          </select>
                          {isUpdatingRole && (
                            <FaSpinner className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-cyan-400" />
                          )}
                        </div>
                      </td>

                      {/* Account Status */}
                      <td className="p-4">
                        <StatusBadge
                          label={isLocked ? 'Locked' : 'Active'}
                          tone={isLocked ? 'rose' : 'green'}
                        />
                      </td>

                      {/* Credits Info */}
                      <td className="p-4 font-mono text-[11px]">
                        <span className="text-cyan-300 font-semibold">
                          Free: {user.freeTrialRemaining ?? 0}
                        </span>
                        <span className="text-white/40 mx-1.5">•</span>
                        <span className="text-emerald-300 font-semibold">
                          Mua: {user.purchasedRemaining ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {/* Lock / Unlock Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenLockModal(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                            isLocked
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                              : 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isLocked ? (
                            <>
                              <FaUnlock className="w-3 h-3" />
                              <span>Mở Khóa</span>
                            </>
                          ) : (
                            <>
                              <FaLock className="w-3 h-3" />
                              <span>Khóa</span>
                            </>
                          )}
                        </button>

                        {/* Grant Credit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenCreditModal(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer active:scale-95"
                          title="Cấp thêm lượt tạo 3D AI"
                        >
                          <FaCoins className="w-3 h-3 text-cyan-400" />
                          <span>Cấp Credit AI</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination: 20 per page */}
        <Pagination
          page={userPage}
          pageSize={20}
          totalItemsOnPage={filteredUsers.length}
          hasNextPage={users.length >= 20}
          hasPrevPage={userPage > 1}
          onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
          onNext={() => setUserPage((p) => p + 1)}
          disabled={isLoadingUsers}
        />
      </div>

      {/* ========================================================================= */}
      {/* BLOCK 2: CẤU HÌNH BẢNG GIÁ IN (PRICING PACKAGES) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-xl overflow-hidden space-y-0">
        <div className="p-6 border-b border-white/10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <FaLayerGroup className="text-cyan-400" />
              <span>Cấu Hình Bảng Giá In 3D (Pricing Packages)</span>
            </h2>
            <p className="text-xs text-white/50">
              Danh mục gói dịch vụ in 3D theo kích thước, vật liệu, đơn giá niêm yết và công tắc kích hoạt
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPackages}
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              title="Tải lại bảng giá"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${isLoadingPackages ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Packages Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F17]/90 text-white/60 border-b border-white/10 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Tên Gói</th>
                <th className="p-4">Kích Thước (mm)</th>
                <th className="p-4">Vật Liệu In</th>
                <th className="p-4">Đơn Giá Hiện Tại (VNĐ)</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingPackages ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FaSpinner className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Đang nạp danh mục bảng giá in 3D...</span>
                    </div>
                  </td>
                </tr>
              ) : pricingPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40">
                    Chưa có gói in 3D nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                pricingPackages.map((pkg) => {
                  const isActive = pkg.isActive ?? true;

                  return (
                    <tr
                      key={pkg.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Package Name */}
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <FaCube className="text-cyan-400 shrink-0" />
                        <span>{pkg.name}</span>
                      </td>

                      {/* Dimensions mm */}
                      <td className="p-4 font-mono text-white/80">
                        {pkg.heightRangeCm
                          ? `${pkg.heightRangeCm} (${pkg.minHeightMm ?? 0} - ${pkg.maxHeightMm ?? 0} mm)`
                          : `${pkg.minHeightMm ?? 0} - ${pkg.maxHeightMm ?? 0} mm`}
                      </td>

                      {/* Material */}
                      <td className="p-4 font-mono text-cyan-300 font-semibold">
                        {pkg.material}
                      </td>

                      {/* Current Price */}
                      <td className="p-4 font-mono text-sm font-black text-white">
                        {formatVND(pkg.priceVnd)}
                      </td>

                      {/* Active Status Switch indicator */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
                              <FaToggleOn className="text-base text-emerald-400" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-white/40 font-semibold font-mono text-[11px]">
                              <FaToggleOff className="text-base text-white/40" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Button: Cập Nhật Giá */}
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPackage(pkg)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer active:scale-95"
                          title="Chỉnh sửa đơn giá và trạng thái gói in"
                        >
                          <FaEdit className="w-3 h-3" />
                          <span>Cập Nhật Giá</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: KHÓA / MỞ KHÓA TÀI KHOẢN */}
      {/* ========================================================================= */}
      {lockModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0F17] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {lockModalUser.accountStatus?.toLowerCase() === 'locked' ? (
                  <>
                    <FaUnlock className="text-emerald-400" />
                    <span>Mở Khóa Tài Khoản</span>
                  </>
                ) : (
                  <>
                    <FaLock className="text-rose-400" />
                    <span>Khóa Tài Khoản Người Dùng</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                className="text-white/40 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-1 font-mono">
                <div className="text-white/50">Tài khoản mục tiêu:</div>
                <div className="text-cyan-300 font-bold">{lockModalUser.email}</div>
                <div className="text-white/70">{lockModalUser.fullName}</div>
              </div>

              {lockModalUser.accountStatus?.toLowerCase() === 'locked' ? (
                <p className="text-white/70 leading-relaxed">
                  Bạn có chắc chắn muốn <strong className="text-emerald-400">mở khóa</strong> tài khoản này? Người dùng sẽ có thể đăng nhập và tạo đơn hàng in 3D bình thường.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="block font-semibold text-white/80">
                    Lý do khóa tài khoản (bắt buộc, tối thiểu 3 ký tự):
                  </label>
                  <textarea
                    rows={3}
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-white placeholder-white/30 outline-none focus:border-rose-400 font-medium"
                  />
                  {lockReason.trim().length > 0 && lockReason.trim().length < 3 && (
                    <span className="text-[11px] text-rose-400">
                      Lý do cần tối thiểu 3 ký tự.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setLockModalUser(null)}
                disabled={isSubmittingLock}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmLockOrUnlock}
                disabled={
                  isSubmittingLock ||
                  (lockModalUser.accountStatus?.toLowerCase() !== 'locked' &&
                    lockReason.trim().length < 3)
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                  lockModalUser.accountStatus?.toLowerCase() === 'locked'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                {isSubmittingLock ? (
                  <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FaCheck className="w-3.5 h-3.5" />
                )}
                <span>
                  {lockModalUser.accountStatus?.toLowerCase() === 'locked'
                    ? 'Xác nhận Mở Khóa'
                    : 'Xác nhận Khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CẤP CREDIT AI (VỚI IDEMPOTENCY-KEY UUID v4) */}
      {/* ========================================================================= */}
      {creditModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0B0F17] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaCoins className="text-cyan-400" />
                <span>Cấp Thêm Lượt Tạo 3D AI</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreditModalUser(null)}
                className="text-white/40 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-1 font-mono">
                <div className="text-white/50">Người nhận:</div>
                <div className="text-cyan-300 font-bold">{creditModalUser.email}</div>
                <div className="text-white/70">
                  Số dư hiện tại: {creditModalUser.freeTrialRemaining ?? 0} free + {creditModalUser.purchasedRemaining ?? 0} mua
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-white/80">
                  Số lượng Credit cấp bổ sung (1 – 100):
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 font-mono text-cyan-300 font-bold text-sm outline-none focus:border-cyan-400"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-white/80">
                  Lý do cấp (bắt buộc, tối thiểu 3 ký tự):
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Ví dụ: Đền bù sự cố AI generation..."
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
                />
              </div>

              {/* Idempotency Key auto-generated */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-white/80 flex items-center gap-1.5">
                    <FaKey className="text-cyan-400" />
                    <span>Khóa Idempotency-Key (UUID v4):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreditIdempotencyKey(uuidv4())}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <FaSyncAlt className="w-2.5 h-2.5" />
                    <span>Tạo mới</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={creditIdempotencyKey}
                  className="w-full rounded-xl border border-white/5 bg-black/60 p-2 font-mono text-[11px] text-white/60 select-all outline-none"
                />
                <span className="text-[10px] text-white/40 block">
                  Bảo vệ chống trùng lặp giao dịch cấp credit khi mạng chập chờn.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setCreditModalUser(null)}
                disabled={isSubmittingCredit}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmCredit}
                disabled={
                  isSubmittingCredit ||
                  creditAmount < 1 ||
                  creditAmount > 100 ||
                  !creditReason ||
                  creditReason.trim().length < 3
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-cyan-950/60 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingCredit ? (
                  <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FaCheckCircle className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận Cấp Credit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CẬP NHẬT GIÁ GÓI IN 3D */}
      {/* ========================================================================= */}
      {editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0B0F17] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaTag className="text-cyan-400" />
                <span>Cập Nhật Giá Gói In 3D</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="text-white/40 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-1 font-mono">
                <div className="text-white/50">Gói in:</div>
                <div className="text-cyan-300 font-bold text-sm">{editingPackage.name}</div>
                <div className="text-white/60">
                  {editingPackage.material} • {editingPackage.heightRangeCm || `${editingPackage.minHeightMm}-${editingPackage.maxHeightMm} mm`}
                </div>
              </div>

              {/* Price VNĐ */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-white/80">
                  Đơn giá mới (VNĐ):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    max="100000000"
                    value={editPriceVnd}
                    onChange={(e) => setEditPriceVnd(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 font-mono text-cyan-300 font-bold text-sm outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                    VNĐ
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 pt-0.5">
                  Định dạng hiển thị: {formatVND(editPriceVnd)}
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">Trạng thái phát hành (Active)</div>
                  <div className="text-[10px] text-white/40">
                    Khi tắt, khách hàng sẽ không thể chọn gói in này khi đặt hàng
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive((prev) => !prev)}
                  className={`text-2xl transition-colors cursor-pointer ${
                    editIsActive ? 'text-emerald-400' : 'text-white/30'
                  }`}
                  title={editIsActive ? 'Bấm để tắt' : 'Bấm để bật'}
                >
                  {editIsActive ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                disabled={isSubmittingPackage}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmUpdatePackage}
                disabled={isSubmittingPackage || editPriceVnd < 1000}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-cyan-950/60 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingPackage ? (
                  <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FaCheckCircle className="w-3.5 h-3.5" />
                )}
                <span>Lưu Biểu Phí</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminPage;
