import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Layers,
  Printer,
  RefreshCw,
  Shield,
  Users,
  Box,
} from 'lucide-react';
import {
  adminService,
  type AdminUserItem,
} from '../../services/adminService';
import {
  listPricingPackages,
  type PricingPackage,
} from '../../services/pricingPackageService';
import {
  listOrders,
  updateOrderStatus,
  type OrderItem,
  type OrderStatus,
} from '../../services/orderService';
import {
  listGenerations,
  reviewGeneration,
  type GenerationTask,
} from '../../services/generationService';

type AdminTab = 'users' | 'orders' | 'packages' | 'generations';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Users State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [creditAmount, setCreditAmount] = useState(5);
  const [newRole, setNewRole] = useState('cus');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [nextOrderStatus, setNextOrderStatus] = useState<OrderStatus>('PrintingStarted');
  const [orderTrackingNumber, setOrderTrackingNumber] = useState('');
  const [orderStatusNote, setOrderStatusNote] = useState('Đã cập nhật tiến độ in ấn.');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Packages State
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<PricingPackage | null>(null);
  const [packagePriceVnd, setPackagePriceVnd] = useState(390000);
  const [packageIsActive, setPackageIsActive] = useState(true);
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);

  // Generations State
  const [generations, setGenerations] = useState<GenerationTask[]>([]);
  const [reviewNote] = useState('Đủ tiêu chuẩn in 3D');

  // Toast / Status Message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Fetchers
  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await listOrders();
      setOrders(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await listPricingPackages();
      setPackages(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchGenerations = async () => {
    try {
      const data = await listGenerations();
      setGenerations(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (activeTab === 'users') void fetchUsers();
      if (activeTab === 'orders') void fetchOrders();
      if (activeTab === 'packages') void fetchPackages();
      if (activeTab === 'generations') void fetchGenerations();
    });
  }, [activeTab]);

  // Actions
  const handleAddCredits = async () => {
    if (!selectedUser) return;
    try {
      setIsUpdatingUser(true);
      await adminService.addUserCredits(selectedUser.id, creditAmount);
      showToast(`Đã cộng ${creditAmount} lượt tạo 3D cho ${selectedUser.email}`);
      setSelectedUser(null);
      await fetchUsers();
    } catch {
      alert('Không thể cộng lượt tạo lúc này.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    try {
      setIsUpdatingUser(true);
      await adminService.updateUserRole(selectedUser.id, newRole);
      showToast(`Đã đổi vai trò thành công cho ${selectedUser.email}`);
      setSelectedUser(null);
      await fetchUsers();
    } catch {
      alert('Không thể cập nhật vai trò lúc này.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    try {
      setIsUpdatingOrder(true);
      await updateOrderStatus(selectedOrder.id, {
        status: nextOrderStatus,
        note: orderStatusNote,
        trackingNumber: orderTrackingNumber || undefined,
      });
      showToast(`Đã cập nhật trạng thái đơn ${selectedOrder.orderCode}`);
      setSelectedOrder(null);
      await fetchOrders();
    } catch {
      alert('Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleUpdatePackagePrice = async () => {
    if (!editingPackage) return;
    try {
      setIsUpdatingPackage(true);
      await adminService.updatePricingPackage(editingPackage.id, {
        priceVnd: packagePriceVnd,
        isActive: packageIsActive,
      });
      showToast(`Đã cập nhật giá gói ${editingPackage.name}`);
      setEditingPackage(null);
      await fetchPackages();
    } catch {
      alert('Không thể cập nhật gói in lúc này.');
    } finally {
      setIsUpdatingPackage(false);
    }
  };

  const handleReviewGen = async (id: string, approved: boolean) => {
    try {
      await reviewGeneration(id, approved, reviewNote);
      showToast(approved ? 'Đã duyệt mô hình 3D cho phép đặt in' : 'Đã từ chối mô hình');
      await fetchGenerations();
    } catch {
      alert('Không thể hoàn tất kiểm duyệt.');
    }
  };

  const formatVnd = (val: number) => val.toLocaleString('vi-VN') + ' đ';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-rose-500" />
            <span>Quản Trị Hệ Thống Idea2Model</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Quản lý tài khoản người dùng, cấp phát lượt tạo AI, điều phối đơn in 3D và gói biểu phí.
          </p>
        </div>

        {statusMessage && (
          <div className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-white/[0.05] text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Người dùng & Lượt tạo ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-white/[0.05] text-neutral-400 hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Đơn Hàng In 3D ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-white/[0.05] text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Gói Biểu Phí In ({packages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'generations'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-white/[0.05] text-neutral-400 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Tác Vụ 3D AI ({generations.length})</span>
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Danh Sách Người Dùng</h3>
            <button
              type="button"
              onClick={fetchUsers}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-neutral-300 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-white/[0.05] uppercase tracking-wider text-[11px] text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Lượt Free</th>
                  <th className="py-3 px-4">Lượt Mua</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{u.fullName || 'Chưa cập nhật'}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : u.role === 'staff'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/10 text-neutral-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{u.freeTrialRemaining}</td>
                    <td className="py-3 px-4 font-bold text-rose-400">{u.purchasedRemaining}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setCreditAmount(5);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-semibold cursor-pointer"
                      >
                        + Lượt tạo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
                      >
                        Đổi vai trò
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal for User Credits / Role */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#1a0508] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl text-white">
                <h3 className="font-bold text-base">Cập nhật tài khoản: {selectedUser.email}</h3>

                <div className="space-y-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-rose-200">Cộng thêm lượt tạo 3D:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded-lg bg-black/40 border border-white/20 text-white text-right"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingUser}
                    onClick={handleAddCredits}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận nạp lượt
                  </button>
                </div>

                <div className="space-y-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-rose-200">Đổi vai trò người dùng:</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/20 text-white"
                    >
                      <option value="cus">Khách hàng (cus)</option>
                      <option value="staff">Nhân viên (staff)</option>
                      <option value="admin">Quản trị viên (admin)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingUser}
                    onClick={handleUpdateRole}
                    className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận đổi vai trò
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-1.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Danh Sách Đơn Hàng In 3D</h3>
            <button
              type="button"
              onClick={fetchOrders}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-neutral-300 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-white/[0.05] uppercase tracking-wider text-[11px] text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Người nhận</th>
                  <th className="py-3 px-4">Chất liệu / SL</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{o.orderCode}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{o.receiverName}</p>
                      <p className="text-[10px] text-neutral-400">{o.receiverPhone} - {o.city}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p>{o.material}</p>
                      <p className="text-[10px] text-neutral-400">SL: {o.quantity} cái</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-400">{formatVnd(o.totalVnd)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 border border-white/20">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(o);
                          setNextOrderStatus(o.status);
                          setOrderTrackingNumber(o.trackingNumber || '');
                          setOrderStatusNote(o.statusNote || 'Tiến độ gia công in 3D');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                      >
                        Xử lý đơn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal for Order Status */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#1a0508] border border-white/20 rounded-2xl p-6 space-y-4 shadow-2xl text-white">
                <h3 className="font-bold text-base">Cập nhật đơn hàng: {selectedOrder.orderCode}</h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-rose-200 block mb-1">Trạng thái mới:</label>
                    <select
                      value={nextOrderStatus}
                      onChange={(e) => setNextOrderStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white"
                    >
                      <option value="Created">Created (Chờ duyệt in)</option>
                      <option value="PrintingStarted">PrintingStarted (Đang in 3D)</option>
                      <option value="Packaged">Packaged (Đã đóng gói)</option>
                      <option value="Shipped">Shipped (Đang giao hàng)</option>
                      <option value="Delivered">Delivered (Đã giao thành công)</option>
                      <option value="Cancelled">Cancelled (Hủy đơn)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-rose-200 block mb-1">Mã vận đơn (nếu có):</label>
                    <input
                      type="text"
                      placeholder="VD: VNPOST123456"
                      value={orderTrackingNumber}
                      onChange={(e) => setOrderTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-rose-200 block mb-1">Ghi chú trạng thái:</label>
                    <input
                      type="text"
                      value={orderStatusNote}
                      onChange={(e) => setOrderStatusNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingOrder}
                    onClick={handleUpdateOrderStatus}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Packages */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cấu Hình Gói In 3D</h3>
            <button
              type="button"
              onClick={fetchPackages}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-neutral-300 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex justify-between items-center"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">{pkg.name}</h4>
                  <p className="text-xs text-neutral-400">Vật liệu: <span className="text-rose-200 font-semibold">{pkg.material}</span></p>
                  <p className="text-xs text-neutral-400">Chiều cao: {pkg.heightRangeCm || `${pkg.minHeightMm}-${pkg.maxHeightMm} mm`}</p>
                  <p className="text-sm font-extrabold text-white mt-2">{formatVnd(pkg.priceVnd)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage(pkg);
                    setPackagePriceVnd(pkg.priceVnd);
                    setPackageIsActive(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                >
                  Sửa giá
                </button>
              </div>
            ))}
          </div>

          {/* Modal for Package Price */}
          {editingPackage && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#1a0508] border border-white/20 rounded-2xl p-6 space-y-4 shadow-2xl text-white">
                <h3 className="font-bold text-base">Chỉnh sửa giá: {editingPackage.name}</h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-rose-200 block mb-1">Đơn giá (VND):</label>
                    <input
                      type="number"
                      step="10000"
                      value={packagePriceVnd}
                      onChange={(e) => setPackagePriceVnd(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pkgActive"
                      checked={packageIsActive}
                      onChange={(e) => setPackageIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <label htmlFor="pkgActive" className="font-semibold text-neutral-200">Đang hoạt động</label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPackage(null)}
                    className="px-4 py-1.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingPackage}
                    onClick={handleUpdatePackagePrice}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Lưu giá
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Generations */}
      {activeTab === 'generations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tác Vụ 3D AI Vừa Tạo</h3>
            <button
              type="button"
              onClick={fetchGenerations}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-neutral-300 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {generations.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white truncate">{g.modelName || 'Mô hình 3D'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      g.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  {g.imageUrl && (
                    <img
                      src={g.imageUrl}
                      alt={g.modelName || 'Preview'}
                      className="w-full h-32 object-cover rounded-xl bg-black/40"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[10px] text-neutral-400">Tiến độ: {g.progress}%</span>
                  <div className="space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleReviewGen(g.id, true)}
                      className="px-2 py-1 rounded-md bg-emerald-600/30 text-emerald-300 text-[10px] font-bold hover:bg-emerald-600/50 cursor-pointer"
                    >
                      Duyệt in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewGen(g.id, false)}
                      className="px-2 py-1 rounded-md bg-rose-600/30 text-rose-300 text-[10px] font-bold hover:bg-rose-600/50 cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
