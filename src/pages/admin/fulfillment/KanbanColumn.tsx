import React from 'react';
import { FaInbox, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';

export interface KanbanColumnProps {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  headerColorClass: string;
  badgeColorClass: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  stepNumber,
  title,
  subtitle,
  count,
  icon,
  headerColorClass,
  badgeColorClass,
  isCollapsed = false,
  onToggleCollapse,
  children,
}) => {
  // Collapsed View (Slim Vertical Bar)
  if (isCollapsed) {
    return (
      <div
        id={id}
        onClick={onToggleCollapse}
        title={`Click để mở rộng ${title} (${count} đơn)`}
        className="flex flex-col items-center justify-between py-4 px-2 w-14 sm:w-16 shrink-0 rounded-2xl border border-white/10 bg-[#0B1120]/90 backdrop-blur-md hover:border-cyan-400/40 hover:bg-slate-900 transition-all duration-200 cursor-pointer shadow-lg select-none min-h-[450px]"
      >
        {/* Top: Step Number & Expand Icon */}
        <div className="flex flex-col items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-black/40 border border-white/15 text-xs font-bold text-white shadow-inner">
            {stepNumber}
          </span>
          <button
            type="button"
            aria-label={`Mở rộng ${title}`}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-colors"
          >
            <FaAngleDoubleRight className="text-xs" />
          </button>
        </div>

        {/* Middle: Rotated Vertical Title */}
        <div className="flex-1 flex items-center justify-center py-6">
          <span
            className="text-xs font-bold tracking-widest uppercase text-slate-300 whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {title}
          </span>
        </div>

        {/* Bottom: Count Badge */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${badgeColorClass}`}
          >
            {count}
          </span>
        </div>
      </div>
    );
  }

  // Expanded View (Full Column)
  return (
    <div
      id={id}
      className="flex flex-col flex-1 min-w-[220px] max-w-full w-full rounded-2xl border border-white/10 bg-[#0B1120]/80 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-200"
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b border-white/10 ${headerColorClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-lg bg-black/30 border border-white/15 text-xs font-bold text-white">
              {stepNumber}
            </span>
            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm truncate">
              <span className="text-sm sm:text-base shrink-0">{icon}</span>
              <span className="truncate">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${badgeColorClass}`}
            >
              {count}
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Thu gọn cột"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FaAngleDoubleLeft className="text-xs" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 pl-8 truncate">{subtitle}</p>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 p-2.5 sm:p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {count === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-3 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
            <FaInbox className="text-xl text-slate-600 mb-1.5" />
            <p className="text-xs text-slate-400 font-medium">Không có đơn ở bước này</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Các đơn chuyển trạng thái sẽ xuất hiện tại đây</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
