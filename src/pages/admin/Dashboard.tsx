import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  XCircle,
  Zap,
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
  getOrderById,
  cancelOrderV2,
  reviewCancellationRequest,
  type OrderItem,
  type OrderV2Dto,
} from '../../services/orderService';
import {
  listGenerations,
  reviewGeneration,
  type GenerationTask,
} from '../../services/generationService';
import {
  observabilityService,
  type ObservabilityReportDto,
} from '../../services/observabilityService';
import {
  approvalAndReviewService,
  buildCanonicalPrintConfig,
  type PrintReviewChecklist,
} from '../../services/approvalAndReviewService';
import {
  fulfillmentService,
  type FulfillmentTimelineDto,
} from '../../services/fulfillmentService';
import {
  paymentService,
  type PaymentAttemptDto,
  type RefundDto,
} from '../../services/paymentService';
import {
  defectService,
} from '../../services/defectService';
import { notificationService } from '../../services/notificationService';

type DashboardTab =
  | 'observability'
  | 'print-reviews'
  | 'orders-v2'
  | 'fulfillment-v2'
  | 'payments-refunds'
  | 'defects-users';

const SEED_PARTNER_LABS = [
  { id: '11111111-2222-3333-4444-555555555501', name: 'THE BOYS Smart 3D Hub (Trạm Chính)' },
  { id: '11111111-2222-3333-4444-555555555502', name: 'Saigon Precision Resin & FDM Lab' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('observability');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ==================== TAB 1: OBSERVABILITY ====================
  const [observabilityData, setObservabilityData] = useState<ObservabilityReportDto | null>(null);
  const [isLoadingObservability, setIsLoadingObservability] = useState(false);
  const [isDispatchingOutbox, setIsDispatchingOutbox] = useState(false);

  const fetchObservability = async () => {
    setIsLoadingObservability(true);
    try {
      const data = await observabilityService.getObservabilityReport();
      setObservabilityData(data);
    } catch (err) {
      console.warn('Lỗi tải báo cáo observability:', err);
    } finally {
      setIsLoadingObservability(false);
    }
  };

  const handleDispatchOutbox = async () => {
    setIsDispatchingOutbox(true);
    try {
      const res = await notificationService.dispatchOutbox(50);
      showToast(res.message || `Đã giải phóng ${res.dispatchedCount ?? 0} tin Outbox thành thông báo in-app!`);
      await fetchObservability();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể giải phóng hàng đợi Outbox.';
      showToast(msg, 'error');
    } finally {
      setIsDispatchingOutbox(false);
    }
  };

  // ==================== TAB 2: PRINT REVIEWS ====================
  const [generations, setGenerations] = useState<GenerationTask[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [reviewMaterial, setReviewMaterial] = useState('Resin');
  const [reviewHeightMm, setReviewHeightMm] = useState(100);
  const [reviewScale] = useState(1.0);
  const [reviewDecision, setReviewDecision] = useState('Approved');
  const [reviewNoteText, setReviewNoteText] = useState('Đạt tiêu chuẩn in 3D công nghiệp.');
  const [checklist, setChecklist] = useState<PrintReviewChecklist>({
    orientation: '45_degree_optimal',
    supportConfirmation: true,
    material: 'Resin',
    printHeightMm: 100,
    buildVolumeConfirmation: true,
    slicingSoftware: 'ChiTuBox V2',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const canonicalConfigPreview = useMemo(() => {
    return buildCanonicalPrintConfig({
      material: reviewMaterial,
      heightMm: reviewHeightMm,
      scale: reviewScale,
    });
  }, [reviewMaterial, reviewHeightMm, reviewScale]);

  const fetchGenerations = async () => {
    setIsLoadingGenerations(true);
    try {
      const data = await listGenerations();
      setGenerations(data || []);
      if (data && data.length > 0 && !selectedVersionId) {
        setSelectedVersionId(data[0].versionId || data[0].id);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách generations:', err);
    } finally {
      setIsLoadingGenerations(false);
    }
  };

  const handleQuickReviewV1 = async (taskId: string, approved: boolean) => {
    try {
      await reviewGeneration(taskId, approved, approved ? 'Đạt tiêu chuẩn in 3D' : 'Cần tối ưu lưới 3D');
      showToast(`Đã ${approved ? 'duyệt' : 'từ chối'} tác vụ in 3D`);
      await fetchGenerations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi duyệt tác vụ.';
      showToast(msg, 'error');
    }
  };

  const handleSubmitPrintReviewV2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersionId.trim()) {
      showToast('Vui lòng chọn hoặc nhập Version ID cần duyệt.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await approvalAndReviewService.createPrintReview({
        versionId: selectedVersionId.trim(),
        decision: reviewDecision,
        checklist: {
          ...checklist,
          material: reviewMaterial,
          printHeightMm: reviewHeightMm,
        },
        configuration: canonicalConfigPreview,
        note: reviewNoteText.trim(),
      });
      showToast(`Đã gửi quyết định duyệt in 3D (${reviewDecision}) cho Version ${selectedVersionId.slice(0, 8)}...`);
      await fetchGenerations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu duyệt in 3D.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ==================== TAB 3: ORDERS V2 ====================
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [v2OrdersMap, setV2OrdersMap] = useState<Record<string, OrderV2Dto>>({});
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Cancellation modal in Tab 3
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderItem | null>(null);
  const [cancelReason, setCancelReason] = useState('Staff/Quản trị viên hủy đơn và chuyển hoàn tiền');
  const [cancelDecisionNote, setCancelDecisionNote] = useState('Đã đối soát điều phối xưởng');
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Cancellation Request direct review
  const [directRequestId, setDirectRequestId] = useState('');
  const [directDecisionNote, setDirectDecisionNote] = useState('Quản trị phê duyệt yêu cầu hủy');

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await listOrders();
      setOrders(data || []);

      const v2Results = await Promise.allSettled(data.map((o) => getOrderById(o.id)));
      const map: Record<string, OrderV2Dto> = {};
      v2Results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.id) {
          map[res.value.id] = res.value;
        }
      });
      setV2OrdersMap(map);
    } catch (err) {
      console.warn('Lỗi nạp đơn hàng:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleAdminCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setIsProcessingCancel(true);
    try {
      const res = await cancelOrderV2(cancelModalOrder.id, cancelReason.trim(), cancelDecisionNote.trim());
      showToast(`Đã duyệt hủy đơn #${res.orderCode}. Trạng thái hủy: ${res.cancellationStatus}`);
      setCancelModalOrder(null);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi hủy đơn hàng.';
      showToast(msg, 'error');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleReviewCancellationRequest = async (approved: boolean) => {
    if (!directRequestId.trim()) {
      showToast('Vui lòng nhập Request ID hủy đơn cần duyệt.', 'error');
      return;
    }
    try {
      const res = await reviewCancellationRequest(directRequestId.trim(), approved, directDecisionNote.trim());
      showToast(res.message || `Đã ${approved ? 'chấp thuận' : 'từ chối'} yêu cầu hủy đơn.`);
      setDirectRequestId('');
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi duyệt yêu cầu hủy.';
      showToast(msg, 'error');
    }
  };

  // ==================== TAB 4: FULFILLMENT V2 ====================
  const [selectedFulfillmentOrderId, setSelectedFulfillmentOrderId] = useState<string>('');
  const [currentTimeline, setCurrentTimeline] = useState<FulfillmentTimelineDto | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Step 1: Assign Partner
  const [assignPartnerLabId, setAssignPartnerLabId] = useState(SEED_PARTNER_LABS[0].id);
  const [partnerCostVnd, setPartnerCostVnd] = useState(120000);
  const [assignDecisionNote, setAssignDecisionNote] = useState('Giao xưởng in ca tiêu chuẩn');
  const [isAssigning, setIsAssigning] = useState(false);

  // Step 4: QC
  const [qcNoteInput, setQcNoteInput] = useState('Đạt tiêu chuẩn bề mặt và độ phân giải');

  // Step 5: Shipment
  const [shipmentCarrier, setShipmentCarrier] = useState('GHN Express');
  const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState('');
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);

  const fetchTimeline = async (orderId: string) => {
    if (!orderId) return;
    setIsLoadingTimeline(true);
    try {
      const t = await fulfillmentService.getOrderTimeline(orderId);
      setCurrentTimeline(t);
      if (!shipmentTrackingNumber) {
        setShipmentTrackingNumber(`TB-SHIP-${Date.now().toString().slice(-6)}`);
      }
    } catch (err) {
      console.warn('Lỗi nạp timeline đơn:', err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const handleAssignPartner = async () => {
    if (!selectedFulfillmentOrderId) return;
    setIsAssigning(true);
    try {
      await fulfillmentService.assignPartner(selectedFulfillmentOrderId, {
        partnerLabId: assignPartnerLabId,
        partnerCostSnapshotVnd: partnerCostVnd,
        decisionNote: assignDecisionNote.trim(),
      });
      showToast('Đã phân công xưởng in đối tác thành công!');
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gán xưởng in.';
      showToast(msg, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRespondAssignment = async (assignmentId: string, accepted: boolean) => {
    try {
      await fulfillmentService.respondAssignment(assignmentId, {
        accepted,
        decisionNote: accepted ? 'Xưởng đồng ý tiếp nhận đơn gia công' : 'Xưởng quá tải, từ chối nhận lệnh',
      });
      showToast(`Xưởng in đã ${accepted ? 'chấp nhận' : 'từ chối'} lệnh in!`);
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi phản hồi lệnh gán.';
      showToast(msg, 'error');
    }
  };

  const handleStartProductionRun = async (assignmentId: string) => {
    try {
      await fulfillmentService.startProductionRun(assignmentId, { quantity: 1 });
      showToast('Đã khởi tạo đợt in 3D mới (Printing)!');
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể khởi tạo đợt in.';
      showToast(msg, 'error');
    }
  };

  const handleUpdateRunStatus = async (runId: string, status: 'PostProcessing' | 'QualityCheck') => {
    try {
      await fulfillmentService.updateRunStatus(runId, status);
      showToast(`Đã chuyển đợt in sang trạng thái: ${status}`);
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật tiến độ in.';
      showToast(msg, 'error');
    }
  };

  const handleRecordQc = async (runId: string, passed: boolean, triggerReprint = false) => {
    try {
      await fulfillmentService.recordQc(runId, {
        passed,
        triggerReprint,
        qcNote: qcNoteInput.trim(),
      });
      showToast(passed ? 'Đạt chuẩn kiểm định QC! Đơn chuyển sang Đóng gói (Packaged)' : 'QC không đạt: Đã kích hoạt lệnh in lại!');
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể ghi nhận kết quả QC.';
      showToast(msg, 'error');
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedFulfillmentOrderId || !shipmentTrackingNumber.trim()) return;
    setIsCreatingShipment(true);
    try {
      await fulfillmentService.createShipment(selectedFulfillmentOrderId, {
        carrier: shipmentCarrier,
        trackingNumber: shipmentTrackingNumber.trim(),
        shippingActualVnd: 25000,
      });
      showToast(`Đã xuất vận đơn ${shipmentTrackingNumber} (${shipmentCarrier})!`);
      setShipmentTrackingNumber(`TB-SHIP-${Date.now().toString().slice(-6)}`);
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo vận đơn.';
      showToast(msg, 'error');
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleRecordShipmentEvent = async (shipmentId: string, status: string, note: string) => {
    try {
      await fulfillmentService.recordShipmentEvent(shipmentId, {
        eventKey: `EVT-${Date.now()}`,
        status,
        note,
        source: 'Staff Admin',
      });
      showToast(`Đã cập nhật trạng thái vận đơn: ${status}`);
      await fetchTimeline(selectedFulfillmentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật sự kiện vận đơn.';
      showToast(msg, 'error');
    }
  };

  // ==================== TAB 5: PAYMENTS & REFUNDS ====================
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState<string>('');
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttemptDto[]>([]);
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [refundAmountVnd, setRefundAmountVnd] = useState(390000);
  const [refundReason, setRefundReason] = useState('Hoàn tiền do khách hủy đơn hoặc lỗi kỹ thuật');
  const [isLoadingPaymentData, setIsLoadingPaymentData] = useState(false);
  const [isCreatingRefund, setIsCreatingRefund] = useState(false);

  const fetchPaymentData = async (orderId: string) => {
    if (!orderId) return;
    setIsLoadingPaymentData(true);
    try {
      const [attempts, refList] = await Promise.all([
        paymentService.getPaymentAttempts(orderId),
        paymentService.getOrderRefunds(orderId),
      ]);
      setPaymentAttempts(attempts || []);
      setRefunds(refList || []);

      const ord = orders.find((o) => o.id === orderId);
      if (ord) setRefundAmountVnd(ord.totalVnd);
    } catch (err) {
      console.warn('Lỗi nạp dữ liệu thanh toán:', err);
    } finally {
      setIsLoadingPaymentData(false);
    }
  };

  const handleReconcilePaymentAttempt = async (attemptId: string) => {
    try {
      const res = await paymentService.reconcilePaymentAttempt(attemptId);
      showToast(res.message || 'Đã đối soát giao dịch PayOS thành công!');
      if (selectedPaymentOrderId) await fetchPaymentData(selectedPaymentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đối soát thanh toán.';
      showToast(msg, 'error');
    }
  };

  const handleCreateRefund = async () => {
    if (!selectedPaymentOrderId) return;
    setIsCreatingRefund(true);
    try {
      await paymentService.createRefund(selectedPaymentOrderId, {
        amountVnd: refundAmountVnd,
        reason: refundReason.trim(),
      });
      showToast('Đã tạo lệnh hoàn tiền thành công!');
      await fetchPaymentData(selectedPaymentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo hoàn tiền.';
      showToast(msg, 'error');
    } finally {
      setIsCreatingRefund(false);
    }
  };

  const handleReconcileRefund = async (refundId: string) => {
    try {
      const res = await paymentService.reconcileRefund(refundId, 'Đã đối soát hoàn tiền thành công');
      showToast(res.message || 'Đã đối soát hoàn tiền!');
      if (selectedPaymentOrderId) await fetchPaymentData(selectedPaymentOrderId);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đối soát hoàn tiền.';
      showToast(msg, 'error');
    }
  };

  // ==================== TAB 6: DEFECTS, USERS & PACKAGES ====================
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userCreditAmount, setUserCreditAmount] = useState(5);
  const [userCreditReason, setUserCreditReason] = useState('Quản trị viên cấp bù lượt tạo 3D AI');
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPackagePrice, setEditingPackagePrice] = useState(390000);
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);
  const [defectResolutionNote, setDefectResolutionNote] = useState('Đã kiểm tra bằng chứng, chấp thuận yêu cầu');

  const fetchUsersAndPackages = async () => {
    setIsLoadingUsers(true);
    try {
      const [uList, pList] = await Promise.all([
        adminService.getUsers(),
        listPricingPackages(),
      ]);
      setUsers(uList || []);
      setPackages(pList || []);
    } catch (err) {
      console.warn('Lỗi nạp users/packages:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddCredits = async (userId: string) => {
    try {
      await adminService.addUserCredits(userId, userCreditAmount, userCreditReason);
      showToast(`Đã cấp thêm ${userCreditAmount} lượt tạo 3D cho tài khoản.`);
      await fetchUsersAndPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cấp credit.';
      showToast(msg, 'error');
    }
  };

  const handleToggleLockUser = async (user: AdminUserItem) => {
    const isLocked = user.accountStatus?.toLowerCase() === 'locked';
    try {
      if (isLocked) {
        await adminService.unlockUser(user.id);
        showToast(`Đã mở khóa tài khoản ${user.email}`);
      } else {
        await adminService.lockUser(user.id, 'Quản trị viên tạm khóa tài khoản bảo mật');
        showToast(`Đã khóa tài khoản ${user.email}`);
      }
      await fetchUsersAndPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi thao tác khóa tài khoản.';
      showToast(msg, 'error');
    }
  };

  const handleUpdatePackagePrice = async (pkgId: string) => {
    setIsUpdatingPackage(true);
    try {
      await adminService.updatePricingPackage(pkgId, {
        priceVnd: editingPackagePrice,
        isActive: true,
      });
      showToast(`Đã cập nhật biểu phí gói in: ${editingPackagePrice.toLocaleString('vi-VN')} đ`);
      setEditingPackageId(null);
      await fetchUsersAndPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật giá gói.';
      showToast(msg, 'error');
    } finally {
      setIsUpdatingPackage(false);
    }
  };

  const handleResolveDefect = async (reportId: string, resolutionType: 'ReprintApproved' | 'RefundApproved' | 'Rejected') => {
    try {
      await defectService.resolveDefectReport(reportId, {
        resolutionType,
        resolutionNote: defectResolutionNote.trim(),
      });
      showToast(`Đã giải quyết khiếu nại: ${resolutionType}`);
      if (selectedFulfillmentOrderId) await fetchTimeline(selectedFulfillmentOrderId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi giải quyết khiếu nại.';
      showToast(msg, 'error');
    }
  };

  // Initial tab loading
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (activeTab === 'observability') void fetchObservability();
      if (activeTab === 'print-reviews') void fetchGenerations();
      if (activeTab === 'orders-v2') void fetchOrders();
      if (activeTab === 'fulfillment-v2') {
        void fetchOrders();
        if (selectedFulfillmentOrderId) void fetchTimeline(selectedFulfillmentOrderId);
      }
      if (activeTab === 'payments-refunds') {
        void fetchOrders();
        if (selectedPaymentOrderId) void fetchPaymentData(selectedPaymentOrderId);
      }
      if (activeTab === 'defects-users') void fetchUsersAndPackages();
    });
  }, [activeTab]);

  // Set default selected order for fulfillment/payment when orders load
  useEffect(() => {
    if (orders.length > 0) {
      if (!selectedFulfillmentOrderId) {
        setSelectedFulfillmentOrderId(orders[0].id);
        void fetchTimeline(orders[0].id);
      }
      if (!selectedPaymentOrderId) {
        setSelectedPaymentOrderId(orders[0].id);
        void fetchPaymentData(orders[0].id);
      }
    }
  }, [orders]);

  const formatVnd = (amount: number) => amount.toLocaleString('vi-VN') + ' đ';

  return (
    <div className="min-h-screen bg-[#090D14] text-white selection:bg-cyan-500/30 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/50'
              : toastMessage.type === 'info'
              ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200 shadow-cyan-950/50'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
          }`}
        >
          {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
          {toastMessage.type === 'info' && <Clock className="w-4 h-4 text-cyan-400" />}
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 shadow-xl backdrop-blur-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Trung Tâm Điều Hành &amp; Sản Xuất In 3D V2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            THE BOYS — Operations Hub
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            Giám sát 6 phân khu điều phối sản xuất, duyệt kỹ thuật SLA/FDM, đối soát PayOS và giải phóng hàng đợi Outbox.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDispatchOutbox}
            disabled={isDispatchingOutbox}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            title="Giải phóng Outbox thành thông báo in-app"
          >
            {isDispatchingOutbox ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-400" />
            )}
            <span>⚡ Đồng bộ Outbox</span>
          </button>
        </div>
      </div>

      {/* 6 Operations Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
        {(
          [
            { id: 'observability', label: '1. Giám Sát Observability', icon: Activity },
            { id: 'print-reviews', label: '2. Duyệt Mẫu In 3D V2', icon: FileCheck },
            { id: 'orders-v2', label: '3. Đơn Hàng 2 Trục & Hủy Đơn', icon: Package },
            { id: 'fulfillment-v2', label: '4. Dây Chuyền Xưởng In 5 Bước', icon: Printer },
            { id: 'payments-refunds', label: '5. Đối Soát PayOS & Hoàn Tiền', icon: CreditCard },
            { id: 'defects-users', label: '6. Bảo Hành 7 Ngày, Users & Gói', icon: Users },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-950/60'
                  : 'bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-cyan-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================================= */}
      {/* PHÂN KHU 1: OBSERVABILITY V2 */}
      {/* ========================================================================================= */}
      {activeTab === 'observability' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Báo Cáo Sức Khỏe Vận Hành Thời Gian Thực</span>
            </h3>
            <button
              type="button"
              onClick={fetchObservability}
              disabled={isLoadingObservability}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingObservability ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Làm mới chỉ số</span>
            </button>
          </div>

          {observabilityData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Commerce KPI Card */}
              <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-bold text-white uppercase tracking-wider">Thương Mại &amp; Đơn Hàng</span>
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-3xl font-black text-white font-mono">
                    {observabilityData.commerce.totalOrders}
                  </span>
                  <p className="text-xs text-white/50">Tổng đơn đặt gia công</p>
                </div>
                <div className="pt-2 border-t border-white/5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-400">Payment cần chú ý:</span>
                    <strong className="text-white font-mono">{observabilityData.commerce.paymentAttemptsNeedsAttention}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-400">Refund cần đối soát:</span>
                    <strong className="text-white font-mono">{observabilityData.commerce.refundsNeedsAttention}</strong>
                  </div>
                </div>
              </div>

              {/* Messaging & Outbox KPI Card */}
              <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-bold text-white uppercase tracking-wider">Hàng Đợi Outbox &amp; Tin</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    {observabilityData.messaging.outboxPending}
                  </span>
                  <p className="text-xs text-white/50">Tin Outbox đang chờ xử lý</p>
                </div>
                <div className="pt-2 border-t border-white/5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Đã xử lý (Processed):</span>
                    <strong className="text-white font-mono">{observabilityData.messaging.outboxProcessed}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Thông báo đã gửi (Delivered):</span>
                    <strong className="text-white font-mono">{observabilityData.messaging.notificationsDelivered}</strong>
                  </div>
                </div>
              </div>

              {/* AI Generative 3D Providers KPI Card */}
              <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-bold text-white uppercase tracking-wider">Hiệu Năng AI 3D</span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                {observabilityData.aiGenerations && observabilityData.aiGenerations.length > 0 ? (
                  <div className="space-y-2">
                    {observabilityData.aiGenerations.map((g, idx) => (
                      <div key={idx} className="p-2 rounded bg-black/40 border border-white/5 text-xs flex justify-between">
                        <span className="font-bold text-cyan-300">{g.provider}</span>
                        <span className="font-mono text-emerald-400">✓ {g.succeededJobs} / ✗ {g.failedJobs}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">Chưa ghi nhận tác vụ AI</p>
                )}
              </div>

              {/* Security Shield KPI Card */}
              <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-bold text-white uppercase tracking-wider">Khiên Bảo Mật Dữ Liệu</span>
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{observabilityData.securityFilterStatus || 'PiiAndSecretRedactor Active'}</span>
                  </span>
                  <p className="text-xs text-white/50 pt-2 leading-relaxed">
                    Tất cả Payload, Trace ID &amp; Audit Log đều được che chắn bí mật và thông tin định danh người dùng.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-white/50 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Đang kết nối API Observability V2...</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PHÂN KHU 2: DUYỆT KỸ THUẬT MẪU IN 3D V2 (PRINT REVIEWS) */}
      {/* ========================================================================================= */}
      {activeTab === 'print-reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
          {/* Left: Generation Tasks List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Danh Sách Tác Vụ Tạo 3D AI</span>
              </h3>
              <button
                type="button"
                onClick={fetchGenerations}
                disabled={isLoadingGenerations}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGenerations ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {generations.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedVersionId(t.versionId || t.id)}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 cursor-pointer transition-all ${
                    selectedVersionId === (t.versionId || t.id)
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-950/40'
                      : 'border-white/10 bg-[#0c1017]/90 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white">#{t.id.slice(0, 8)}...</span>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">{t.status}</span>
                  </div>
                  <p className="text-white/60 text-[11px] truncate">{t.modelName || 'Mô hình AI không tên'}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[10px] text-white/40 font-mono">Ver: {(t.versionId || t.id).slice(0, 8)}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickReviewV1(t.id, true);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold"
                      >
                        ✓ Duyệt nhanh V1
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Technical Print Review V2 Panel */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Bảng Kiểm Tra &amp; Duyệt Kỹ Thuật In V2 (PrintReview)</span>
              </h3>
            </div>

            <form onSubmit={handleSubmitPrintReviewV2} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-white/90">Mã Version ID Cần Duyệt (*)</label>
                <input
                  type="text"
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  placeholder="Nhập hoặc chọn versionId từ danh sách bên trái..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 focus:border-cyan-400 p-2.5 font-mono text-xs text-cyan-300 outline-none"
                  required
                />
              </div>

              {/* Material & Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-white/90">Chất liệu in</label>
                  <select
                    value={reviewMaterial}
                    onChange={(e) => setReviewMaterial(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="Resin">Resin SLA Cao Cấp</option>
                    <option value="PLA">Sợi Nhựa PLA FDM</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-white/90">Chiều cao in ({reviewHeightMm} mm)</label>
                  <input
                    type="range"
                    min="100"
                    max="120"
                    value={reviewHeightMm}
                    onChange={(e) => setReviewHeightMm(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Canonical Hash Preview */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-cyan-300">Cấu hình in chuẩn hóa (Canonical Configuration):</span>
                <pre className="text-[10px] font-mono text-white/60 overflow-x-auto">
                  {JSON.stringify(canonicalConfigPreview, null, 2)}
                </pre>
              </div>

              {/* 6 Technical Checklist Standards */}
              <div className="space-y-2">
                <span className="font-bold text-white/90">Checklist 6 Tiêu Chuẩn Kỹ Thuật:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded bg-white/[0.02] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.supportConfirmation}
                      onChange={(e) => setChecklist({ ...checklist, supportConfirmation: e.target.checked })}
                      className="accent-cyan-400"
                    />
                    <span>Xác nhận kết cấu Support</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded bg-white/[0.02] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.buildVolumeConfirmation}
                      onChange={(e) => setChecklist({ ...checklist, buildVolumeConfirmation: e.target.checked })}
                      className="accent-cyan-400"
                    />
                    <span>Khổ máy in bao trùm mẫu</span>
                  </label>
                </div>
              </div>

              {/* Decision & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-white/90">Quyết định kỹ thuật</label>
                  <select
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-xs text-white outline-none focus:border-cyan-400 font-bold"
                  >
                    <option value="Approved">✓ Phê Duyệt In (Approved)</option>
                    <option value="NeedsAdjustment">⚠️ Cần Chỉnh Sửa Lưới (NeedsAdjustment)</option>
                    <option value="Rejected">✗ Từ Chối In (Rejected)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-white/90">Ghi chú QC kỹ thuật</label>
                  <input
                    type="text"
                    value={reviewNoteText}
                    onChange={(e) => setReviewNoteText(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="btn-pooled-cyan w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <FileCheck className="w-4 h-4 text-black" />}
                  <span>Xác Nhận Lưu Quyết Định Duyệt In V2</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PHÂN KHU 3: ĐƠN HÀNG 2 TRỤC & DUYỆT HỦY ĐƠN (ORDERS V2) */}
      {/* ========================================================================================= */}
      {activeTab === 'orders-v2' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Direct Cancellation Request Review Tool */}
          <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Duyệt Yêu Cầu Hủy Đơn Theo Mã Request ID:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Nhập cancellationRequestId (UUID)..."
                value={directRequestId}
                onChange={(e) => setDirectRequestId(e.target.value)}
                className="w-60 rounded-xl bg-black/40 border border-white/10 p-2 font-mono text-xs text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Ghi chú quyết định..."
                value={directDecisionNote}
                onChange={(e) => setDirectDecisionNote(e.target.value)}
                className="w-56 rounded-xl bg-black/40 border border-white/10 p-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => handleReviewCancellationRequest(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold cursor-pointer transition-colors"
              >
                ✓ Chấp Thuận Hủy
              </button>
              <button
                type="button"
                onClick={() => handleReviewCancellationRequest(false)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold cursor-pointer transition-colors"
              >
                ✗ Từ Chối
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl bg-[#0c1017]/90 border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>Danh Sách Đơn Hàng (2 Trục Thanh Toán &amp; Vận Hành)</span>
              </h3>
              <button
                type="button"
                onClick={fetchOrders}
                disabled={isLoadingOrders}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-white/50 border-b border-white/10 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="p-3.5">Mã Đơn</th>
                    <th className="p-3.5">Khách Hàng</th>
                    <th className="p-3.5">Quy Cách In</th>
                    <th className="p-3.5">Tổng Tiền</th>
                    <th className="p-3.5">Trục Thanh Toán</th>
                    <th className="p-3.5">Trục Vận Hành</th>
                    <th className="p-3.5 text-right">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => {
                    const v2 = v2OrdersMap[o.id];
                    const pStatus = v2?.orderPaymentStatus || (o.status === 'Created' ? 'Unpaid' : 'Paid');
                    const fStatus = v2?.fulfillmentStatus || o.status;

                    return (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-cyan-400">#{o.orderCode}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-white">{o.receiverName}</p>
                          <p className="text-[11px] text-white/40 font-mono">{o.receiverPhone}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-white/80">{o.material} • SL: {o.quantity}</span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white">{formatVnd(o.totalVnd)}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                            pStatus.toLowerCase() === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            {pStatus}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                            {fStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFulfillmentOrderId(o.id);
                              setActiveTab('fulfillment-v2');
                              fetchTimeline(o.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold cursor-pointer"
                          >
                            Điều phối xưởng
                          </button>
                          {fStatus !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => setCancelModalOrder(o)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold cursor-pointer"
                            >
                              Duyệt hủy đơn
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cancellation Modal */}
          {cancelModalOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-md rounded-2xl bg-[#090D14] border border-white/20 p-5 space-y-4 text-white">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h4 className="font-bold text-sm">Hủy Đơn &amp; Chuyển Hoàn Tiền #{cancelModalOrder.orderCode}</h4>
                  <button type="button" onClick={() => setCancelModalOrder(null)} className="text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="font-bold">Lý do hủy (*)</label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 outline-none focus:border-cyan-400"
                  />
                  <label className="font-bold">Ghi chú quyết định BQT</label>
                  <input
                    type="text"
                    value={cancelDecisionNote}
                    onChange={(e) => setCancelDecisionNote(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelModalOrder(null)}
                    className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminCancelOrder}
                    disabled={isProcessingCancel}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase cursor-pointer"
                  >
                    {isProcessingCancel ? 'Đang xử lý...' : 'Xác nhận hủy & Hoàn tiền'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PHÂN KHU 4: DÂY CHUYỀN XƯỞNG IN 5 BƯỚC (FULFILLMENT V2) */}
      {/* ========================================================================================= */}
      {activeTab === 'fulfillment-v2' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Order Selector */}
          <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Đơn hàng đang điều phối:</span>
              <select
                value={selectedFulfillmentOrderId}
                onChange={(e) => {
                  setSelectedFulfillmentOrderId(e.target.value);
                  fetchTimeline(e.target.value);
                }}
                className="rounded-xl bg-black/40 border border-white/10 p-2 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-400"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.orderCode} — {o.receiverName} ({formatVnd(o.totalVnd)})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => fetchTimeline(selectedFulfillmentOrderId)}
              disabled={isLoadingTimeline}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTimeline ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* 5-Step Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Step 1: Assign Partner */}
            <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Bước 1: Gán Xưởng</span>
                <span className="font-mono text-white/40">#1</span>
              </div>
              <div className="space-y-2">
                <label className="text-white/70">Chọn xưởng in đối tác:</label>
                <select
                  value={assignPartnerLabId}
                  onChange={(e) => setAssignPartnerLabId(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-1.5 text-[11px] text-white outline-none"
                >
                  {SEED_PARTNER_LABS.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
                <label className="text-white/70">Chi phí gia công (VND):</label>
                <input
                  type="number"
                  value={partnerCostVnd}
                  onChange={(e) => setPartnerCostVnd(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-1.5 font-mono text-xs text-white outline-none"
                />
                <label className="text-white/70">Ghi chú giao việc:</label>
                <input
                  type="text"
                  value={assignDecisionNote}
                  onChange={(e) => setAssignDecisionNote(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-1.5 text-[11px] text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleAssignPartner}
                  disabled={isAssigning}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase cursor-pointer transition-colors"
                >
                  Giao Lệnh In
                </button>
              </div>
            </div>

            {/* Step 2: Lab Response */}
            <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Bước 2: Xưởng Nhận</span>
                <span className="font-mono text-white/40">#2</span>
              </div>
              {currentTimeline?.assignments && currentTimeline.assignments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-white font-semibold">{currentTimeline.assignments[0].labName || 'Xưởng The Boys'}</p>
                  <p className="text-[11px] font-mono text-white/60">Trạng thái: {currentTimeline.assignments[0].status}</p>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRespondAssignment(currentTimeline.assignments[0].id, true)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-[11px] cursor-pointer"
                    >
                      ✓ Nhận Lệnh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespondAssignment(currentTimeline.assignments[0].id, false)}
                      className="py-1.5 px-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold text-[11px] cursor-pointer"
                    >
                      ✗ Từ Chối
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/40 italic">Chưa có phân công xưởng in</p>
              )}
            </div>

            {/* Step 3: Production Runs */}
            <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Bước 3: Đợt In 3D</span>
                <span className="font-mono text-white/40">#3</span>
              </div>
              {currentTimeline?.assignments?.[0] ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleStartProductionRun(currentTimeline.assignments[0].id)}
                    className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] cursor-pointer"
                  >
                    + Khởi Tạo Đợt In Mới
                  </button>
                  {currentTimeline.assignments[0].productionRuns?.map((run) => (
                    <div key={run.id} className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                      <div className="flex justify-between font-mono font-bold text-[10px]">
                        <span>Run #{run.runNo ?? 1}</span>
                        <span className="text-cyan-400">{run.status}</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateRunStatus(run.id, 'PostProcessing')}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px]"
                        >
                          Hậu Kỳ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRunStatus(run.id, 'QualityCheck')}
                          className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-[10px]"
                        >
                          Kiểm QC
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 italic">Chờ bước 2 nhận lệnh</p>
              )}
            </div>

            {/* Step 4: QC */}
            <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Bước 4: Kiểm Định QC</span>
                <span className="font-mono text-white/40">#4</span>
              </div>
              {currentTimeline?.assignments?.[0]?.productionRuns?.[0] ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={qcNoteInput}
                    onChange={(e) => setQcNoteInput(e.target.value)}
                    placeholder="Ghi chú QC..."
                    className="w-full rounded bg-black/40 border border-white/10 p-1.5 text-[11px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRecordQc(currentTimeline.assignments[0].productionRuns![0].id, true)}
                    className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] cursor-pointer"
                  >
                    ✓ Đạt QC (Packaged)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecordQc(currentTimeline.assignments[0].productionRuns![0].id, false, true)}
                    className="w-full py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold text-[11px] cursor-pointer"
                  >
                    ✗ Lỗi QC - In Lại
                  </button>
                </div>
              ) : (
                <p className="text-white/40 italic">Chờ khởi tạo đợt in</p>
              )}
            </div>

            {/* Step 5: Shipment */}
            <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">Bước 5: Vận Đơn</span>
                <span className="font-mono text-white/40">#5</span>
              </div>
              <div className="space-y-2">
                <select
                  value={shipmentCarrier}
                  onChange={(e) => setShipmentCarrier(e.target.value)}
                  className="w-full rounded bg-black/40 border border-white/10 p-1 text-[11px] outline-none"
                >
                  <option value="GHN Express">GHN Express</option>
                  <option value="ViettelPost">ViettelPost</option>
                  <option value="GHTK">GHTK</option>
                </select>
                <input
                  type="text"
                  value={shipmentTrackingNumber}
                  onChange={(e) => setShipmentTrackingNumber(e.target.value)}
                  placeholder="Mã vận đơn..."
                  className="w-full rounded bg-black/40 border border-white/10 p-1 font-mono text-[11px] outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateShipment}
                  disabled={isCreatingShipment}
                  className="w-full py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-[11px] cursor-pointer"
                >
                  Tạo Vận Đơn
                </button>
                {currentTimeline?.shipments?.map((s) => (
                  <div key={s.id} className="p-1.5 rounded bg-black/40 border border-white/5 space-y-1">
                    <span className="font-mono text-[10px] text-cyan-300 block">{s.trackingNumber}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleRecordShipmentEvent(s.id, 'Shipping', 'Bưu phẩm đang trung chuyển')}
                        className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px]"
                      >
                        Đang Giao
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecordShipmentEvent(s.id, 'Delivered', 'Đã giao thành công cho khách')}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]"
                      >
                        Đã Giao
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PHÂN KHU 5: ĐỐI SOÁT PAYOS & HOÀN TIỀN (PAYMENTS & REFUNDS) */}
      {/* ========================================================================================= */}
      {activeTab === 'payments-refunds' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Order Selector */}
          <div className="p-4 rounded-2xl bg-[#0c1017]/90 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Chọn đơn hàng đối soát:</span>
              <select
                value={selectedPaymentOrderId}
                onChange={(e) => {
                  setSelectedPaymentOrderId(e.target.value);
                  fetchPaymentData(e.target.value);
                }}
                className="rounded-xl bg-black/40 border border-white/10 p-2 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-400"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.orderCode} — {formatVnd(o.totalVnd)}
                  </option>
                ))}
              </select>
            </div>
            {isLoadingPaymentData && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang đồng bộ cổng thanh toán...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Payment Attempts */}
            <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Lịch Sử Lượt Thanh Toán (PaymentAttempts)</span>
              </h4>

              <div className="space-y-2.5">
                {paymentAttempts.map((pa) => (
                  <div key={pa.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-white">{pa.gateway} ({formatVnd(pa.amountVnd)})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10">{pa.status}</span>
                    </div>
                    <p className="text-[11px] font-mono text-white/50 truncate">Ref: {pa.merchantReference}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleReconcilePaymentAttempt(pa.id)}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer"
                      >
                        ⚡ Đối Soát Giao Dịch PayOS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Refunds Management */}
            <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Quản Lý Lệnh Hoàn Tiền (Refunds)</span>
              </h4>

              {/* Create Refund Form */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-3 text-xs">
                <span className="font-bold text-white">Tạo Lệnh Hoàn Tiền Mới:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={refundAmountVnd}
                    onChange={(e) => setRefundAmountVnd(Number(e.target.value))}
                    className="rounded bg-black/50 border border-white/10 p-2 font-mono text-xs text-white outline-none"
                    placeholder="Số tiền hoàn..."
                  />
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="rounded bg-black/50 border border-white/10 p-2 text-xs text-white outline-none"
                    placeholder="Lý do hoàn..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateRefund}
                  disabled={isCreatingRefund}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Xác Nhận Tạo Lệnh Hoàn Tiền
                </button>
              </div>

              {/* Refunds List */}
              <div className="space-y-2.5">
                {refunds.map((ref) => (
                  <div key={ref.id} className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-mono font-bold text-white">{formatVnd(ref.amountVnd)}</p>
                      <p className="text-[11px] text-white/50">{ref.reason || 'Hoàn tiền đơn hàng'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReconcileRefund(ref.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                    >
                      ⚡ Đối Soát Hoàn Tiền
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PHÂN KHU 6: BẢO HÀNH 7 NGÀY, USERS & GÓI (DEFECTS, USERS & PACKAGES) */}
      {/* ========================================================================================= */}
      {activeTab === 'defects-users' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Block 1: Defect Reports Resolution */}
          {currentTimeline?.defectReports && currentTimeline.defectReports.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0c1017]/90 border border-cyan-500/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Hồ Sơ Khiếu Nại Bảo Hành 7 Ngày Cần Phán Quyết</span>
              </h3>
              <div className="space-y-3">
                {currentTimeline.defectReports.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Khiếu nại: {d.reason}</span>
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                        {d.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                      <input
                        type="text"
                        value={defectResolutionNote}
                        onChange={(e) => setDefectResolutionNote(e.target.value)}
                        placeholder="Ghi chú phán quyết..."
                        className="flex-1 rounded-lg bg-black/40 border border-white/10 p-2 text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveDefect(d.id, 'ReprintApproved')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-bold cursor-pointer"
                      >
                        1. Duyệt In Lại
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveDefect(d.id, 'RefundApproved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold cursor-pointer"
                      >
                        2. Duyệt Hoàn Tiền
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveDefect(d.id, 'Rejected')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold cursor-pointer"
                      >
                        3. Từ Chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block 2: Users Management & Credits */}
          <div className="rounded-2xl bg-[#0c1017]/90 border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Quản Lý Người Dùng &amp; Cấp Lượt Tạo 3D AI</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={userCreditAmount}
                  onChange={(e) => setUserCreditAmount(Number(e.target.value))}
                  className="w-16 rounded bg-black/40 border border-white/10 p-1 font-mono text-center outline-none"
                  title="Số lượt cấp"
                />
                <input
                  type="text"
                  value={userCreditReason}
                  onChange={(e) => setUserCreditReason(e.target.value)}
                  placeholder="Lý do cấp credit..."
                  className="w-56 rounded bg-black/40 border border-white/10 p-1 text-xs outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-xs text-white/50 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Đang tải danh sách người dùng...</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/40 text-white/50 border-b border-white/10 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Họ Tên</th>
                      <th className="p-3.5">Vai Trò</th>
                      <th className="p-3.5">Trạng Thái</th>
                      <th className="p-3.5">Credits</th>
                      <th className="p-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => {
                      const isLocked = u.accountStatus?.toLowerCase() === 'locked';
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 font-mono text-cyan-300">{u.email}</td>
                          <td className="p-3.5 text-white font-semibold">{u.fullName}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-white/10">{u.role}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {u.accountStatus || 'Active'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            Free: {u.freeTrialRemaining} • Mua: {u.purchasedRemaining}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleAddCredits(u.id)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold cursor-pointer"
                            >
                              + Cấp Credit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLockUser(u)}
                              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                                isLocked
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                              }`}
                            >
                              {isLocked ? 'Mở Khóa' : 'Khóa'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Block 3: Pricing Packages Management */}
          <div className="rounded-2xl bg-[#0c1017]/90 border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>Cấu Hình Biểu Phí Gói In 3D (Pricing Packages)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-white/50 border-b border-white/10 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="p-3.5">Tên Gói</th>
                    <th className="p-3.5">Vật Liệu</th>
                    <th className="p-3.5">Khoảng Chiều Cao</th>
                    <th className="p-3.5">Đơn Giá (VND)</th>
                    <th className="p-3.5 text-right">Cập Nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {packages.map((pkg) => {
                    const isEditing = editingPackageId === pkg.id;
                    return (
                      <tr key={pkg.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-bold text-white">{pkg.name}</td>
                        <td className="p-3.5 text-cyan-300 font-mono">{pkg.material}</td>
                        <td className="p-3.5 font-mono text-white/70">{pkg.heightRangeCm || `${pkg.minHeightMm}-${pkg.maxHeightMm} mm`}</td>
                        <td className="p-3.5 font-mono font-bold text-white">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingPackagePrice}
                              onChange={(e) => setEditingPackagePrice(Number(e.target.value))}
                              className="w-32 rounded bg-black/60 border border-cyan-400 p-1 font-mono text-cyan-300 outline-none"
                            />
                          ) : (
                            formatVnd(pkg.priceVnd)
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdatePackagePrice(pkg.id)}
                                disabled={isUpdatingPackage}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPackageId(null)}
                                className="px-2.5 py-1 rounded bg-white/10 text-white/70 hover:text-white"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPackageId(pkg.id);
                                setEditingPackagePrice(pkg.priceVnd);
                              }}
                              className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold cursor-pointer"
                            >
                              Sửa Giá
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
