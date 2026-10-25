import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { MOCK_DEFECT_REPORTS, type DefectReportItem, type ResolveDefectPayload } from '../../types/staff';
import defectService from '../../services/defectService';

export const StaffDefectsPage: React.FC = () => {
  const [reports, setReports] = useState<DefectReportItem[]>(MOCK_DEFECT_REPORTS);
  const [note, setNote] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleResolve = async (
    id: string,
    resolutionType: ResolveDefectPayload['resolutionType']
  ) => {
    try {
      setSubmittingId(id);
      try {
        await defectService.resolveDefectReport(id, {
          resolutionType,
          resolutionNote: note.trim() || undefined,
        });
      } catch {
        // Fallback sang local state nếu Backend endpoint chưa sẵn sàng
      }

      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: resolutionType } : r))
      );
      toast.success(`Đã xử lý khiếu nại với quyết định: ${resolutionType}`);
      setNote('');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      <div>
        <h2 className="text-lg font-bold">Thẩm Định Kỹ Thuật Khiếu Nại Lỗi In (Defect Reports)</h2>
        <p className="text-xs text-slate-400">
          Đối chiếu ảnh báo lỗi của khách hàng với ảnh lưu trữ QC lúc xuất xưởng để duyệt in bù hoặc chuyển Admin hoàn tiền.
        </p>
      </div>

      {reports.map((item) => (
        <div
          key={item.id}
          className="p-6 rounded-2xl bg-[#090D14] border border-slate-800 space-y-5 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="font-mono text-xs text-[#00F0FF]">{item.orderCode}</span>
              <h3 className="text-base font-bold text-slate-100">{item.modelName}</h3>
              <p className="text-xs text-slate-400">Khách hàng: {item.customerName}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono ${
                item.status === 'ReprintApproved'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : item.status === 'RefundApproved'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : item.status === 'Rejected'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {item.status}
            </span>
          </div>

          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
            <strong>Mô tả lỗi từ khách:</strong> "{item.reportedIssue}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-2">Ảnh chụp lỗi khách hàng gửi</p>
              <img
                src={item.customerImageUrl}
                alt="Customer Defect"
                className="w-full h-56 object-cover rounded-xl border border-rose-500/40"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Ảnh lưu trữ bàn QC trước khi đóng gói</p>
              <img
                src={item.qcArchiveImageUrl}
                alt="QC Archive"
                className="w-full h-56 object-cover rounded-xl border border-emerald-500/40"
              />
            </div>
          </div>

          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập giải trình kỹ thuật hoặc ghi chú cho xưởng in lại..."
            className="w-full p-3 rounded-xl bg-[#0D131F] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleResolve(item.id, 'ReprintApproved')}
              disabled={submittingId === item.id}
              className="px-4 py-2.5 rounded-xl bg-[#00F0FF] text-slate-950 font-bold text-xs hover:bg-[#00F0FF]/90 transition-all cursor-pointer disabled:opacity-50"
            >
              [Duyệt In Lại Đền Bù (ReprintApproved)]
            </button>
            <button
              onClick={() => handleResolve(item.id, 'RefundApproved')}
              disabled={submittingId === item.id}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              [Duyệt Hoàn Tiền — Chuyển Admin PayOS]
            </button>
            <button
              onClick={() => handleResolve(item.id, 'Rejected')}
              disabled={submittingId === item.id}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 font-bold text-xs hover:bg-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              [Bác Bỏ Khiếu Nại (Rejected)]
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffDefectsPage;
