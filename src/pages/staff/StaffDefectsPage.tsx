import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { staffService } from '../../services/staffService';
import { fulfillmentService } from '../../services/fulfillmentService';
import { resolveDefectReport, type DefectReportDto } from '../../services/defectService';
import type { ResolveDefectPayload } from '../../types/staff';
import { errorMessage, useStaffData } from '../../hooks/useStaffData';
import { StaffDataState } from '../../components/staff/StaffDataState';

function Evidence({ storageKey }: { storageKey: string }) {
  return /^https?:\/\//i.test(storageKey) ? <a href={storageKey} target="_blank" rel="noreferrer"><img className="w-full max-h-64 object-contain" src={storageKey} alt="Ảnh bằng chứng" /></a> : <p className="font-mono text-sm break-all">Mã lưu trữ: {storageKey}</p>;
}
function Report({ report, onSuccess }: { report: DefectReportDto; onSuccess: () => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => fulfillmentService.getOrderTimeline(report.orderId), [report.orderId]);
  const { data: timeline, loading, error: timelineError, reload } = useStaffData(load);
  const runs = timeline?.productionRuns || timeline?.assignments?.flatMap(a => a.productionRuns || []) || [];
  const evidence = runs.filter(run => run.qcEvidenceStorageKey);
  const open = ['Open', 'PendingReview', 'Pending'].includes(report.status);
  const resolve = async (resolutionType: ResolveDefectPayload['resolutionType']) => {
    if (lock.current || !open) return;
    if (note.trim().length < 3) { setError('Cần nhập giải trình kỹ thuật tối thiểu 3 ký tự.'); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      await resolveDefectReport(report.id, { resolutionType, resolutionNote: note.trim() });
      toast.success('Đã lưu quyết định xử lý khiếu nại trên máy chủ.');
      await onSuccess();
    } catch (err) { setError(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="staff-panel space-y-4">
    <h2 className="font-bold">Đơn hàng {timeline?.orderCode || report.orderId}</h2><p>Trạng thái: {report.status}</p><p>Mô tả lỗi: {report.reason}</p><p className="staff-muted">Báo cáo lúc {report.createdAtUtc}</p>
    <div className="grid md:grid-cols-2 gap-4">
      <section className="staff-panel space-y-2"><h3>Ảnh lỗi từ khách hàng</h3>{report.evidence?.length ? report.evidence.map(e => <Evidence key={e.id} storageKey={e.storageKey} />) : <p className="staff-muted">Chưa có bằng chứng.</p>}</section>
      <section className="staff-panel space-y-2"><h3>Ảnh lưu trữ QC</h3><StaffDataState loading={loading} error={timelineError} empty={!evidence.length} retry={reload} />{evidence.map(run => <div key={run.id}><p>Đợt #{run.runNo ?? '—'} / {run.status}</p><Evidence storageKey={run.qcEvidenceStorageKey!} /></div>)}</section>
    </div>
    {error && <p role="alert" className="staff-error">Không thể xử lý khiếu nại: {error}</p>}
    {open ? <fieldset disabled={busy} className="space-y-3"><label>Giải trình kỹ thuật<textarea className="staff-input" value={note} onChange={e => setNote(e.target.value)} /></label><div className="flex gap-3 flex-wrap"><button className="staff-button" onClick={() => void resolve('ReprintApproved')}>Duyệt In Lại Đền Bù</button><button className="staff-button" onClick={() => void resolve('RefundApproved')}>Duyệt Hoàn Tiền / Chuyển Admin</button><button className="staff-button" onClick={() => void resolve('Rejected')}>Bác Bỏ Khiếu Nại</button></div></fieldset> : <p>Giải trình: {report.resolutionNote || '—'}</p>}
  </div>;
}
export default function StaffDefectsPage() {
  const { data, loading, error, reload } = useStaffData(staffService.getDefects);
  return <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
    <div className="flex justify-between gap-3"><h1 className="text-xl font-bold">Thẩm Định Khiếu Nại Lỗi In</h1><button className="staff-button" disabled={loading} onClick={() => void reload()}>Tải lại</button></div>
    <p className="staff-muted">Đối chiếu bằng chứng kỹ thuật để duyệt in bù hoặc chuyển yêu cầu hoàn tiền cho Admin.</p>
    <StaffDataState loading={loading} error={error} empty={!data?.length} retry={reload} />
    {!loading && !error && data?.map(report => <Report key={`${report.id}:${report.status}`} report={report} onSuccess={reload} />)}
  </div>;
}
