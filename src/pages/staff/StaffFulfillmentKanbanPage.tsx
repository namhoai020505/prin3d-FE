import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  MOCK_FULFILLMENT_ORDERS,
  type FulfillmentOrder,
  type KanbanStage,
  type AssignPartnerPayload,
  type RecordQcPayload,
  type CreateShipmentPayload,
} from '../../types/staff';
import { StaffFulfillmentDrawer } from '../../components/staff/StaffFulfillmentDrawer';
import {
  AssignLabDialog,
  QcReviewDialog,
  CreateShipmentDialog,
} from '../../components/staff/dialogs/StaffActionDialogs';

export const StaffFulfillmentKanbanPage: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const [orders, setOrders] = useState<FulfillmentOrder[]>(MOCK_FULFILLMENT_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');

  const [drawerOrder, setDrawerOrder] = useState<FulfillmentOrder | null>(() => {
    if (!orderId) return null;
    return (
      MOCK_FULFILLMENT_ORDERS.find(
        (o) => o.id === orderId || o.orderCode.toLowerCase() === orderId.toLowerCase()
      ) || null
    );
  });
  const [assignModalOrder, setAssignModalOrder] = useState<FulfillmentOrder | null>(null);
  const [qcModalOrder, setQcModalOrder] = useState<FulfillmentOrder | null>(null);
  const [shipmentModalOrder, setShipmentModalOrder] = useState<FulfillmentOrder | null>(null);

  const columns: { key: KanbanStage; title: string; accent: string }[] = [
    { key: 'AwaitingLab', title: '1. Chờ Gán Xưởng', accent: 'border-amber-500/40' },
    { key: 'LabAssigned', title: '2. Xưởng Tiếp Nhận', accent: 'border-cyan-500/40' },
    { key: 'InProduction', title: '3. Đang In & Xử Lý', accent: 'border-blue-500/40' },
    { key: 'QualityCheck', title: '4. Chờ Kiểm Định QC', accent: 'border-purple-500/40' },
    { key: 'Delivery', title: '5. Đóng Gói & Giao Vận', accent: 'border-emerald-500/40' },
  ];

  const filteredOrders = orders.filter((o) => {
    const matchText =
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);
    const matchMat = materialFilter === 'ALL' || o.material.includes(materialFilter);
    return matchText && matchMat;
  });

  const handleAssignLab = (
    orderId: string,
    payload: AssignPartnerPayload,
    labName: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              stage: 'LabAssigned',
              subStatus: 'PendingAccept',
              assignment: {
                id: `asg-${Date.now()}`,
                partnerLabId: payload.partnerLabId,
                partnerLabName: labName,
                assignedAt: 'Vừa xong',
                dueAtUtc: payload.dueAtUtc || '',
                partnerCostVnd: payload.partnerCostSnapshotVnd || 0,
                note: payload.decisionNote,
              },
            }
          : o
      )
    );
    setAssignModalOrder(null);
    toast.success('Đã phân công xưởng in thành công!');
  };

  const handleAcceptAssignment = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, subStatus: 'Accepted' } : o))
    );
    toast.info('Xưởng đã xác nhận tiếp nhận đơn hàng!');
  };

  const handleStartPrinting = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              stage: 'InProduction',
              subStatus: 'Printing',
              runs: [
                ...o.runs,
                {
                  id: `run-${Date.now()}`,
                  runNumber: o.runs.length + 1,
                  status: 'Printing',
                  actualCostVnd: o.assignment?.partnerCostVnd || 350000,
                  startedAt: 'Vừa xong',
                },
              ],
            }
          : o
      )
    );
    toast.success('Đã khởi chạy máy in (Run #1)!');
  };

  const handleAdvanceProduction = (order: FulfillmentOrder) => {
    if (order.subStatus === 'Printing') {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, subStatus: 'PostProcessing' } : o))
      );
      toast.info(`Đơn ${order.orderCode} đã chuyển sang Rửa cồn / Sấy UV!`);
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, stage: 'QualityCheck', subStatus: 'WaitingQC' } : o
        )
      );
      toast.success(`Đơn ${order.orderCode} đã chuyển sang bàn Kiểm định QC!`);
    }
  };

  const handleRecordQc = (orderId: string, payload: RecordQcPayload) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (payload.passed) {
          return {
            ...o,
            stage: 'Delivery',
            subStatus: 'ReadyToShip',
          };
        }
        return {
          ...o,
          stage: payload.triggerReprint ? 'InProduction' : 'QualityCheck',
          subStatus: payload.triggerReprint ? 'Printing' : 'WaitingQC',
          runs: payload.triggerReprint
            ? [
                ...o.runs,
                {
                  id: `run-${Date.now()}`,
                  runNumber: o.runs.length + 1,
                  status: 'Printing',
                  actualCostVnd: o.assignment?.partnerCostVnd || 350000,
                  startedAt: 'In bù tự động',
                  qcNote: payload.qcNote,
                },
              ]
            : o.runs,
        };
      })
    );
    setQcModalOrder(null);
    toast.success(
      payload.passed
        ? 'QC Đạt chuẩn! Đơn hàng đã chuyển sang khâu Đóng gói.'
        : 'Đã ghi nhận lỗi QC và kích hoạt lệnh in lại (Reprint)!'
    );
  };

  const handleCreateShipment = (orderId: string, payload: CreateShipmentPayload) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              subStatus: 'InTransit',
              shipment: {
                carrier: payload.carrier,
                trackingNumber: payload.trackingNumber,
                shippingActualVnd: payload.shippingActualVnd || 0,
                events: [
                  {
                    status: 'LabelCreated',
                    timestamp: 'Vừa xong',
                    description: `Đã tạo vận đơn qua ${payload.carrier}`,
                  },
                ],
              },
            }
          : o
      )
    );
    setShipmentModalOrder(null);
    toast.success(`Đã tạo mã vận đơn ${payload.trackingNumber}!`);
  };

  const handleAdvanceShipment = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId && o.shipment
          ? {
              ...o,
              subStatus: 'Delivered',
              shipment: {
                ...o.shipment,
                events: [
                  ...o.shipment.events,
                  {
                    status: 'Delivered',
                    timestamp: 'Vừa xong',
                    description: 'Giao hàng thành công tới tay khách hàng',
                  },
                ],
              },
            }
          : o
      )
    );
    toast.success('Đã cập nhật trạng thái Giao hàng thành công!');
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-5 overflow-hidden">
      <div className="grid grid-cols-5 gap-4">
        {columns.map((col) => {
          const count = orders.filter((o) => o.stage === col.key).length;
          return (
            <div
              key={col.key}
              className="p-3.5 rounded-xl bg-[#090D14] border border-slate-800 flex items-center justify-between"
            >
              <span className="text-xs text-slate-400 font-medium">{col.title}</span>
              <span className="font-mono text-lg font-bold text-[#00F0FF]">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm realtime theo mã TB-..., tên khách hàng, SĐT..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#090D14] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#00F0FF]" />
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#090D14] border border-slate-800 text-sm"
          >
            <option value="ALL">Tất cả chất liệu</option>
            <option value="Resin">Resin (SLA 8K / Tiêu chuẩn)</option>
            <option value="PLA">Nhựa PLA Pro</option>
            <option value="Nylon">Nylon CF</option>
          </select>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-5 gap-4 overflow-x-auto min-h-0">
        {columns.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.stage === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-2xl bg-[#090D14] border ${col.accent} flex flex-col overflow-hidden`}
            >
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider">{col.title}</h3>
                <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-[#0D131F] text-[#00F0FF]">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setDrawerOrder(order)}
                    className="p-3.5 rounded-xl bg-[#0D131F] border border-slate-800 hover:border-[#00F0FF]/60 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#00F0FF]">
                        {order.orderCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {order.material}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold leading-snug">{order.modelName}</h4>
                    <p className="text-xs text-slate-400">
                      {order.customerName} • <span className="font-mono">{order.heightMm}mm</span>
                    </p>

                    <div
                      className="pt-2 border-t border-slate-800/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {col.key === 'AwaitingLab' && (
                        <button
                          onClick={() => setAssignModalOrder(order)}
                          className="w-full py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
                        >
                          [Gán Xưởng In]
                        </button>
                      )}

                      {col.key === 'LabAssigned' && (
                        <div className="flex gap-2">
                          {order.subStatus === 'PendingAccept' && (
                            <button
                              onClick={() => handleAcceptAssignment(order.id)}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold hover:bg-slate-700"
                            >
                              Nhận Việc
                            </button>
                          )}
                          <button
                            onClick={() => handleStartPrinting(order.id)}
                            className="flex-1 py-1.5 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/50 text-[#00F0FF] text-xs font-bold"
                          >
                            Bắt Đầu In
                          </button>
                        </div>
                      )}

                      {col.key === 'InProduction' && (
                        <button
                          onClick={() => handleAdvanceProduction(order)}
                          className="w-full py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold"
                        >
                          {order.subStatus === 'Printing'
                            ? 'Chuyển Xử Lý Nguội →'
                            : 'Chuyển Chờ QC →'}
                        </button>
                      )}

                      {col.key === 'QualityCheck' && (
                        <button
                          onClick={() => setQcModalOrder(order)}
                          className="w-full py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-bold"
                        >
                          [Đánh Giá QC]
                        </button>
                      )}

                      {col.key === 'Delivery' && (
                        <>
                          {!order.shipment ? (
                            <button
                              onClick={() => setShipmentModalOrder(order)}
                              className="w-full py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold"
                            >
                              [Tạo Mã Vận Đơn]
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdvanceShipment(order.id)}
                              className="w-full py-1.5 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold"
                            >
                              [Cập Nhật Giao Hàng]
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <StaffFulfillmentDrawer order={drawerOrder} onClose={() => setDrawerOrder(null)} />
      <AssignLabDialog
        order={assignModalOrder}
        onClose={() => setAssignModalOrder(null)}
        onSubmit={handleAssignLab}
      />
      <QcReviewDialog
        order={qcModalOrder}
        onClose={() => setQcModalOrder(null)}
        onSubmit={handleRecordQc}
      />
      <CreateShipmentDialog
        order={shipmentModalOrder}
        onClose={() => setShipmentModalOrder(null)}
        onSubmit={handleCreateShipment}
      />
    </div>
  );
};

export default StaffFulfillmentKanbanPage;

