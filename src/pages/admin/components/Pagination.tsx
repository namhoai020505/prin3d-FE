import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
  totalItemsOnPage?: number;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  hasNextPage,
  hasPrevPage,
  onPrev,
  onNext,
  pageSize = 20,
  totalItemsOnPage,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 bg-[#0a0f18]/80 text-xs text-slate-300 select-none">
      <div className="flex items-center gap-2 text-slate-400">
        <span>Hiển thị tối đa {pageSize} mục/trang</span>
        {typeof totalItemsOnPage === 'number' && (
          <span className="font-mono text-cyan-400/90 font-semibold">
            (Hiện có {totalItemsOnPage} mục)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrevPage || disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Trang trước</span>
        </button>

        <div className="flex items-center px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 font-mono font-bold">
          Trang {page}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNextPage || disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition font-medium"
        >
          <span>Trang sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

