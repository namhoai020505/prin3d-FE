import { Crown } from 'lucide-react';

export default function TopPromoBanner() {
  return (
    <div className="w-full flex justify-center px-4 pt-3 pb-2 z-40 select-none">
      <div className="inline-flex items-center gap-2 bg-[#0c1214]/90 hover:bg-[#0c1214] border border-white/10 hover:border-white/20 transition-all duration-300 rounded-full px-5 py-1.5 shadow-xl backdrop-blur-md text-[11px] md:text-xs text-neutral-300 max-w-4xl text-center flex-wrap justify-center">
        <span>
          Nhiều asset hơn, quy trình làm việc nhanh hơn và các bản xuất riêng tư, an toàn cho mục đích thương mại — chỉ{' '}
          <strong className="text-amber-400 font-semibold tracking-wide">
            đ 263.500
          </strong>{' '}
          cho tháng đầu tiên của bạn.
        </span>

        <button className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition-colors group cursor-pointer ml-1">
          <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Nâng cấp</span>
        </button>
      </div>
    </div>
  );
}
