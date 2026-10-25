import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePagedQuery } from '../../../hooks/usePagedQuery';
import { adminReviewService, type GenerationTaskItem } from '../../../services/admin/adminReviewService';
import { ReviewWorkspace } from './ReviewWorkspace';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../orders/orderStatus';

export const ReviewsPage: React.FC = () => {
  const { generationId: routeGenId } = useParams<{ generationId?: string }>();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<GenerationTaskItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load paginated list of tasks
  const {
    data: rawTasks,
    loading: listLoading,
    error,
    page,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    refetch,
  } = usePagedQuery<GenerationTaskItem>({
    queryFn: (pageNumber, signal) => adminReviewService.getGenerations(pageNumber, signal),
    pageSize: 20,
  });

  // Client-side status filter
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'ALL') return rawTasks;
    return rawTasks.filter((t) => t.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [rawTasks, statusFilter]);

  // Handle URL deep-link or selection change
  useEffect(() => {
    if (routeGenId) {
      // Find in existing list first
      const found = rawTasks.find((t) => t.id.toLowerCase() === routeGenId.toLowerCase());
      if (found) {
        setSelectedTask(found);
      } else {
        // Fetch individually
        const abortController = new AbortController();
        setDetailLoading(true);
        adminReviewService
          .getGenerationById(routeGenId, abortController.signal)
          .then((data) => {
            setSelectedTask(data);
          })
          .catch((err) => {
            if (err.name === 'CanceledError' || err.name === 'AbortError') return;
            console.error('Failed to fetch generation by id:', err);
          })
          .finally(() => {
            setDetailLoading(false);
          });

        return () => {
          abortController.abort();
        };
      }
    } else if (rawTasks.length > 0 && !selectedTask) {
      // Auto-select first item if no item selected yet
      setSelectedTask(rawTasks[0]);
    }
  }, [routeGenId, rawTasks]);

  const handleSelectTask = (task: GenerationTaskItem) => {
    setSelectedTask(task);
    navigate(`/admin/reviews/${task.id}`);
  };

  const handleReviewSuccess = () => {
    refetch();
    if (selectedTask) {
      adminReviewService.getGenerationById(selectedTask.id).then((fresh) => {
        setSelectedTask(fresh);
      });
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'succeeded':
        return <StatusBadge label="Hoàn tất" variant="success" />;
      case 'processing':
        return <StatusBadge label="Đang tạo 3D" variant="warning" />;
      case 'needsattention':
        return <StatusBadge label="Cần xử lý" variant="warning" />;
      case 'failed':
        return <StatusBadge label="Thất bại" variant="danger" />;
      default:
        return <StatusBadge label={status || 'Chờ xử lý'} variant="neutral" />;
    }
  };

  const getReviewStatusBadge = (task: GenerationTaskItem) => {
    const decision = task.latestPrintReview?.decision || task.reviewStatus;
    if (decision?.toLowerCase() === 'approved') {
      return <StatusBadge label="Đã duyệt" variant="success" />;
    }
    if (decision?.toLowerCase() === 'rejected') {
      return <StatusBadge label="Từ chối" variant="danger" />;
    }
    return <StatusBadge label="Chờ duyệt" variant="neutral" />;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>🔍</span> Thẩm định Mẫu in 3D
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm tra lưới Mesh 3D, độ kín nước (Watertight) và phê duyệt kỹ thuật trước khi khách chốt đơn
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm self-start md:self-auto cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Master–Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Master Task List (5 columns on large screen) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Status Filter Tabs */}
          <div className="rounded-xl border border-slate-800 bg-[#0d131f] p-3 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'Succeeded', label: 'Hoàn tất' },
                { key: 'Processing', label: 'Đang tạo' },
                { key: 'NeedsAttention', label: 'Cần chú ý' },
                { key: 'Failed', label: 'Lỗi' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredTasks.length} mẫu
            </span>
          </div>

          {/* List Cards */}
          <div className="space-y-2.5">
            {listLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
                ))}
              </div>
            )}

            {error && !listLoading && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-center text-rose-300 text-xs">
                {error}
              </div>
            )}

            {!listLoading && !error && filteredTasks.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#0d131f] p-8 text-center text-slate-400 text-xs">
                Không có tác vụ nào thuộc bộ lọc này.
              </div>
            )}

            {!listLoading &&
              filteredTasks.map((task) => {
                const isSelected = selectedTask?.id.toLowerCase() === task.id.toLowerCase();
                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-800/80 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                        : 'bg-[#0d131f] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">
                            {task.modelName || 'Mô hình không tên'}
                          </h4>
                          {getReviewStatusBadge(task)}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                          ID: {task.id}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {getTaskStatusBadge(task.status)}
                        <span className="block text-[10px] text-slate-400 mt-1">
                          {formatDateTime(task.createdAtUtc)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Cao: <strong className="text-slate-300">{task.requestedHeightMm} mm</strong></span>
                      <span>
                        Lưới:{' '}
                        <strong className={task.isWatertight ? 'text-emerald-400' : 'text-rose-400'}>
                          {task.isWatertight ? 'Kín nước' : 'Hở lưới'}
                        </strong>
                      </span>
                      <span>
                        In:{' '}
                        <strong className={task.printability?.status === 'healthy' ? 'text-emerald-400' : 'text-slate-300'}>
                          {task.printability?.status || 'Chưa đo'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Left Column Pagination */}
          <Pagination
            page={page}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onPrev={prevPage}
            onNext={nextPage}
            pageSize={20}
            totalItemsOnPage={filteredTasks.length}
            disabled={listLoading}
          />
        </div>

        {/* Right Column: Detail Workspace (7 columns on large screen) */}
        <div className="lg:col-span-7">
          <ReviewWorkspace
            task={selectedTask}
            loading={detailLoading}
            onSuccess={handleReviewSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;

