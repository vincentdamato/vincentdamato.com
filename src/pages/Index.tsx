import { Helmet } from "react-helmet-async";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Your Name | Designer & Developer</title>
        <meta
          name="description"
          content="Personal website of Your Name - Designer, developer, and creative thinker crafting meaningful digital experiences."
        />
      </Helmet>
      
      <main className="min-h-screen bg-background">
        <HeroSection />
        <AboutSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
