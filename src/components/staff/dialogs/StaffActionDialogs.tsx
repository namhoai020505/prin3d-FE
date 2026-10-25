import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import {
  MOCK_PARTNER_LABS,
  type FulfillmentOrder,
  type AssignPartnerPayload,
  type RecordQcPayload,
  type CreateShipmentPayload,
} from '../../../types/staff';

export const AssignLabDialog: React.FC<{
  order: FulfillmentOrder | null;
  onClose: () => void;
  onSubmit: (orderId: string, payload: AssignPartnerPayload, labName: string) => void;
}> = ({ order, onClose, onSubmit }) => {
  const [partnerLabId, setPartnerLabId] = useState(MOCK_PARTNER_LABS[0].id);
  const [costVnd, setCostVnd] = useState(450000);
  const [dueAtUtc, setDueAtUtc] = useState('2026-10-29T17:00');
  const [decisionNote, setDecisionNote] = useState('');

  if (!order) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const lab = MOCK_PARTNER_LABS.find((l) => l.id === partnerLabId)!;
    onSubmit(
      order.id,
      {
        partnerLabId,
        partnerCostSnapshotVnd: costVnd,
        dueAtUtc,
        decisionNote,
      },
      lab.name
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleConfirm}
        className="w-full max-w-lg rounded-2xl bg-[#090D14] border border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base">
            Phân Công Xưởng In — <span className="font-mono text-[#00F0FF]">{order.orderCode}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Chọn trạm in đối tác</label>
          <select
            value={partnerLabId}
            onChange={(e) => setPartnerLabId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0D131F] border border-slate-800 text-sm"
          >
            {MOCK_PARTNER_LABS.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({lab.specialty}) — Đang chạy {lab.activeLoad} đơn
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Chi phí xưởng (VNĐ)</label>
            <input
              type="number"
              value={costVnd}
              onChange={(e) => setCostVnd(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Hạn hoàn thành dự kiến</label>
            <input
              type="datetime-local"
              value={dueAtUtc}
              onChange={(e) => setDueAtUtc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Ghi chú kỹ thuật cho xưởng</label>
          <textarea
            rows={3}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Lưu ý bước sóng sấy UV hoặc thông số support..."
            className="w-full p-3 rounded-xl bg-[#0D131F] border border-slate-800 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#00F0FF] text-slate-950 font-bold text-sm"
          >
            Xác Nhận Gán Xưởng
          </button>
        </div>
      </form>
    </div>
  );
};

export const QcReviewDialog: React.FC<{
  order: FulfillmentOrder | null;
  onClose: () => void;
  onSubmit: (orderId: string, payload: RecordQcPayload) => void;
}> = ({ order, onClose, onSubmit }) => {
  const [passed, setPassed] = useState<boolean>(true);
  const [defectReason, setDefectReason] = useState<string>('Bọt khí Resin');
  const [triggerReprint, setTriggerReprint] = useState<boolean>(true);
  const [qcNote, setQcNote] = useState<string>('');
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  if (!order) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(order.id, {
      passed,
      qcNote: passed ? qcNote : `[${defectReason}] ${qcNote}`,
      triggerReprint: !passed && triggerReprint,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleConfirm}
        className="w-full max-w-lg rounded-2xl bg-[#090D14] border border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base">
            Kiểm Định Chất Lượng (QC) —{' '}
            <span className="font-mono text-[#00F0FF]">{order.orderCode}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPassed(true)}
            className={`py-2.5 rounded-xl font-bold text-sm border ${
              passed
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-[#0D131F] border-slate-800 text-slate-400'
            }`}
          >
            ✓ Đạt chuẩn (Passed)
          </button>
          <button
            type="button"
            onClick={() => setPassed(false)}
            className={`py-2.5 rounded-xl font-bold text-sm border ${
              !passed
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-[#0D131F] border-slate-800 text-slate-400'
            }`}
          >
            ✕ Không đạt chuẩn (Failed)
          </button>
        </div>

        {!passed && (
          <div className="space-y-3 p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/30">
            <div>
              <label className="block text-xs text-rose-300 mb-1">Nguyên nhân lỗi kỹ thuật</label>
              <select
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0D131F] border border-slate-800 text-sm"
              >
                <option value="Bọt khí Resin">Bọt khí Resin</option>
                <option value="Cong vênh">Cong vênh (Warping)</option>
                <option value="Gãy support">Gãy support</option>
                <option value="Layer shift">Trượt lớp cắt (Layer shift)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-rose-300 mb-1">Ảnh bằng chứng lỗi</label>
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 cursor-pointer hover:border-[#00F0FF] text-xs text-slate-300">
                <Upload className="w-4 h-4 text-[#00F0FF]" />
                <span>Tải ảnh chụp thực tế tại bàn QC</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {previewObjectUrl && (
                <img
                  src={previewObjectUrl}
                  alt="QC Evidence"
                  className="mt-2 h-24 rounded-lg object-cover border border-slate-700"
                />
              )}
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={triggerReprint}
                onChange={(e) => setTriggerReprint(e.target.checked)}
                className="w-4 h-4 accent-amber-400"
              />
              <span>Kích hoạt in lại tự động (Trigger Reprint — Đẩy về Cột 3)</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Ghi chú đánh giá chi tiết dung sai
          </label>
          <textarea
            rows={3}
            value={qcNote}
            onChange={(e) => setQcNote(e.target.value)}
            placeholder="Ghi nhận độ khít khớp nối, chất lượng bề mặt sau sấy UV..."
            className="w-full p-3 rounded-xl bg-[#0D131F] border border-slate-800 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-sm"
          >
            Đóng
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#00F0FF] text-slate-950 font-bold text-sm"
          >
            Lưu Kết Quả QC
          </button>
        </div>
      </form>
    </div>
  );
};

export const CreateShipmentDialog: React.FC<{
  order: FulfillmentOrder | null;
  onClose: () => void;
  onSubmit: (orderId: string, payload: CreateShipmentPayload) => void;
}> = ({ order, onClose, onSubmit }) => {
  const [carrier, setCarrier] = useState('VNPost Express 3D');
  const [trackingNumber, setTrackingNumber] = useState('VNP3D8849201VN');
  const [shippingActualVnd, setShippingActualVnd] = useState(38000);

  if (!order) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(order.id, { carrier, trackingNumber, shippingActualVnd });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleConfirm}
        className="w-full max-w-md rounded-2xl bg-[#090D14] border border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base">
            Tạo Vận Đơn Giao Hàng —{' '}
            <span className="font-mono text-[#00F0FF]">{order.orderCode}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Đơn vị vận chuyển</label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0D131F] border border-slate-800 text-sm"
          >
            <option value="VNPost Express 3D">VNPost Express 3D</option>
            <option value="Giao Hàng Nhanh">Giao Hàng Nhanh (GHN)</option>
            <option value="SPX Express">SPX Express</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Mã vận đơn (Tracking Number)</label>
          <input
            type="text"
            required
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Cước phí thực tế (VNĐ)</label>
          <input
            type="number"
            value={shippingActualVnd}
            onChange={(e) => setShippingActualVnd(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-[#0D131F] border border-slate-800 font-mono text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#10B981] text-slate-950 font-bold text-sm"
          >
            Phát Hành Mã Vận Đơn
          </button>
        </div>
      </form>
    </div>
  );
};
