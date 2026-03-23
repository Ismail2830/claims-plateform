'use client';

import { Navigation } from '@/app/components/Navigation';
import { Hero } from '@/app/components/Hero';
import { Stats } from '@/app/components/Stats';
import { Features } from '@/app/components/Features';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Testimonials } from '@/app/components/Testimonials';
import { FAQ } from '@/app/components/FAQ';
import { CTA } from '@/app/components/CTA';
import { Footer } from '@/app/components/Footer';

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section */}
      <Hero />
      
      {/* Stats Section */}
      <Stats />
      
      {/* Features Section */}
      <Features />
      
      {/* How It Works Section */}
      <HowItWorks />
      
      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <CTA />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
