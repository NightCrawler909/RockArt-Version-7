import { useCallback } from "react";
import LandingNavBar from "../components/LandingNavBar.jsx";
import HeroSection from "../components/HeroSection.jsx";
import FeaturesSection from "../components/FeaturesSection.jsx";
import WorkflowSection from "../components/WorkflowSection.jsx";
import StatsSection from "../components/StatsSection.jsx";
import ModelFlowSection from "../components/ModelFlowSection.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function Landing() {
  const scrollToSection = useCallback((target) => {
    if (!target) return;
    if (target === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const section = document.getElementById(target);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <LandingNavBar onNavigate={scrollToSection} />
      <main>
        <HeroSection onLearnMore={() => scrollToSection("features")} />
        <FeaturesSection />
        <WorkflowSection />
        <StatsSection />
        <ModelFlowSection />
      </main>
      <SiteFooter />
    </div>
  );
}
