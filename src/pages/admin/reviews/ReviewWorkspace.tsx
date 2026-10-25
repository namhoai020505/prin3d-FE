import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { type GenerationTaskItem, adminReviewService } from '../../../services/admin/adminReviewService';
import { AdminModelViewer } from './AdminModelViewer';
import { ReviewForm } from './ReviewForm';
import { StatusBadge } from '../components/StatusBadge';

interface ReviewWorkspaceProps {
  task: GenerationTaskItem | null;
  loading?: boolean;
  onSuccess: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({ task, loading = false, onSuccess }) => {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  // Manage 3D GLB Blob URL lifecycle
  useEffect(() => {
    if (!task || !task.glbUrl) {
      setGlbUrl(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    const abortController = new AbortController();

    adminReviewService
      .getModelBlobUrl(task.id, 'glb', abortController.signal)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setGlbUrl(url);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.warn('Could not fetch GLB blob, fallback to direct glbUrl:', err);
        if (active) setGlbUrl(task.glbUrl || null);
      });

    return () => {
      active = false;
      abortController.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [task?.id, task?.glbUrl]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-8 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 mt-3">Đang nạp chi tiết tác vụ thẩm định...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0b0f19] p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/40 flex items-center justify-center text-slate-500 mb-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-300">Chưa chọn mẫu in 3D</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Vui lòng chọn một tác vụ ở danh sách bên trái để kiểm tra hình học và duyệt lệnh in.
        </p>
      </div>
    );
  }

  const metrics = task.printability?.metrics;
  const dims = metrics?.dimensionsMm;
  const isOversized = Boolean(dims && (dims.x > 300 || dims.y > 300 || dims.z > 300));

  const handleDownload = async (format: 'stl' | 'glb') => {
    try {
      setDownloadingFile(format);
      const url = await adminReviewService.getModelBlobUrl(task.id, format);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${task.modelName || 'model'}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Đã tải xuống file ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(`Không thể tải file ${format.toUpperCase()}: ` + (err.message || 'Lỗi server'));
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleRecover = async () => {
    try {
      setRecovering(true);
      await adminReviewService.recoverGeneration(task.id);
      toast.success('Đã gửi lệnh khôi phục tác vụ in!');
      onSuccess();
    } catch (err: any) {
      toast.error('Lỗi khôi phục tác vụ: ' + (err.message || 'Lỗi server'));
    } finally {
      setRecovering(false);
    }
  };

  // Review status badge meta
  const reviewDecision = task.latestPrintReview?.decision || task.reviewStatus;
  let reviewBadgeVariant: 'success' | 'danger' | 'warning' | 'neutral' = 'neutral';
  let reviewBadgeLabel = 'Chờ thẩm định';

  if (reviewDecision?.toLowerCase() === 'approved') {
    reviewBadgeVariant = 'success';
    reviewBadgeLabel = 'Đã phê duyệt';
  } else if (reviewDecision?.toLowerCase() === 'rejected') {
    reviewBadgeVariant = 'danger';
    reviewBadgeLabel = 'Đã từ chối';
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="rounded-xl border border-slate-800 bg-[#0d131f] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-white">
              {task.modelName || 'Mô hình 3D không tên'}
            </h2>
            <StatusBadge label={reviewBadgeLabel} variant={reviewBadgeVariant} />
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Task ID: {task.id}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {task.stlUrl && (
            <button
              onClick={() => handleDownload('stl')}
              disabled={downloadingFile === 'stl'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Tải file STL để cắt lớp"
            >
              📥 Tải STL
            </button>
          )}
          {task.glbUrl && (
            <button
              onClick={() => handleDownload('glb')}
              disabled={downloadingFile === 'glb'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Tải file GLB màu sắc"
            >
              📥 Tải GLB
            </button>
          )}
          {(task.status === 'NeedsAttention' || task.status === 'Failed') && (
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5"
              title="Khôi phục lại pipeline xử lý"
            >
              {recovering ? 'Đang khôi phục...' : '⚡ Khôi phục tác vụ'}
            </button>
          )}
        </div>
      </div>

      {/* 3D Model Viewport */}
      <div className="h-[440px] w-full">
        <AdminModelViewer
          modelUrl={glbUrl}
          modelName={task.modelName}
        />
      </div>

      {/* Oversized Warning */}
      {isOversized && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Cảnh báo kích thước:</strong> Mô hình có chiều vượt quá 300 mm ({dims?.x.toFixed(1)} x {dims?.y.toFixed(1)} x {dims?.z.toFixed(1)} mm). Vui lòng xác nhận khổ in máy trước khi duyệt.
          </div>
        </div>
      )}

      {/* Geometric & Printability Specs Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0d131f] p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Thông số hình học & Kiểm định Mesh
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Chiều cao yêu cầu</span>
            <span className="font-mono font-semibold text-slate-100 text-sm mt-0.5 block">
              {task.requestedHeightMm} mm
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Kích thước thực (X/Y/Z)</span>
            <span className="font-mono font-semibold text-slate-100 text-xs mt-0.5 block">
              {dims
                ? `${dims.x.toFixed(0)} × ${dims.y.toFixed(0)} × ${dims.z.toFixed(0)} mm`
                : 'Đang đo...'}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Thể tích khối</span>
            <span className="font-mono font-semibold text-slate-100 text-sm mt-0.5 block">
              {metrics?.volumeCm3 != null ? `${metrics.volumeCm3.toFixed(1)} cm³` : '—'}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Kín nước (Watertight)</span>
            <div className="mt-1">
              {task.isWatertight ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <span>✓</span> Đạt chuẩn
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                  <span>✕</span> Bị hở lưới
                </span>
              )}
            </div>
          </div>
        </div>

        {task.printability && (
          <div className="text-[11px] text-slate-400 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <div>
              Trạng thái in ấn (Printability):{' '}
              <strong className={task.printability.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>
                {task.printability.status || 'Chưa đánh giá'}
              </strong>
              {task.printability.details && ` — ${task.printability.details}`}
            </div>
            {metrics?.triangleCount && (
              <div className="font-mono text-slate-400">
                Lưới: {metrics.triangleCount.toLocaleString()} mặt tam giác
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Form */}
      <ReviewForm
        task={task}
        onSuccess={onSuccess}
      />
    </div>
  );
};
