import React from 'react';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  onRowClick,
  keyExtractor,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={6} columns={columns.length} />;
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl m-4 text-rose-300">
        <p className="font-bold text-sm mb-1">Lỗi khi tải dữ liệu</p>
        <p className="text-xs text-rose-400">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-[#0B0F17]/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 sticky top-0 z-10 backdrop-blur-md">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3.5 px-4 font-bold ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item, idx)}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors group ${
                onRowClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                  {col.render
                    ? col.render(item, idx)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;

