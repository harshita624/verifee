import Hero          from "@/components/home/Hero";
import Stats         from "@/components/home/Stats";
import LiveTicker    from "@/components/home/LiveTicker";
import WhyVerifee    from "@/components/home/WhyVerifee";
import HowItWorks    from "@/components/home/HowItWorks";
import Features      from "@/components/home/Features";
import Categories    from "@/components/home/Categories";
import CompareTeaser from "@/components/home/CompareTeaser";
import Testimonials  from "@/components/home/Testimonials";
import FAQ           from "@/components/home/FAQ";
import CTA           from "@/components/home/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <LiveTicker />
      <WhyVerifee />
      <HowItWorks />
      <Features />
      <Categories />
      <CompareTeaser />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}