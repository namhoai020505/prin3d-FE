import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { StaffModelViewer } from '../../components/staff/StaffModelViewer';
import { StaffDataState } from '../../components/staff/StaffDataState';
import { errorMessage, useStaffData } from '../../hooks/useStaffData';
import { staffService } from '../../services/staffService';
import { createPrintReview } from '../../services/approvalAndReviewService';
import { listPricingPackages } from '../../services/pricingPackageService';
import type { GenerationTaskItem } from '../../services/admin/adminReviewService';
import { getMediaUrl } from '../../lib/media';
import { adminReviewService } from '../../services/admin/adminReviewService';

function ReviewThumbnail({ task }: { task: GenerationTaskItem }) {
  const protectedImage = Boolean(task.imageUrl?.includes(`/api/generations/${task.id}/files/`));
  const [source, setSource] = useState<string | null>(protectedImage ? null : getMediaUrl(task.imageUrl));
  useEffect(() => {
    if (!protectedImage) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void adminReviewService.getImageBlobUrl(task.id, controller.signal).then(url => {
      if (controller.signal.aborted) { URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setSource(url);
    }).catch(() => { /* The text queue remains usable if the image cannot be downloaded. */ });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [task.id, protectedImage]);
  return source ? <img src={source} alt={task.modelName || task.id} className="w-16 h-16 object-cover rounded" /> : null;
}

function ReviewForm({ task, onSuccess }: { task: GenerationTaskItem; onSuccess: () => Promise<void> }) {
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [orientation, setOrientation] = useState('');
  const [material, setMaterial] = useState('');
  const [height, setHeight] = useState(String(task.requestedHeightMm ?? ''));
  const [scale, setScale] = useState('1');
  const [slicer, setSlicer] = useState('');
  const [support, setSupport] = useState(false);
  const [volume, setVolume] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const { data: packages, loading, error: materialError, reload } = useStaffData(listPricingPackages);
  const canApprove = task.isWatertight === true && task.printability?.status?.toLowerCase() !== 'failed' && task.status === 'Succeeded';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current || !task.versionId) return;
    if (note.trim().length < 3) { setError('Ghi chú phải có tối thiểu 3 ký tự.'); return; }
    if (!Number.isFinite(Number(height)) || Number(height) <= 0 || !Number.isFinite(Number(scale)) || Number(scale) <= 0 || !material.trim() || !orientation) { setError('Cần nhập cấu hình in hợp lệ.'); return; }
    if (decision === 'Approved' && (!canApprove || !support || !volume)) { setError('Mẫu phải đạt kiểm tra lưới và được xác nhận support, khổ in.'); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      await createPrintReview({
        versionId: task.versionId, decision,
        checklist: { orientation, supportConfirmation: support, buildVolumeConfirmation: volume, material: material.trim(), printHeightMm: Number(height), slicingSoftware: slicer.trim() || undefined },
        configuration: { material: material.trim(), heightMm: Number(height), scale: Number(scale) }, note: note.trim(),
      });
      toast.success('Đã lưu kết quả thẩm định trên máy chủ.');
      await onSuccess();
    } catch (err) { setError(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <form className="staff-panel space-y-4" onSubmit={submit}>
    <h2 className="font-bold">Phiếu Thẩm Định Kỹ Thuật In 3D</h2>
    {!task.versionId && <p role="alert">Chưa có phiên bản mô hình để thẩm định.</p>}
    {!canApprove && <p className="staff-error">Mẫu chưa đủ điều kiện phê duyệt in.</p>}
    {error && <p role="alert" className="staff-error">Không thể lưu thẩm định: {error}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="flex gap-3"><button className="staff-button" type="button" aria-pressed={decision === 'Approved'} disabled={!canApprove} onClick={() => setDecision('Approved')}>Đạt yêu cầu (Approved)</button><button className="staff-button" type="button" aria-pressed={decision === 'Rejected'} onClick={() => setDecision('Rejected')}>Từ chối (Rejected)</button></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label>Hướng in<select required className="staff-input" value={orientation} onChange={e => setOrientation(e.target.value)}><option value="">Chọn hướng in</option><option value="Vertical">Thẳng đứng</option><option value="Angled45">Nghiêng 45 độ</option><option value="Horizontal">Nằm ngang</option></select></label>
        <label>Vật liệu duyệt in<select required className="staff-input" value={material} onChange={e => setMaterial(e.target.value)}><option value="">Chọn vật liệu</option>{[...new Set(packages?.map(p => p.material))].map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Chiều cao in (mm)<input required type="number" min="0.01" step="any" className="staff-input" value={height} onChange={e => setHeight(e.target.value)} /></label>
        <label>Tỉ lệ in<input required type="number" min="0.01" step="any" className="staff-input" value={scale} onChange={e => setScale(e.target.value)} /></label>
        <label>Phần mềm Slicer<input className="staff-input" value={slicer} onChange={e => setSlicer(e.target.value)} /></label>
      </div>
      <StaffDataState loading={loading} error={materialError} retry={reload} />
      <label><input type="checkbox" checked={support} onChange={e => setSupport(e.target.checked)} /> Xác nhận kết cấu đỡ (Support) đạt tiêu chuẩn in.</label>
      <label><input type="checkbox" checked={volume} onChange={e => setVolume(e.target.checked)} /> Xác nhận nằm gọn trong khổ in (Build Volume) của trạm.</label>
      <label>Ghi chú kỹ thuật<textarea required minLength={3} className="staff-input" value={note} onChange={e => setNote(e.target.value)} /></label>
      <button type="submit" className="staff-button w-full" disabled={!task.versionId || (decision === 'Approved' && !canApprove)}>{busy ? 'Đang lưu...' : 'Xác nhận thẩm định mẫu in 3D'}</button>
    </fieldset>
  </form>;
}
function Workspace({ id, refreshQueue }: { id: string; refreshQueue: () => Promise<void> }) {
  const load = useCallback(() => staffService.getReviewDetail(id), [id]);
  const { data: task, loading, error, reload } = useStaffData(load);
  if (loading || error || !task) return <StaffDataState loading={loading} error={error} retry={reload} />;
  const metrics = task.printability?.metrics;
  const dims = metrics?.dimensionsMm;
  return <div className="space-y-4">
    <h2 className="text-lg font-bold">{task.modelName || task.id}</h2>
    {task.glbUrl || task.stlUrl ? <StaffModelViewer key={task.id} generationId={task.id} format={task.glbUrl ? 'glb' : 'stl'} /> : <p className="staff-panel">Chưa có tệp mô hình 3D.</p>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="staff-panel">Chiều cao yêu cầu<p className="font-mono">{task.requestedHeightMm ?? '—'} mm</p></div>
      <div className="staff-panel">Kích thước thực XYZ<p className="font-mono">{dims ? `${dims.x} × ${dims.y} × ${dims.z}` : '—'} mm</p></div>
      <div className="staff-panel">Thể tích<p className="font-mono">{metrics?.volumeCm3 ?? '—'} cm³</p></div>
      <div className="staff-panel">Tổng mặt tam giác<p className="font-mono">{metrics?.triangleCount?.toLocaleString('vi-VN') ?? '—'}</p></div>
    </div>
    <ReviewForm key={`${task.id}:${task.reviewedAtUtc || task.latestPrintReview?.createdAtUtc || ''}`} task={task} onSuccess={async () => { await Promise.all([reload(), refreshQueue()]); }} />
  </div>;
}
export default function StaffReviewsPage() {
  const { data, loading, error, reload } = useStaffData(staffService.getReviewQueue);
  const [filter, setFilter] = useState('ALL');
  const [id, setId] = useState<string | null>(null);
  const queue = (data || []).filter(task => filter === 'ALL' || (filter === 'DONE' ? ['Approved', 'Rejected'].includes(task.latestPrintReview?.decision || task.reviewStatus) : filter === 'WARN' ? task.status === 'NeedsAttention' : task.status === 'Failed' || task.isWatertight === false));
  return <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto">
    <section aria-label="Hàng đợi thẩm định" className="p-4 lg:w-80 lg:shrink-0 space-y-3 lg:overflow-y-auto">
      <h1 className="text-lg font-bold">Hàng Đợi Thẩm Định Mesh 3D</h1>
      <div className="flex gap-2 flex-wrap">{[{ id: 'ALL', name: 'Tất cả' }, { id: 'DONE', name: 'Hoàn tất' }, { id: 'WARN', name: 'Cần chú ý' }, { id: 'ERR', name: 'Lỗi / Hở lưới' }].map(tab => <button key={tab.id} className="staff-button text-xs" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>{tab.name}</button>)}</div>
      <button className="staff-button" disabled={loading} onClick={() => void reload()}>Tải lại</button>
      <StaffDataState loading={loading} error={error} empty={!queue.length} retry={reload} />
      {!loading && !error && queue.map(task => <button key={task.id} className="staff-panel text-left w-full space-y-1" aria-pressed={id === task.id} onClick={() => setId(task.id)}>{task.imageUrl && <ReviewThumbnail task={task} />}<strong>{task.modelName || task.id}</strong><p className="staff-muted text-xs font-mono break-all">{task.id}</p><p className="text-xs">{task.latestPrintReview?.decision || task.reviewStatus || task.status}</p><p className="text-xs">{task.isWatertight === true ? 'Kín nước Watertight' : task.isWatertight === false ? 'Hở lưới Non-manifold' : 'Chưa có phân tích lưới'}</p></button>)}
    </section>
    <section className="flex-1 min-w-0 p-4 lg:overflow-y-auto">{id ? <Workspace key={id} id={id} refreshQueue={reload} /> : <p className="staff-panel">Chọn một mẫu để thẩm định.</p>}</section>
  </div>;
}
