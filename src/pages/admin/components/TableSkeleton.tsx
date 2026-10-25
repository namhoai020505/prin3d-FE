import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="w-full space-y-2 p-4 animate-pulse">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5"
        >
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 rounded bg-white/10"
              style={{
                width: cIdx === 0 ? '18%' : cIdx === 1 ? '22%' : '15%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;

