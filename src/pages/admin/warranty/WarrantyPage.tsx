import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  FaShieldAlt,
  FaSearch,
  FaSyncAlt,
  FaCheckCircle,
  FaTimes,
  FaRedo,
  FaUndo,
  FaBan,
  FaUser,
  FaImage,
  FaExternalLinkAlt,
  FaGavel,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  defectService,
  type DefectReportDto,
} from '../../../services/defectService';
import { StatusBadge, type StatusBadgeTone } from '../components/StatusBadge';
import { DataTable, type Column } from '../components/DataTable';
import { formatDateTime } from '../orders/orderStatus';

type ResolutionType = 'ReprintApproved' | 'RefundApproved' | 'Rejected';

export const WarrantyPage: React.FC = () => {
  // Data state
  const [reports, setReports] = useState<DefectReportDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Lightbox viewer state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  // Resolve Defect Modal state
  const [resolvingReport, setResolvingReport] = useState<DefectReportDto | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<ResolutionType | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState<boolean>(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Accessible IDs for form controls
  const searchInputId = useId();
  const statusFilterSelectId = useId();
  const resolutionNoteTextareaId = useId();

  // Load defect reports
  const loadDefectReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defectService.getDefectReports({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setReports(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách khiếu nại sản phẩm lỗi.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDefectReports();
  }, [loadDefectReports]);

  // Open Lightbox viewer
  const handleOpenLightbox = (images: string[], initialIndex: number, title: string) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(initialIndex);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  // Close Lightbox
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  // Navigate Lightbox
  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseLightbox();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  // Open Resolve Modal
  const handleOpenResolveModal = (report: DefectReportDto) => {
    setResolvingReport(report);
    setResolutionChoice(null);
    setResolutionNote('');
    setResolutionError(null);
  };

  // Close Resolve Modal
  const handleCloseResolveModal = () => {
    setResolvingReport(null);
    setResolutionChoice(null);
    setResolutionNote('');
    setResolutionError(null);
  };

  // Validate Resolution Form
  const isResolutionNoteValid = resolutionNote.trim().length >= 10;
  const isResolutionFormValid = !!resolutionChoice && isResolutionNoteValid;

  // Submit Resolution
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingReport || !resolutionChoice) return;

    if (!isResolutionNoteValid) {
      setResolutionError('Ghi chú thẩm định bắt buộc từ 10 ký tự trở lên.');
      return;
    }

    try {
      setIsSubmittingResolution(true);
      setResolutionError(null);

      await defectService.resolveDefectReport(resolvingReport.id, {
        resolutionType: resolutionChoice,
        resolutionNote: resolutionNote.trim(),
      });

      toast.success(
        resolutionChoice === 'ReprintApproved'
          ? 'Đã phê duyệt in lại sản phẩm thành công!'
          : resolutionChoice === 'RefundApproved'
          ? 'Đã phê duyệt hoàn tiền đơn hàng thành công!'
          : 'Đã từ chối khiếu nại sản phẩm lỗi.',
      );

      handleCloseResolveModal();
      loadDefectReports();
    } catch (err: unknown) {
      const errResponse = err as { response?: { data?: { message?: string } } };
      const msg = errResponse?.response?.data?.message || 'Lỗi khi thẩm định khiếu nại.';
      setResolutionError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = rep.orderCode?.toLowerCase().includes(query);
        const nameMatch = rep.customerName?.toLowerCase().includes(query);
        const reasonMatch = rep.reason?.toLowerCase().includes(query);
        const noteMatch = rep.resolutionNote?.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !reasonMatch && !noteMatch) return false;
      }
      if (statusFilter !== 'ALL') {
        const status = rep.status?.toLowerCase();
        if (statusFilter === 'PendingReview') {
          if (status !== 'open' && status !== 'pendingreview') return false;
        } else if (status !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [reports, searchTerm, statusFilter]);

  // Status badge styling helper
  const getDefectStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    let tone: StatusBadgeTone = 'slate';
    let label = status;

    if (s === 'open' || s === 'pendingreview') {
      tone = 'amber';
      label = 'Chờ thẩm định';
    } else if (s === 'reprintapproved') {
      tone = 'cyan';
      label = 'Duyệt in lại';
    } else if (s === 'refundapproved') {
      tone = 'green';
      label = 'Duyệt hoàn tiền';
    } else if (s === 'rejected') {
      tone = 'red';
      label = 'Đã bác bỏ';
    }

    return <StatusBadge label={label} tone={tone} />;
  };

  // Column definitions for Defect Reports Table
  const columns: Column<DefectReportDto>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn hàng',
      render: (item) => (
        <div>
          <span className="font-mono text-cyan-400 font-semibold tracking-wide block">
            {item.orderCode || 'TB-ORDER'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono truncate block max-w-[140px]">
            {item.id}
          </span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Khách hàng',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-[10px] shrink-0">
            <FaUser />
          </div>
          <span className="font-semibold text-slate-200 text-xs">
            {item.customerName || 'Khách hàng'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAtUtc',
      header: 'Ngày gửi khiếu nại',
      render: (item) => (
        <span className="text-slate-400 text-[11px]">
          {formatDateTime(item.createdAtUtc)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Lý do khiếu nại',
      render: (item) => (
        <div className="max-w-[240px]">
          <p className="text-slate-300 text-xs line-clamp-2" title={item.reason}>
            {item.reason}
          </p>
          {item.resolutionNote && (
            <p className="text-[10px] text-cyan-300/80 italic mt-0.5 line-clamp-1" title={item.resolutionNote}>
              Ghi chú: {item.resolutionNote}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'evidencePhotos',
      header: 'Ảnh bằng chứng',
      render: (item) => {
        const photos = item.evidencePhotos || [];
        if (photos.length === 0) {
          return (
            <span className="text-[11px] text-slate-500 italic flex items-center gap-1">
              <FaImage className="text-[10px]" /> Không có ảnh
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {photos.slice(0, 3).map((photoUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenLightbox(photos, idx, `Bằng chứng lỗi đơn ${item.orderCode || ''}`)}
                className="group relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/60 bg-black/40 cursor-pointer transition-all hover:scale-105 shrink-0"
                title="Click để phóng to ảnh"
              >
                <img
                  src={photoUrl}
                  alt={`Bằng chứng ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:opacity-90"
                  onError={(e) => {
                    // Fallback visual placeholder if remote URL fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-cyan-950/20 group-hover:bg-transparent transition-colors" />
              </button>
            ))}
            {photos.length > 3 && (
              <button
                type="button"
                onClick={() => handleOpenLightbox(photos, 3, `Bằng chứng lỗi đơn ${item.orderCode || ''}`)}
                className="w-10 h-10 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-[11px] font-bold flex items-center justify-center hover:bg-cyan-500/20 cursor-pointer"
                title={`Xem thêm ${photos.length - 3} ảnh`}
              >
                +{photos.length - 3}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (item) => getDefectStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (item) => {
        const isPending =
          item.status === 'Open' ||
          item.status === 'PendingReview' ||
          item.status?.toLowerCase() === 'open' ||
          item.status?.toLowerCase() === 'pendingreview';

        return (
          <button
            onClick={() => handleOpenResolveModal(item)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
              isPending
                ? 'btn-pooled-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Thẩm định và đưa ra phương án xử lý khiếu nại"
          >
            <FaGavel className="text-[10px]" />
            <span>{isPending ? 'Thẩm Định Khiếu Nại' : 'Xem Thẩm Định'}</span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="min-h-full bg-[#090D14] text-white p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FaShieldAlt className="text-sm" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Bảo Hành & Khiếu Nại Sản Phẩm Lỗi
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-10.5">
            Tiếp nhận hồ sơ khiếu nại, tra cứu bằng chứng ảnh lỗi và thẩm định giải quyết đền bù
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pl-10.5 md:pl-0">
          <button
            onClick={() => loadDefectReports()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            title="Làm mới danh sách khiếu nại"
          >
            <FaSyncAlt className={`text-xs text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Tìm kiếm theo mã đơn, khách hàng hoặc lý do
          </label>
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc lý do khiếu nại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0F17] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusFilterSelectId} className="text-xs text-slate-400 whitespace-nowrap">
            Trạng thái:
          </label>
          <select
            id={statusFilterSelectId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="ALL">Tất cả khiếu nại</option>
            <option value="PendingReview">Chờ thẩm định (Open / PendingReview)</option>
            <option value="ReprintApproved">Đã duyệt in lại (ReprintApproved)</option>
            <option value="RefundApproved">Đã duyệt hoàn tiền (RefundApproved)</option>
            <option value="Rejected">Đã bác bỏ (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <DataTable<DefectReportDto>
          columns={columns}
          data={filteredReports}
          loading={loading}
          error={error}
          keyExtractor={(item) => item.id}
          emptyTitle="Chưa có khiếu nại nào"
          emptyDescription="Không tìm thấy bản ghi khiếu nại sản phẩm lỗi nào phù hợp với bộ lọc."
        />
      </div>

      {/* Lightbox Viewer Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxTitle || 'Xem ảnh bằng chứng'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={handleCloseLightbox}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="w-full flex items-center justify-between py-3 px-4 text-white text-xs bg-slate-950/80 border border-white/10 rounded-t-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <FaImage className="text-cyan-400" />
                <span className="font-semibold">{lightboxTitle || 'Ảnh bằng chứng khiếu nại'}</span>
                <span className="text-slate-400 font-mono text-[11px] ml-2">
                  ({lightboxIndex + 1} / {lightboxImages.length})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImages[lightboxIndex]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
                  title="Mở ảnh trong tab mới"
                >
                  <FaExternalLinkAlt className="text-[10px]" />
                  <span>Mở gốc</span>
                </a>
                <button
                  type="button"
                  onClick={handleCloseLightbox}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Container */}
            <div className="relative w-full bg-black/90 flex items-center justify-center border-x border-white/10 p-4 min-h-[360px] max-h-[70vh] overflow-hidden">
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Bằng chứng lỗi ${lightboxIndex + 1}`}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl transition-all select-none"
              />

              {/* Prev Button */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 text-white flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all cursor-pointer shadow-lg"
                  title="Ảnh trước (Mũi tên trái)"
                >
                  <FaChevronLeft className="text-sm" />
                </button>
              )}

              {/* Next Button */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 text-white flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all cursor-pointer shadow-lg"
                  title="Ảnh sau (Mũi tên phải)"
                >
                  <FaChevronRight className="text-sm" />
                </button>
              )}
            </div>

            {/* Lightbox Footer Thumbnails Strip */}
            {lightboxImages.length > 1 && (
              <div className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950/80 border border-white/10 rounded-b-2xl overflow-x-auto">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      lightboxIndex === idx
                        ? 'border-cyan-400 scale-105 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Thẩm Định Khiếu Nại */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0D121F] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FaGavel className="text-xs" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Thẩm Định Khiếu Nại — {resolvingReport.orderCode || 'Đơn Hàng'}
                </h2>
              </div>
              <button
                onClick={handleCloseResolveModal}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitResolution} className="p-6 space-y-4 text-xs">
              {resolutionError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                  <FaExclamationTriangle className="shrink-0" />
                  <span>{resolutionError}</span>
                </div>
              )}

              {/* Report Recap */}
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách hàng:</span>
                  <span className="font-semibold text-slate-200">{resolvingReport.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lý do khiếu nại:</span>
                  <span className="text-slate-300 text-right max-w-[280px]">{resolvingReport.reason}</span>
                </div>
                {resolvingReport.evidencePhotos && resolvingReport.evidencePhotos.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-slate-400 block mb-1.5">Ảnh bằng chứng:</span>
                    <div className="flex items-center gap-2">
                      {resolvingReport.evidencePhotos.map((url, i) => (
                        <div
                          key={i}
                          className="w-12 h-12 rounded-lg border border-white/10 overflow-hidden bg-black/40"
                        >
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Resolution Choices */}
              <div>
                <span className="block font-semibold text-slate-300 mb-2">
                  Lựa chọn phương án giải quyết <span className="text-rose-400">*</span>
                </span>
                <div className="space-y-2">
                  {/* Option 1: In lại miễn phí (ReprintApproved) */}
                  <div
                    onClick={() => setResolutionChoice('ReprintApproved')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      resolutionChoice === 'ReprintApproved'
                        ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        resolutionChoice === 'ReprintApproved'
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-white/5 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      <FaRedo className="text-xs" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-white">In lại miễn phí (ReprintApproved)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tự động kích hoạt lượt in bù cho xưởng sản xuất, không thu thêm bất kỳ chi phí nào từ khách hàng.
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Duyệt hoàn tiền (RefundApproved) */}
                  <div
                    onClick={() => setResolutionChoice('RefundApproved')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      resolutionChoice === 'RefundApproved'
                        ? 'border-emerald-400 bg-emerald-950/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        resolutionChoice === 'RefundApproved'
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-white/5 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      <FaUndo className="text-xs" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-white">Duyệt hoàn tiền (RefundApproved)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Chấp thuận hoàn tiền đơn hàng và chuyển sang danh sách chờ hoàn tiền tại phân hệ Tài chính.
                      </div>
                    </div>
                  </div>

                  {/* Option 3: Bác bỏ khiếu nại (Rejected) */}
                  <div
                    onClick={() => setResolutionChoice('Rejected')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      resolutionChoice === 'Rejected'
                        ? 'border-rose-400 bg-rose-950/30 text-white shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        resolutionChoice === 'Rejected'
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-white/5 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <FaBan className="text-xs" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-white">Bác bỏ khiếu nại (Rejected)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Từ chối khiếu nại do sản phẩm đạt chuẩn kỹ thuật bàn giao hoặc lỗi không xuất phát từ nhà in.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Resolution Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={resolutionNoteTextareaId} className="font-semibold text-slate-300">
                    Ghi chú thẩm định <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`font-mono text-[10px] ${
                      resolutionNote.trim().length >= 10 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {resolutionNote.trim().length} / 10 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  id={resolutionNoteTextareaId}
                  rows={3}
                  placeholder="Ghi rõ lý do thẩm định và căn cứ đưa ra quyết định (tối thiểu 10 ký tự)..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
                {resolutionNote.trim().length > 0 && resolutionNote.trim().length < 10 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Vui lòng nhập thêm ít nhất {10 - resolutionNote.trim().length} ký tự nữa.
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseResolveModal}
                  disabled={isSubmittingResolution}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!isResolutionFormValid || isSubmittingResolution}
                  className="btn-pooled-cyan px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                >
                  {isSubmittingResolution ? (
                    <>
                      <FaSyncAlt className="animate-spin text-xs" />
                      <span>Đang lưu thẩm định...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-xs" />
                      <span>Xác nhận Thẩm Định</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyPage;
