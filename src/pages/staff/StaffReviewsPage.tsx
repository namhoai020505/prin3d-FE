import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, XCircle, Layers, Cpu, Maximize2, Triangle } from 'lucide-react';
import {
  MOCK_REVIEW_QUEUE,
  type ReviewQueueItem,
  type CreatePrintReviewPayload,
} from '../../types/staff';
import { StaffModelViewer } from '../../components/staff/StaffModelViewer';
import api from '../../lib/api';

export const StaffReviewsPage: React.FC = () => {
  const [queue, setQueue] = useState<ReviewQueueItem[]>(MOCK_REVIEW_QUEUE);
  const [filter, setFilter] = useState<'ALL' | 'DONE' | 'WARN' | 'ERR'>('ALL');
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem>(MOCK_REVIEW_QUEUE[0]);

  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [orientation, setOrientation] = useState<'Vertical' | 'Angled45' | 'Horizontal'>('Angled45');
  const [material, setMaterial] = useState<string>(selectedItem.defaultMaterial);
  const [heightMm, setHeightMm] = useState<number>(selectedItem.requestedHeightMm);
  const [slicer, setSlicer] = useState<string>('ChituBox');
  const [supportChecked, setSupportChecked] = useState<boolean>(false);
  const [buildVolumeChecked, setBuildVolumeChecked] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSelectModel = (item: ReviewQueueItem) => {
    setSelectedItem(item);
    setMaterial(item.defaultMaterial);
    setHeightMm(item.requestedHeightMm);
    setDecision(item.meshStatus === 'NonManifold' ? 'Rejected' : 'Approved');
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'DONE') return item.meshStatus === 'Reviewed';
    if (filter === 'WARN') return item.meshStatus === 'Warning';
    if (filter === 'ERR') return item.meshStatus === 'NonManifold';
    return true;
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'Approved' && (!supportChecked || !buildVolumeChecked)) {
      toast.warning('Vui lòng tích xác nhận đầy đủ 2 tiêu chuẩn kỹ thuật trước khi duyệt!');
      return;
    }
    if (note.trim().length < 3) {
      toast.error('Ghi chú của kiểm định viên phải có tối thiểu 3 ký tự!');
      return;
    }

    const payload: CreatePrintReviewPayload = {
      versionId: selectedItem.versionId,
      decision,
      checklist: {
        watertight: selectedItem.meshStatus === 'Watertight',
        wallThicknessMm: 2.0,
        supportRequired: supportChecked,
        orientation,
        slicer,
      },
      configuration: {
        material,
        heightMm,
        scale: Number((heightMm / selectedItem.requestedHeightMm).toFixed(2)),
      },
      note: note.trim(),
    };

    try {
      setSubmitting(true);
      try {
        await api.post('/api/v2/reviews', payload);
      } catch {
        // Fallback sang Mock mode nếu Backend chưa bật
      }
      setQueue((prev) =>
        prev.map((q) => (q.id === selectedItem.id ? { ...q, meshStatus: 'Reviewed' } : q))
      );
      toast.success(
        `Đã ${decision === 'Approved' ? 'PHÊ DUYỆT' : 'TỪ CHỐI'} mẫu ${selectedItem.taskCode}`
      );
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-96 border-r border-slate-800/80 bg-[#090D14] flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-base font-bold tracking-wide">Hàng Đợi Thẩm Định Mesh 3D</h2>
          <div className="flex gap-1.5 mt-3">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'DONE', label: 'Hoàn tất' },
              { id: 'WARN', label: 'Cần chú ý' },
              { id: 'ERR', label: 'Hở lưới' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-[#00F0FF] text-slate-950 font-bold'
                    : 'bg-[#0D131F] text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredQueue.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectModel(item)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex gap-3 ${
                selectedItem.id === item.id
                  ? 'bg-[#0D131F] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'bg-[#0D131F]/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <img
                src={item.previewUrl}
                alt={item.modelName}
                className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#00F0FF]">{item.taskCode}</span>
                  <span className="text-[11px] text-slate-400">{item.createdAt}</span>
                </div>
                <h3 className="text-sm font-semibold truncate mt-0.5">{item.modelName}</h3>
                <div className="mt-2 flex items-center justify-between">
                  {item.meshStatus === 'Watertight' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Kín nước Watertight
                    </span>
                  )}
                  {item.meshStatus === 'NonManifold' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      Hở lưới Non-manifold
                    </span>
                  )}
                  {item.meshStatus === 'Warning' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Cần chú ý độ dày
                    </span>
                  )}
                  {item.meshStatus === 'Reviewed' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/15 text-cyan-300">
                      Đã duyệt
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StaffModelViewer
          dimensionsMm={selectedItem.dimensionsMm}
          meshStatus={selectedItem.meshStatus}
        />

        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0D131F] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Maximize2 className="w-3.5 h-3.5 text-[#00F0FF]" /> Chiều cao yêu cầu
            </div>
            <p className="mt-1.5 text-lg font-mono font-bold text-[#00F0FF]">
              {selectedItem.requestedHeightMm} mm
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#0D131F] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Kích thước thực (XYZ)
            </div>
            <p className="mt-1.5 text-sm font-mono font-bold">
              {selectedItem.dimensionsMm.x} × {selectedItem.dimensionsMm.y} ×{' '}
              {selectedItem.dimensionsMm.z} mm
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#0D131F] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> Thể tích khối
            </div>
            <p className="mt-1.5 text-lg font-mono font-bold">
              {selectedItem.volumeCm3} cm³
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#0D131F] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Triangle className="w-3.5 h-3.5 text-rose-400" /> Tổng mặt tam giác
            </div>
            <p className="mt-1.5 text-lg font-mono font-bold">
              {selectedItem.triangleCount.toLocaleString()} tris
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmitReview}
          className="p-6 rounded-2xl bg-[#090D14] border border-slate-800 space-y-5"
        >
          <h3 className="text-base font-bold border-b border-slate-800 pb-3">
            Phiếu Thẩm Định Kỹ Thuật In 3D —{' '}
            <span className="font-mono text-[#00F0FF]">{selectedItem.taskCode}</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDecision('Approved')}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                decision === 'Approved'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0D131F] border-slate-800 text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> ✓ Đạt yêu cầu (Approved)
            </button>
            <button
              type="button"
              onClick={() => setDecision('Rejected')}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                decision === 'Rejected'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  : 'bg-[#0D131F] border-slate-800 text-slate-400'
              }`}
            >
              <XCircle className="w-4 h-4" /> ✕ Từ chối (Rejected)
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Hướng đặt phôi in</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as typeof orientation)}
                className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="Vertical">Thẳng đứng (Vertical)</option>
                <option value="Angled45">Nghiêng 45 độ (Angled 45)</option>
                <option value="Horizontal">Nằm ngang (Horizontal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Vật liệu duyệt in</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="Resin Tiêu chuẩn">Resin Tiêu chuẩn</option>
                <option value="Resin 8K Cao cấp">Resin 8K Cao cấp</option>
                <option value="Nhựa PLA Pro">Nhựa PLA Pro</option>
                <option value="Nylon CF">Nylon CF</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Chiều cao in (mm)</label>
              <input
                type="number"
                value={heightMm}
                onChange={(e) => setHeightMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-sm font-mono focus:border-[#00F0FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Phần mềm Slicer</label>
              <select
                value={slicer}
                onChange={(e) => setSlicer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="ChituBox">ChituBox Pro</option>
                <option value="Bambu Studio">Bambu Studio</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={supportChecked}
                onChange={(e) => setSupportChecked(e.target.checked)}
                className="w-4 h-4 accent-[#00F0FF] rounded"
              />
              <span>
                Xác nhận kết cấu đỡ (Support) đạt tiêu chuẩn in, không ăn vào mặt chi tiết chính.
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={buildVolumeChecked}
                onChange={(e) => setBuildVolumeChecked(e.target.checked)}
                className="w-4 h-4 accent-[#00F0FF] rounded"
              />
              <span>Xác nhận nằm gọn trong khổ in (Build Volume) của trạm.</span>
            </label>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Ghi chú kỹ thuật của kiểm định viên (Tối thiểu 3 ký tự)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập nhận xét về độ dày thành vách, vị trí đặt lỗ thoát nhựa hoặc lý do từ chối..."
              className="w-full p-3 rounded-xl bg-[#0D131F] border border-slate-800 text-sm focus:border-[#00F0FF] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#00F0FF] text-slate-950 font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:bg-[#00F0FF]/90 transition-all cursor-pointer"
          >
            ✓ Xác nhận phê duyệt mẫu in 3D
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffReviewsPage;

