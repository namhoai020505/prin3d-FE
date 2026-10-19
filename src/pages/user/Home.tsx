import HeroCreateSection from './components/HeroCreateSection';
import CommunitySection from './components/CommunitySection';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center min-h-[calc(100vh-60px)]">
      {/* 3D Generation Hero Section */}
      <HeroCreateSection />

      {/* Community Gallery Section */}
      <CommunitySection />
    </div>
  );
}
