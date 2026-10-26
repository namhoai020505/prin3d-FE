import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaIndustry,
  FaSearch,
  FaSyncAlt,
  FaBoxes,
  FaPrint,
  FaCheckDouble,
  FaShippingFast,
  FaFilter,
  FaSpinner,
  FaThLarge,
  FaListUl,
  FaCompressAlt,
  FaExpandAlt,
  FaCheck,
  FaEye,
  FaChevronRight,
} from 'react-icons/fa';
import { adminOrderService, type OrderSummaryItem } from '../../../services/admin/adminOrderService';
import { fulfillmentService } from '../../../services/fulfillmentService';
import KanbanColumn from './KanbanColumn';
import FulfillmentCard from './FulfillmentCard';
import FulfillmentTimelineDrawer from './FulfillmentTimelineDrawer';
import AssignLabDialog from './dialogs/AssignLabDialog';
import RespondAssignmentDialog from './dialogs/RespondAssignmentDialog';
import StartProductionRunDialog from './dialogs/StartProductionRunDialog';
import QcReviewDialog from './dialogs/QcReviewDialog';
import CreateShipmentDialog from './dialogs/CreateShipmentDialog';
import UpdateShipmentEventDialog from './dialogs/UpdateShipmentEventDialog';
import StatusBadge, { type StatusBadgeTone } from '../components/StatusBadge';

const formatCurrency = (val?: number) => {
  if (!val && val !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const getStatusBadgeConfig = (status?: string): { label: string; tone: StatusBadgeTone } => {
  switch (status) {
    case 'AwaitingAssignment':
      return { label: 'Chờ Gán Xưởng', tone: 'amber' };
    case 'Assigned':
      return { label: 'Xưởng Tiếp Nhận', tone: 'blue' };
    case 'Printing':
    case 'InProduction':
      return { label: 'Đang In 3D', tone: 'purple' };
    case 'PostProcessing':
      return { label: 'Xử Lý Nguội', tone: 'cyan' };
    case 'QualityCheck':
      return { label: 'Chờ Kiểm Định QC', tone: 'rose' };
    case 'Packaged':
      return { label: 'Đã Đóng Gói', tone: 'emerald' };
    case 'Shipping':
      return { label: 'Đang Giao Vận', tone: 'cyan' };
    case 'Delivered':
      return { label: 'Đã Giao Hàng', tone: 'success' };
    default:
      return { label: status || 'Khởi tạo', tone: 'slate' };
  }
};

const getStepNumber = (status?: string): number => {
  switch (status) {
    case 'AwaitingAssignment':
    case 'PendingAssignment':
      return 1;
    case 'Assigned':
      return 2;
    case 'Printing':
    case 'PostProcessing':
    case 'InProduction':
      return 3;
    case 'QualityCheck':
      return 4;
    case 'Packaged':
    case 'Shipping':
      return 5;
    case 'Delivered':
      return 6;
    default:
      return 1;
  }
};

export const AdminFulfillmentPage: React.FC = () => {
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View Mode & Density
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Collapsed columns state
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({
    'col-awaiting': false,
    'col-assigned': false,
    'col-production': false,
    'col-qc': false,
    'col-delivery': false,
  });

  const toggleColumnCollapse = (colId: string) => {
    setCollapsedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const collapseEmptyColumns = () => {
    setCollapsedColumns({
      'col-awaiting': colAwaiting.length === 0,
      'col-assigned': colAssigned.length === 0,
      'col-production': colProduction.length === 0,
      'col-qc': colQc.length === 0,
      'col-delivery': colDelivery.length === 0,
    });
  };

  const expandAllColumns = () => {
    setCollapsedColumns({
      'col-awaiting': false,
      'col-assigned': false,
      'col-production': false,
      'col-qc': false,
      'col-delivery': false,
    });
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [showDelivered, setShowDelivered] = useState(true);

  // Drawer state
  const [selectedDrawerOrderId, setSelectedDrawerOrderId] = useState<string | null>(routeOrderId || null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(Boolean(routeOrderId));

  useEffect(() => {
    if (routeOrderId) {
      setSelectedDrawerOrderId(routeOrderId);
      setDrawerOpen(true);
    }
  }, [routeOrderId]);

  // Dialog states
  const [assignDialog, setAssignDialog] = useState<{ isOpen: boolean; orderId: string; orderCode: string }>({
    isOpen: false,
    orderId: '',
    orderCode: '',
  });

  const [respondDialog, setRespondDialog] = useState<{
    isOpen: boolean;
    assignmentId: string;
    orderCode: string;
    defaultAccepted: boolean;
  }>({
    isOpen: false,
    assignmentId: '',
    orderCode: '',
    defaultAccepted: true,
  });

  const [startRunDialog, setStartRunDialog] = useState<{
    isOpen: boolean;
    assignmentId: string;
    orderCode: string;
    defaultQuantity?: number;
  }>({
    isOpen: false,
    assignmentId: '',
    orderCode: '',
    defaultQuantity: 1,
  });

  const [qcDialog, setQcDialog] = useState<{
    isOpen: boolean;
    runId: string;
    orderCode: string;
  }>({
    isOpen: false,
    runId: '',
    orderCode: '',
  });

  const [createShipmentDialog, setCreateShipmentDialog] = useState<{
    isOpen: boolean;
    orderId: string;
    orderCode: string;
  }>({
    isOpen: false,
    orderId: '',
    orderCode: '',
  });

  const [updateShipmentDialog, setUpdateShipmentDialog] = useState<{
    isOpen: boolean;
    shipmentId: string;
    orderCode: string;
    currentStatus?: string;
  }>({
    isOpen: false,
    shipmentId: '',
    orderCode: '',
  });

  // Load orders
  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const [page1, page2] = await Promise.all([
        adminOrderService.getOrders(1).catch(() => []),
        adminOrderService.getOrders(2).catch(() => []),
      ]);
      const combined = [...page1, ...page2];
      const map = new Map<string, OrderSummaryItem>();
      combined.forEach((o) => {
        if (o.id && !map.has(o.id)) map.set(o.id, o);
      });
      setOrders(Array.from(map.values()));
    } catch (err: any) {
      console.error('Error fetching orders for fulfillment:', err);
      setErrorMessage('Không thể tải danh sách đơn hàng điều phối.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDrawer = (order: OrderSummaryItem) => {
    setSelectedDrawerOrderId(order.id);
    setDrawerOpen(true);
    navigate(`/admin/fulfillment/${order.id}`);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedDrawerOrderId(null);
    navigate('/admin/fulfillment');
  };

  const getTimelineContext = async (orderId: string) => {
    const timeline = await fulfillmentService.getOrderTimeline(orderId);
    const activeAssignment =
      timeline.assignments?.find((a) => a.isActive || a.status === 'Offered' || a.status === 'Accepted') ||
      timeline.assignments?.[timeline.assignments.length - 1];

    const allRuns =
      timeline.assignments?.flatMap((a) => a.productionRuns || []) || timeline.productionRuns || [];
    const activeRun = allRuns[allRuns.length - 1];

    const activeShipment = timeline.shipments?.[timeline.shipments.length - 1];

    return { timeline, activeAssignment, activeRun, activeShipment };
  };

  const handleAssignLab = (order: OrderSummaryItem) => {
    setAssignDialog({
      isOpen: true,
      orderId: order.id,
      orderCode: order.orderCode,
    });
  };

  const handleRespondAssignment = async (order: OrderSummaryItem, defaultAccepted: boolean) => {
    try {
      const { activeAssignment } = await getTimelineContext(order.id);
      if (!activeAssignment?.id) {
        alert('Không tìm thấy thông tin gán xưởng cho đơn hàng này.');
        return;
      }
      setRespondDialog({
        isOpen: true,
        assignmentId: activeAssignment.id,
        orderCode: order.orderCode,
        defaultAccepted,
      });
    } catch (err: any) {
      console.error('Error opening respond assignment dialog:', err);
      alert('Lỗi khi lấy thông tin xưởng: ' + (err.message || ''));
    }
  };

  const handleStartRun = async (order: OrderSummaryItem) => {
    try {
      const { activeAssignment } = await getTimelineContext(order.id);
      if (!activeAssignment?.id) {
        alert('Đơn hàng cần được gán xưởng trước khi bắt đầu in.');
        return;
      }
      setStartRunDialog({
        isOpen: true,
        assignmentId: activeAssignment.id,
        orderCode: order.orderCode,
        defaultQuantity: order.quantity || 1,
      });
    } catch (err: any) {
      console.error('Error starting run:', err);
      alert('Lỗi: ' + (err.message || ''));
    }
  };

  const handleUpdateRunStatus = async (
    order: OrderSummaryItem,
    status: 'PostProcessing' | 'QualityCheck'
  ) => {
    try {
      const { activeRun } = await getTimelineContext(order.id);
      if (!activeRun?.id) {
        alert('Không tìm thấy đợt in đang chạy.');
        return;
      }
      await fulfillmentService.updateRunStatus(activeRun.id, status);
      await fetchOrders(true);
    } catch (err: any) {
      console.error('Error updating run status:', err);
      alert('Lỗi cập nhật tiến độ in: ' + (err.message || ''));
    }
  };

  const handleQcReview = async (order: OrderSummaryItem) => {
    try {
      const { activeRun } = await getTimelineContext(order.id);
      if (!activeRun?.id) {
        alert('Không tìm thấy đợt in cần kiểm định QC.');
        return;
      }
      setQcDialog({
        isOpen: true,
        runId: activeRun.id,
        orderCode: order.orderCode,
      });
    } catch (err: any) {
      console.error('Error opening QC review:', err);
      alert('Lỗi: ' + (err.message || ''));
    }
  };

  const handleCreateShipment = (order: OrderSummaryItem) => {
    setCreateShipmentDialog({
      isOpen: true,
      orderId: order.id,
      orderCode: order.orderCode,
    });
  };

  const handleUpdateShipment = async (order: OrderSummaryItem) => {
    try {
      const { activeShipment } = await getTimelineContext(order.id);
      if (!activeShipment?.id) {
        alert('Không tìm thấy vận đơn cho đơn hàng này.');
        return;
      }
      setUpdateShipmentDialog({
        isOpen: true,
        shipmentId: activeShipment.id,
        orderCode: order.orderCode,
        currentStatus: activeShipment.status,
      });
    } catch (err: any) {
      console.error('Error opening shipment update:', err);
      alert('Lỗi: ' + (err.message || ''));
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!showDelivered && o.fulfillmentStatus === 'Delivered') return false;

      if (materialFilter !== 'ALL') {
        const mat = (o.material || '').toLowerCase();
        if (!mat.includes(materialFilter.toLowerCase())) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const code = (o.orderCode || '').toLowerCase();
        const receiver = (o.receiverName || '').toLowerCase();
        const phone = (o.receiverPhone || '').toLowerCase();
        return code.includes(query) || receiver.includes(query) || phone.includes(query);
      }

      return true;
    });
  }, [orders, showDelivered, materialFilter, searchTerm]);

  // Column Categorization
  const colAwaiting = useMemo(
    () =>
      filteredOrders.filter(
        (o) =>
          !o.fulfillmentStatus ||
          o.fulfillmentStatus === 'AwaitingAssignment' ||
          o.fulfillmentStatus === 'PendingAssignment'
      ),
    [filteredOrders]
  );

  const colAssigned = useMemo(
    () => filteredOrders.filter((o) => o.fulfillmentStatus === 'Assigned'),
    [filteredOrders]
  );

  const colProduction = useMemo(
    () =>
      filteredOrders.filter(
        (o) =>
          o.fulfillmentStatus === 'Printing' ||
          o.fulfillmentStatus === 'PostProcessing' ||
          o.fulfillmentStatus === 'InProduction'
      ),
    [filteredOrders]
  );

  const colQc = useMemo(
    () => filteredOrders.filter((o) => o.fulfillmentStatus === 'QualityCheck'),
    [filteredOrders]
  );

  const colDelivery = useMemo(
    () =>
      filteredOrders.filter(
        (o) =>
          o.fulfillmentStatus === 'Packaged' ||
          o.fulfillmentStatus === 'Shipping' ||
          o.fulfillmentStatus === 'Delivered'
      ),
    [filteredOrders]
  );

  const availableMaterials = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.material) set.add(o.material);
    });
    return Array.from(set);
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-4 lg:p-6 space-y-5 max-w-[1920px] mx-auto">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Gán Xưởng</span>
            <FaBoxes className="text-sm" />
          </div>
          <div className="mt-1.5 text-2xl font-black font-mono text-white">{colAwaiting.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đơn chờ phân bổ trạm</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-bold uppercase tracking-wider">Xưởng Tiếp Nhận</span>
            <FaIndustry className="text-sm" />
          </div>
          <div className="mt-1.5 text-2xl font-black font-mono text-white">{colAssigned.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Chờ duyệt ca in</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đang Sản Xuất</span>
            <FaPrint className="text-sm" />
          </div>
          <div className="mt-1.5 text-2xl font-black font-mono text-white">{colProduction.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đang in & xử lý nguội</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Kiểm Định QC</span>
            <FaCheckDouble className="text-sm" />
          </div>
          <div className="mt-1.5 text-2xl font-black font-mono text-white">{colQc.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Thẩm định dung sai & bavia</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đóng Gói & Giao Vận</span>
            <FaShippingFast className="text-sm" />
          </div>
          <div className="mt-1.5 text-2xl font-black font-mono text-white">{colDelivery.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đang giao & hoàn tất</p>
        </div>
      </div>

      {/* Control Bar: Dual View Toggle, Density, Search, Filters, Refresh */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dual-View Toggle: Kanban vs Table */}
          <div className="flex items-center rounded-xl bg-slate-950/70 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaThLarge className="text-xs" />
              <span>Kanban 5 Cột</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaListUl className="text-xs" />
              <span>Bảng Dây Chuyền</span>
            </button>
          </div>

          {/* Density Toggle (Kanban Mode Only) */}
          {viewMode === 'kanban' && (
            <div className="flex items-center rounded-xl bg-slate-950/70 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  density === 'comfortable'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tiêu chuẩn
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  density === 'compact'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gọn
              </button>
            </div>
          )}

          {/* Quick Collapse Empty Columns Helper */}
          {viewMode === 'kanban' && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                onClick={collapseEmptyColumns}
                title="Tự động thu gọn các cột hiện có 0 đơn hàng"
                className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <FaCompressAlt className="text-[10px] text-cyan-400" />
                <span>Thu gọn cột trống</span>
              </button>
              <button
                type="button"
                onClick={expandAllColumns}
                title="Mở rộng toàn bộ 5 cột"
                className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <FaExpandAlt className="text-[10px] text-slate-400" />
                <span>Bung tất cả</span>
              </button>
            </div>
          )}
        </div>

        {/* Search, Filter, Delivered Toggle, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Tìm TB-..., tên, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 h-9 pl-8 pr-3 rounded-xl border border-white/10 bg-slate-950/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Material Filter */}
          <div className="hidden md:flex items-center gap-1.5">
            <FaFilter className="text-xs text-slate-500" />
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="h-9 px-2.5 rounded-xl border border-white/10 bg-slate-950/60 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">Tất cả vật liệu</option>
              {availableMaterials.map((mat) => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Delivered */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDelivered}
              onChange={(e) => setShowDelivered(e.target.checked)}
              className="rounded border-white/20 text-cyan-500 focus:ring-cyan-400"
            />
            <span className="hidden sm:inline">Hiện đơn đã giao</span>
          </label>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FaSyncAlt className={`text-xs ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Main Content Area: Kanban vs Table View */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-3xl text-cyan-400" />
          <p className="text-xs">Đang tải dữ liệu điều phối sản xuất...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD: Auto-Fit Width with Collapsible Columns */
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="flex gap-3 w-full min-w-full items-start">
            {/* Column 1: Chờ Gán Xưởng */}
            <KanbanColumn
              id="col-awaiting"
              stepNumber={1}
              title="Chờ Gán Xưởng"
              subtitle="Phân công trạm in đối tác"
              count={colAwaiting.length}
              icon={<FaBoxes className="text-amber-400" />}
              headerColorClass="bg-amber-500/10 border-b-amber-500/20"
              badgeColorClass="border-amber-400/30 bg-amber-500/15 text-amber-300"
              isCollapsed={collapsedColumns['col-awaiting']}
              onToggleCollapse={() => toggleColumnCollapse('col-awaiting')}
            >
              {colAwaiting.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-awaiting"
                  density={density}
                  onCardClick={handleOpenDrawer}
                  onAssignLab={handleAssignLab}
                  onRespondAssignment={handleRespondAssignment}
                  onStartRun={handleStartRun}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onQcReview={handleQcReview}
                  onCreateShipment={handleCreateShipment}
                  onUpdateShipment={handleUpdateShipment}
                />
              ))}
            </KanbanColumn>

            {/* Column 2: Xưởng Tiếp Nhận */}
            <KanbanColumn
              id="col-assigned"
              stepNumber={2}
              title="Xưởng Tiếp Nhận"
              subtitle="Trạm xác nhận & xếp ca in"
              count={colAssigned.length}
              icon={<FaIndustry className="text-blue-400" />}
              headerColorClass="bg-blue-500/10 border-b-blue-500/20"
              badgeColorClass="border-blue-400/30 bg-blue-500/15 text-blue-300"
              isCollapsed={collapsedColumns['col-assigned']}
              onToggleCollapse={() => toggleColumnCollapse('col-assigned')}
            >
              {colAssigned.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-assigned"
                  density={density}
                  onCardClick={handleOpenDrawer}
                  onAssignLab={handleAssignLab}
                  onRespondAssignment={handleRespondAssignment}
                  onStartRun={handleStartRun}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onQcReview={handleQcReview}
                  onCreateShipment={handleCreateShipment}
                  onUpdateShipment={handleUpdateShipment}
                />
              ))}
            </KanbanColumn>

            {/* Column 3: Đang In & Xử Lý */}
            <KanbanColumn
              id="col-production"
              stepNumber={3}
              title="Đang In & Xử Lý"
              subtitle="Chế tác 3D & xử lý nguội"
              count={colProduction.length}
              icon={<FaPrint className="text-purple-400" />}
              headerColorClass="bg-purple-500/10 border-b-purple-500/20"
              badgeColorClass="border-purple-400/30 bg-purple-500/15 text-purple-300"
              isCollapsed={collapsedColumns['col-production']}
              onToggleCollapse={() => toggleColumnCollapse('col-production')}
            >
              {colProduction.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-production"
                  density={density}
                  onCardClick={handleOpenDrawer}
                  onAssignLab={handleAssignLab}
                  onRespondAssignment={handleRespondAssignment}
                  onStartRun={handleStartRun}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onQcReview={handleQcReview}
                  onCreateShipment={handleCreateShipment}
                  onUpdateShipment={handleUpdateShipment}
                />
              ))}
            </KanbanColumn>

            {/* Column 4: Kiểm Định QC */}
            <KanbanColumn
              id="col-qc"
              stepNumber={4}
              title="Kiểm Định QC"
              subtitle="Đo dung sai & độ kín nước"
              count={colQc.length}
              icon={<FaCheckDouble className="text-rose-400" />}
              headerColorClass="bg-rose-500/10 border-b-rose-500/20"
              badgeColorClass="border-rose-400/30 bg-rose-500/15 text-rose-300"
              isCollapsed={collapsedColumns['col-qc']}
              onToggleCollapse={() => toggleColumnCollapse('col-qc')}
            >
              {colQc.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-qc"
                  density={density}
                  onCardClick={handleOpenDrawer}
                  onAssignLab={handleAssignLab}
                  onRespondAssignment={handleRespondAssignment}
                  onStartRun={handleStartRun}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onQcReview={handleQcReview}
                  onCreateShipment={handleCreateShipment}
                  onUpdateShipment={handleUpdateShipment}
                />
              ))}
            </KanbanColumn>

            {/* Column 5: Đóng Gói & Giao Vận */}
            <KanbanColumn
              id="col-delivery"
              stepNumber={5}
              title="Đóng Gói & Giao Vận"
              subtitle="Đóng hộp & phát hàng"
              count={colDelivery.length}
              icon={<FaShippingFast className="text-emerald-400" />}
              headerColorClass="bg-emerald-500/10 border-b-emerald-500/20"
              badgeColorClass="border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
              isCollapsed={collapsedColumns['col-delivery']}
              onToggleCollapse={() => toggleColumnCollapse('col-delivery')}
            >
              {colDelivery.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-delivery"
                  density={density}
                  onCardClick={handleOpenDrawer}
                  onAssignLab={handleAssignLab}
                  onRespondAssignment={handleRespondAssignment}
                  onStartRun={handleStartRun}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onQcReview={handleQcReview}
                  onCreateShipment={handleCreateShipment}
                  onUpdateShipment={handleUpdateShipment}
                />
              ))}
            </KanbanColumn>
          </div>
        </div>
      ) : (
        /* TABLE STEPPER VIEW (Bảng Dây Chuyền) */
        <div className="rounded-2xl border border-white/10 bg-[#0B1120]/80 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/10 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã Đơn Hàng</th>
                  <th className="py-3.5 px-4">Khách Hàng</th>
                  <th className="py-3.5 px-4">Vật Liệu & SL</th>
                  <th className="py-3.5 px-4">Tổng Tiền</th>
                  <th className="py-3.5 px-4 min-w-[320px]">Tiến Trình 5 Bước</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const stepNum = getStepNumber(o.fulfillmentStatus);
                    const { label, tone } = getStatusBadgeConfig(o.fulfillmentStatus);

                    return (
                      <tr
                        key={o.id}
                        onClick={() => handleOpenDrawer(o)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        {/* Order Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                          <span className="group-hover:underline flex items-center gap-1">
                            {o.orderCode}
                            <FaChevronRight className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{o.receiverName || 'Khách hàng'}</div>
                          <div className="text-[11px] text-slate-500">{o.receiverPhone || '—'}</div>
                        </td>

                        {/* Material & Qty */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300">{o.material || 'Resin Chuẩn'}</div>
                          <div className="text-[11px] text-slate-500">SL: {o.quantity || 1}</div>
                        </td>

                        {/* Total Price */}
                        <td className="py-3.5 px-4 font-bold text-white font-mono">
                          {formatCurrency(o.totalVnd)}
                        </td>

                        {/* 5-Step Stepper */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 w-full">
                            {[
                              { num: 1, label: 'Gán' },
                              { num: 2, label: 'Xưởng' },
                              { num: 3, label: 'In 3D' },
                              { num: 4, label: 'QC' },
                              { num: 5, label: 'Giao' },
                            ].map((step, sIdx) => {
                              const isPassed = stepNum > step.num;
                              const isCurrent = stepNum === step.num;

                              return (
                                <React.Fragment key={step.num}>
                                  <div
                                    title={`Bước ${step.num}: ${step.label}`}
                                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border transition-all ${
                                      isPassed
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                        : isCurrent
                                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)] ring-2 ring-cyan-500/20'
                                        : 'bg-slate-900 border-white/10 text-slate-600'
                                    }`}
                                  >
                                    {isPassed ? <FaCheck className="text-[9px]" /> : step.num}
                                  </div>
                                  {sIdx < 4 && (
                                    <div
                                      className={`flex-1 h-0.5 rounded-full transition-all ${
                                        isPassed ? 'bg-emerald-500/50' : 'bg-white/10'
                                      }`}
                                    />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <StatusBadge label={label} tone={tone} size="sm" />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {stepNum === 1 && (
                              <button
                                type="button"
                                onClick={() => handleAssignLab(o)}
                                className="btn-pooled-cyan px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm"
                              >
                                Gán Xưởng
                              </button>
                            )}
                            {stepNum === 2 && (
                              <button
                                type="button"
                                onClick={() => handleStartRun(o)}
                                className="btn-pooled-cyan px-3 py-1.5 text-xs font-bold rounded-lg"
                              >
                                Bắt Đầu In
                              </button>
                            )}
                            {stepNum === 3 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateRunStatus(
                                    o,
                                    o.fulfillmentStatus === 'Printing' ? 'PostProcessing' : 'QualityCheck'
                                  )
                                }
                                className="btn-pooled-cyan px-3 py-1.5 text-xs font-bold rounded-lg"
                              >
                                {o.fulfillmentStatus === 'Printing' ? 'Xử Lý Nguội' : 'Chờ QC'}
                              </button>
                            )}
                            {stepNum === 4 && (
                              <button
                                type="button"
                                onClick={() => handleQcReview(o)}
                                className="btn-pooled-cyan px-3 py-1.5 text-xs font-bold rounded-lg"
                              >
                                Đánh Giá QC
                              </button>
                            )}
                            {stepNum === 5 && (
                              <button
                                type="button"
                                onClick={() =>
                                  !o.trackingNumber ? handleCreateShipment(o) : handleUpdateShipment(o)
                                }
                                className="btn-pooled-cyan px-3 py-1.5 text-xs font-bold rounded-lg"
                              >
                                {!o.trackingNumber ? 'Tạo Vận Đơn' : 'Cập Nhật Giao'}
                              </button>
                            )}
                            {stepNum === 6 && (
                              <span className="text-emerald-400 font-semibold text-[11px] px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                Hoàn tất
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(o)}
                              title="Xem chi tiết dòng thời gian"
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <FaEye className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline Drawer */}
      <FulfillmentTimelineDrawer
        isOpen={drawerOpen}
        orderId={selectedDrawerOrderId}
        onClose={handleCloseDrawer}
      />

      {/* Dialogs */}
      <AssignLabDialog
        isOpen={assignDialog.isOpen}
        orderId={assignDialog.orderId}
        orderCode={assignDialog.orderCode}
        onClose={() => setAssignDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />

      <RespondAssignmentDialog
        isOpen={respondDialog.isOpen}
        assignmentId={respondDialog.assignmentId}
        orderCode={respondDialog.orderCode}
        defaultAccepted={respondDialog.defaultAccepted}
        onClose={() => setRespondDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />

      <StartProductionRunDialog
        isOpen={startRunDialog.isOpen}
        assignmentId={startRunDialog.assignmentId}
        orderCode={startRunDialog.orderCode}
        defaultQuantity={startRunDialog.defaultQuantity}
        onClose={() => setStartRunDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />

      <QcReviewDialog
        isOpen={qcDialog.isOpen}
        runId={qcDialog.runId}
        orderCode={qcDialog.orderCode}
        onClose={() => setQcDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />

      <CreateShipmentDialog
        isOpen={createShipmentDialog.isOpen}
        orderId={createShipmentDialog.orderId}
        orderCode={createShipmentDialog.orderCode}
        onClose={() => setCreateShipmentDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />

      <UpdateShipmentEventDialog
        isOpen={updateShipmentDialog.isOpen}
        shipmentId={updateShipmentDialog.shipmentId}
        orderCode={updateShipmentDialog.orderCode}
        currentStatus={updateShipmentDialog.currentStatus}
        onClose={() => setUpdateShipmentDialog((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => fetchOrders(true)}
      />
    </div>
  );
};

export default AdminFulfillmentPage;
