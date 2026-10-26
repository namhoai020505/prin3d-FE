import React from 'react';
import { Upload, Sliders, Truck, ArrowRight, Sparkles } from 'lucide-react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';

export const ScrollStory: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: '1',
      title: 'Tải ảnh / Nhập chữ',
      desc: 'Tải lên ảnh 2D, bản vẽ hoặc nhập mô tả văn bản để AI phân tích và tái tạo cấu trúc khối 3D.',
      icon: Upload,
    },
    {
      num: '2',
      title: 'Tùy chỉnh 3D',
      desc: 'Xem trước 360°, điều chỉnh kích thước chiều cao, thể tích và kiểm định độ kín khối chuẩn in.',
      icon: Sliders,
    },
    {
      num: '3',
      title: 'Đặt in & Giao tận nơi',
      desc: 'Lựa chọn chất liệu PLA, ABS hoặc Resin SLA, thanh toán nhanh qua PayOS VietQR và nhận hàng tận nơi.',
      icon: Truck,
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F0] border border-[#B83B2A]/20 text-[#B83B2A] text-xs font-semibold mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quy Trình Tinh Gọn</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#231F1E] tracking-tight">
          Từ Ý Tưởng Đến Mô Hình Thực Tế
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#7A706C]">
          3 bước đơn giản biến hình ảnh sáng tạo thành sản phẩm in 3D hoàn chỉnh
        </p>
      </div>

      {/* 3 Thẻ Ngang Tinh Gọn Trên 1 Hàng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative rounded-2xl bg-[#FFFFFF] border border-[#E2D9D0] p-6 shadow-sm flex flex-col justify-between hover:border-[#B83B2A]/40 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FDF2F0] border border-[#B83B2A]/20 flex items-center justify-center text-[#B83B2A] group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-[#E2D9D0] group-hover:text-[#B83B2A]/40 transition-colors font-mono">
                    0{step.num}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#231F1E]">
                    {step.num}. {step.title}
                  </h3>
                  <p className="text-xs text-[#7A706C] mt-1.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#FFFFFF] border border-[#E2D9D0] items-center justify-center text-[#7A706C] shadow-xs">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nút Đỏ Chu Sa: Mở Studio 3D → */}
      <div className="flex justify-center mt-8">
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="px-6 py-3 rounded-xl bg-[#B83B2A] hover:bg-[#9E2F20] text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:gap-3 cursor-pointer"
        >
          <span>Mở Studio 3D →</span>
        </button>
      </div>
    </section>
  );
};

export default ScrollStory;
