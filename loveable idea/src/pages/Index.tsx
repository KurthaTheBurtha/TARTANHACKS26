import Header from "@/components/layout/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pillars from "@/components/landing/Pillars";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pillars />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
