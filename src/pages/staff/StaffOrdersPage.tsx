import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { MOCK_FULFILLMENT_ORDERS, type FulfillmentOrder, type KanbanStage } from '../../types/staff';
import { StaffFulfillmentDrawer } from '../../components/staff/StaffFulfillmentDrawer';

export const StaffOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders] = useState<FulfillmentOrder[]>(MOCK_FULFILLMENT_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | KanbanStage>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !searchTerm.trim() ||
        o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerPhone.includes(searchTerm);

      const matchStage = stageFilter === 'ALL' || o.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [orders, searchTerm, stageFilter]);

  const getStageBadgeColor = (stage: KanbanStage) => {
    switch (stage) {
      case 'AwaitingLab':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'LabAssigned':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'InProduction':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'QualityCheck':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'Delivery':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Danh Sách Đơn Hàng Sản Xuất In 3D</h2>
          <p className="text-xs text-slate-400">
            Tra cứu toàn bộ đơn đặt in vật lý đã thanh toán PayOS (Ẩn thông tin doanh thu sàn theo phân quyền Staff Role = 2).
          </p>
        </div>

        <button
          onClick={() => navigate('/staff/fulfillment')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 text-xs font-bold hover:bg-[#00F0FF]/25 transition-all self-start md:self-auto cursor-pointer"
        >
          <span>Xem Bảng Kanban Điều Phối</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã TB-..., tên mô hình, tên khách hoặc SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:border-[#00F0FF] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-xs text-slate-300 focus:border-[#00F0FF] outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả giai đoạn</option>
            <option value="AwaitingLab">1. Chờ Gán Xưởng</option>
            <option value="LabAssigned">2. Xưởng Tiếp Nhận</option>
            <option value="InProduction">3. Đang In & Xử Lý</option>
            <option value="QualityCheck">4. Chờ QC</option>
            <option value="Delivery">5. Giao Vận</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#090D14] border border-slate-800 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0D131F] text-xs font-mono text-slate-400 uppercase">
              <th className="p-4">Mã Đơn</th>
              <th className="p-4">Mô Hình 3D</th>
              <th className="p-4">Khách Hàng</th>
              <th className="p-4">Vật Liệu & Khổ</th>
              <th className="p-4">Trạm Phân Công</th>
              <th className="p-4">Giai Đoạn</th>
              <th className="p-4 text-right">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                  Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className="hover:bg-[#0D131F]/80 transition-colors cursor-pointer group"
                >
                  <td className="p-4 font-mono font-bold text-[#00F0FF] group-hover:underline">
                    {o.orderCode}
                  </td>
                  <td className="p-4 font-semibold text-slate-100">{o.modelName}</td>
                  <td className="p-4 text-slate-300">
                    <div>{o.customerName}</div>
                    <span className="font-mono text-xs text-slate-400">{o.customerPhone}</span>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-300">
                    {o.material} • {o.heightMm}mm (x{o.quantity})
                  </td>
                  <td className="p-4 text-xs text-slate-300">
                    {o.assignment?.partnerLabName ? (
                      <span className="text-slate-200 font-medium">
                        {o.assignment.partnerLabName}
                      </span>
                    ) : (
                      <span className="text-amber-400 italic">Chưa phân công</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono border ${getStageBadgeColor(
                        o.stage
                      )}`}
                    >
                      {o.stage} / {o.subStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(o);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0D131F] border border-slate-700 text-xs text-slate-300 hover:text-[#00F0FF] hover:border-[#00F0FF]/40 transition-all cursor-pointer"
                    >
                      Xem Lộ Trình
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <StaffFulfillmentDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
};

export default StaffOrdersPage;
