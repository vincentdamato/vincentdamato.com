import { useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  useEffect(() => {
    document.title = "Vincent Damato";
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </main>
  );
};

export default Index;
