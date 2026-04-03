import HeroSection from "@/components/landing/HeroSection";
import StatsCounter from "@/components/landing/StatsCounter";
import FeatureCards from "@/components/landing/FeatureCards";
import ArchitectureDiagram from "@/components/landing/ArchitectureDiagram";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0f]">
      <HeroSection />
      <StatsCounter />
      <FeatureCards />
      <ArchitectureDiagram />
      <Footer />
    </main>
  );
}
