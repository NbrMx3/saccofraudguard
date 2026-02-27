import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import DashboardPreviewSection from '@/components/landing/DashboardPreviewSection'
import WhyChooseUsSection from '@/components/landing/WhyChooseUsSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020a18] antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardPreviewSection />
        <WhyChooseUsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
