export interface AIModel {
  id: string;
  name: string;
  badge?: string;
  description: string;
  supportsTexture: boolean;
  isFlagship?: boolean;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'theboys-7.1',
    name: 'TheBoys 7.1 - Flagship',
    badge: 'Mới nhất',
    description: 'Chất lượng cao nhất, tối ưu hình khối và chi tiết bề mặt sắc nét.',
    supportsTexture: true,
    isFlagship: true,
  },
  {
    id: 'theboys-7.0',
    name: 'TheBoys 7.0 - Pro',
    badge: 'Pro',
    description: 'Cân bằng giữa tốc độ và độ chi tiết cao, phù hợp mô hình nhân vật.',
    supportsTexture: true,
  },
  {
    id: 'theboys-6.5',
    name: 'TheBoys 6.5 - Fast',
    badge: 'Nhanh',
    description: 'Tốc độ tạo siêu tốc, thích hợp cho việc phác thảo ý tưởng nhanh.',
    supportsTexture: false,
  },
  {
    id: 'theboys-realistic',
    name: 'TheBoys Realistic - V1.0',
    badge: 'Chân thực',
    description: 'Chuyên biệt cho các mô hình tả thực và tượng in 3D.',
    supportsTexture: true,
  },
];

export const DETAIL_LEVELS = [
  'Chi tiết cao',
  'Chi tiết chuẩn',
  'Siêu chi tiết',
] as const;

export type DetailLevel = (typeof DETAIL_LEVELS)[number];

export const FACE_COUNTS = ['1.5M', '1M', '500k', '50k'] as const;
export type FaceCount = (typeof FACE_COUNTS)[number];

export interface ModelPreset {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  model: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'preset-chest',
    title: 'Mẫu rương kho báu 3D',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80',
    prompt: 'Rương kho báu cổ điển chạm khắc kim loại mạ vàng phong cách stylized 3D',
    model: 'TheBoys 7.1 - Flagship',
  },
  {
    id: 'preset-burger',
    title: 'Mẫu bánh burger 3D',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&auto=format&fit=crop&q=80',
    prompt: 'Mô hình hamburger hoạt hình 3D dễ thương, chi tiết mè và phô mai tan chảy',
    model: 'TheBoys 7.1 - Flagship',
  },
  {
    id: 'preset-robot',
    title: 'Mẫu robot mini 3D',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=120&auto=format&fit=crop&q=80',
    prompt: 'Robot hình người mini phong cách sci-fi tương lai, khớp nối sẵn sàng in 3D',
    model: 'TheBoys 7.0 - Pro',
  },
];

export const COMMUNITY_FILTERS = [
  'Đề xuất',
  'In 3D Printing: In Đa Chiều',
  'Phát triển trò chơi',
  'Nhân vật hoạt hình',
  'Nghệ thuật số',
] as const;
