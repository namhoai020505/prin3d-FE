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

export const AdminFulfillmentPage: React.FC = () => {
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [showDelivered, setShowDelivered] = useState(true);

  // Drawer state
  const [selectedDrawerOrderId, setSelectedDrawerOrderId] = useState<string | null>(routeOrderId || null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(Boolean(routeOrderId));

  // Sync route params with drawer
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

  // Load orders (fetch pages 1 and 2 to get up to 40 latest orders)
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
      // Deduplicate by order id
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

  // Open Drawer
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

  // Helper to fetch timeline and locate active entities
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

  // Action handlers
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
      // Delivered filter
      if (!showDelivered && o.fulfillmentStatus === 'Delivered') return false;

      // Material filter
      if (materialFilter !== 'ALL') {
        const mat = (o.material || '').toLowerCase();
        if (!mat.includes(materialFilter.toLowerCase())) return false;
      }

      // Search term
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

  // Available materials for filter dropdown
  const availableMaterials = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.material) set.add(o.material);
    });
    return Array.from(set);
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-4 lg:p-6 space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Gán Xưởng</span>
            <FaBoxes className="text-base" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">{colAwaiting.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đơn chờ phân bổ trạm</p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-bold uppercase tracking-wider">Xưởng Tiếp Nhận</span>
            <FaIndustry className="text-base" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">{colAssigned.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Chờ duyệt ca in</p>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đang Sản Xuất</span>
            <FaPrint className="text-base" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">{colProduction.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đang in & xử lý nguội</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Kiểm Định QC</span>
            <FaCheckDouble className="text-base" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">{colQc.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Thẩm định dung sai & bavia</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đóng Gói & Giao Vận</span>
            <FaShippingFast className="text-base" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">{colDelivery.length}</div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đang giao & hoàn tất</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn TB-..., tên khách, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-white/10 bg-slate-950/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Material Filter */}
          <div className="hidden md:flex items-center gap-2">
            <FaFilter className="text-xs text-slate-500" />
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 bg-slate-950/60 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">Tất cả vật liệu</option>
              {availableMaterials.map((mat) => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Toggle Delivered */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDelivered}
              onChange={(e) => setShowDelivered(e.target.checked)}
              className="rounded border-white/20 text-cyan-500 focus:ring-cyan-400"
            />
            Hiện đơn đã giao
          </label>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="h-10 px-4 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors disabled:opacity-50"
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

      {/* Kanban Board (Horizontal Scrollable 5 Columns) */}
      <div className="overflow-x-auto pb-4">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
            <FaSpinner className="animate-spin text-3xl text-cyan-400" />
            <p className="text-xs">Đang tải bảng Kanban điều phối sản xuất...</p>
          </div>
        ) : (
          <div className="flex gap-4 min-w-[1600px] items-start">
            {/* Column 1: Chờ Gán Xưởng */}
            <KanbanColumn
              id="col-awaiting"
              stepNumber={1}
              title="Chờ Gán Xưởng"
              subtitle="Phân công trạm in đối tác phù hợp"
              count={colAwaiting.length}
              icon={<FaBoxes className="text-amber-400" />}
              headerColorClass="bg-amber-500/10 border-b-amber-500/20"
              badgeColorClass="border-amber-400/30 bg-amber-500/15 text-amber-300"
            >
              {colAwaiting.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-awaiting"
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
              subtitle="Trạm xác nhận và xếp lịch in"
              count={colAssigned.length}
              icon={<FaIndustry className="text-blue-400" />}
              headerColorClass="bg-blue-500/10 border-b-blue-500/20"
              badgeColorClass="border-blue-400/30 bg-blue-500/15 text-blue-300"
            >
              {colAssigned.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-assigned"
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
              subtitle="Chế tác 3D và hoàn thiện bề mặt"
              count={colProduction.length}
              icon={<FaPrint className="text-purple-400" />}
              headerColorClass="bg-purple-500/10 border-b-purple-500/20"
              badgeColorClass="border-purple-400/30 bg-purple-500/15 text-purple-300"
            >
              {colProduction.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-production"
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
              subtitle="Đo đạc dung sai & độ kín nước"
              count={colQc.length}
              icon={<FaCheckDouble className="text-rose-400" />}
              headerColorClass="bg-rose-500/10 border-b-rose-500/20"
              badgeColorClass="border-rose-400/30 bg-rose-500/15 text-rose-300"
            >
              {colQc.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-qc"
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
              subtitle="Đóng hộp chống sốc & giao hàng"
              count={colDelivery.length}
              icon={<FaShippingFast className="text-emerald-400" />}
              headerColorClass="bg-emerald-500/10 border-b-emerald-500/20"
              badgeColorClass="border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
            >
              {colDelivery.map((o) => (
                <FulfillmentCard
                  key={o.id}
                  order={o}
                  columnId="col-delivery"
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
        )}
      </div>

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
