import React from 'react';
import { X, Copy, Factory, Cpu, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import type { FulfillmentOrder } from '../../types/staff';

interface StaffFulfillmentDrawerProps {
  order: FulfillmentOrder | null;
  onClose: () => void;
}

export const StaffFulfillmentDrawer: React.FC<StaffFulfillmentDrawerProps> = ({
  order,
  onClose,
}) => {
  if (!order) return null;

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.info(`Đã sao chép mã vận đơn: ${code}`);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#090D14] border-l border-slate-800 h-full flex flex-col justify-between overflow-y-auto p-6 space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="font-mono text-xs text-[#00F0FF]">{order.orderCode}</span>
              <h3 className="text-lg font-bold">{order.modelName}</h3>
              <p className="text-xs text-slate-400">
                Khách hàng: {order.customerName} • <span className="font-mono">{order.customerPhone}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-[#0D131F] text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <section className="p-4 rounded-xl bg-[#0D131F] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
              <Factory className="w-4 h-4" /> 1. Phân Công Xưởng In
            </div>
            {order.assignment ? (
              <div className="text-xs space-y-1.5 pt-1">
                <p>
                  <span className="text-slate-400">Trạm nhận việc:</span>{' '}
                  <span className="font-semibold">{order.assignment.partnerLabName}</span>
                </p>
                <p>
                  <span className="text-slate-400">Thời gian gán:</span>{' '}
                  <span className="font-mono">{order.assignment.assignedAt}</span>
                </p>
                <p>
                  <span className="text-slate-400">Chi phí định mức:</span>{' '}
                  <span className="font-mono text-emerald-400">
                    {order.assignment.partnerCostVnd.toLocaleString()} ₫
                  </span>
                </p>
                {order.assignment.note && (
                  <p className="p-2 rounded bg-[#090D14] text-slate-300 italic">
                    "{order.assignment.note}"
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-400">Chưa gán trạm in cho đơn hàng này.</p>
            )}
          </section>

          <section className="p-4 rounded-xl bg-[#0D131F] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Cpu className="w-4 h-4" /> 2. Tiến Độ Sản Xuất & Lượt In (Runs)
            </div>
            {order.runs.length > 0 ? (
              <div className="space-y-2.5">
                {order.runs.map((run) => (
                  <div
                    key={run.id}
                    className="p-3 rounded-lg bg-[#090D14] border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#00F0FF]">
                        Đợt in #{run.runNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px]">
                        {run.status}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Bắt đầu: <span className="font-mono text-slate-200">{run.startedAt}</span>
                    </p>
                    <p className="text-slate-400">
                      Chi phí thực tế:{' '}
                      <span className="font-mono text-slate-200">
                        {run.actualCostVnd.toLocaleString()} ₫
                      </span>
                    </p>
                    {run.qcNote && <p className="text-emerald-300 pt-1">QC: {run.qcNote}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Chưa khởi chạy lượt in nào.</p>
            )}
          </section>

          <section className="p-4 rounded-xl bg-[#0D131F] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Truck className="w-4 h-4" /> 3. Vận Đơn & Lịch Trình Giao Vận
            </div>
            {order.shipment ? (
              <div className="text-xs space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D14] border border-slate-800">
                  <div>
                    <p className="text-slate-400">{order.shipment.carrier}</p>
                    <p className="font-mono font-bold text-sm text-[#00F0FF]">
                      {order.shipment.trackingNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => copyTracking(order.shipment!.trackingNumber)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 pl-2 border-l-2 border-[#00F0FF]/40">
                  {order.shipment.events.map((ev, idx) => (
                    <div key={idx} className="pl-3 relative">
                      <span className="font-mono text-[11px] text-[#00F0FF]">{ev.status}</span>
                      <p className="text-slate-200">{ev.description}</p>
                      <p className="font-mono text-[10px] text-slate-400">{ev.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Đơn hàng chưa phát hành mã vận đơn.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default StaffFulfillmentDrawer;

