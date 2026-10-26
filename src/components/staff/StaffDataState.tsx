export function StaffDataState({ loading, error, empty, retry }: {
  loading: boolean; error: string | null; empty?: boolean; retry: () => void;
}) {
  if (loading) return <p role="status" className="p-4">Đang tải dữ liệu...</p>;
  if (error) return <div role="alert" className="p-4 text-rose-400"><p>Không thể tải dữ liệu: {error}</p><button type="button" onClick={retry} className="mt-2 underline">Thử lại</button></div>;
  return empty ? <p role="status" className="p-4">Không có dữ liệu phù hợp.</p> : null;
}
