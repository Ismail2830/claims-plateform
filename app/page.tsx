'use client';

import React from 'react';
import { Navigation } from '@/app/components/Navigation';
import { Hero } from '@/app/components/Hero';
import { Stats } from '@/app/components/Stats';
import { Features } from '@/app/components/Features';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Testimonials } from '@/app/components/Testimonials';
import { CTA } from '@/app/components/CTA';
import { Footer } from '@/app/components/Footer';

interface LandingPageProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navigation onStart={onStart} />
      <Hero onStart={onStart} />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA onStart={onStart} />
      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5px, -10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}} />
    </div>
  );
}

export default LandingPage;
