import React from 'react';
import { FaInbox } from 'react-icons/fa';

export interface KanbanColumnProps {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  headerColorClass: string;
  badgeColorClass: string;
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
  children,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col min-w-[310px] max-w-[360px] w-full shrink-0 rounded-2xl border border-white/10 bg-[#0B1120]/80 backdrop-blur-md overflow-hidden shadow-lg"
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b border-white/10 ${headerColorClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/30 border border-white/15 text-xs font-bold text-white">
              {stepNumber}
            </span>
            <div className="flex items-center gap-1.5 text-white font-bold text-sm">
              <span className="text-base">{icon}</span>
              <span>{title}</span>
            </div>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${badgeColorClass}`}
          >
            {count}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 pl-8">{subtitle}</p>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {count === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
            <FaInbox className="text-2xl text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Không có đơn ở bước này</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Các đơn chuyển trạng thái sẽ xuất hiện tại đây</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;

