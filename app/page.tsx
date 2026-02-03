'use client';

import React, { useState } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { Hero } from '@/app/components/Hero';
import { Stats } from '@/app/components/Stats';
import { Features } from '@/app/components/Features';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Testimonials } from '@/app/components/Testimonials';
import { CTA } from '@/app/components/CTA';
import { Footer } from '@/app/components/Footer';
import { Login } from '@/app/components/Login';
import { SignUp } from '@/app/components/SignUp';

type ViewState = 'landing' | 'login' | 'signup';

interface LandingPageProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  const handleLogin = () => {
    setCurrentView('login');
  };

  const handleSignUp = () => {
    setCurrentView('signup');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const handleLoginSubmit = (email: string, password: string) => {
    // Handle login logic here
    console.log('Login attempt:', { email, password });
    // For now, just redirect to client area
    onStart('client');
  };

  const handleSignUpSubmit = (userData: { fullName: string; email: string; password: string }) => {
    // Handle signup logic here
    console.log('Signup attempt:', userData);
    // For now, just redirect to client area
    onStart('client');
  };

  // Render Login View
  if (currentView === 'login') {
    return (
      <Login
        onBack={handleBackToLanding}
        onSignUp={handleSignUp}
        onLogin={handleLoginSubmit}
      />
    );
  }

  // Render SignUp View
  if (currentView === 'signup') {
    return (
      <SignUp
        onBack={handleBackToLanding}
        onLogin={handleLogin}
        onSignUp={handleSignUpSubmit}
      />
    );
  }

  // Render Landing View (default)
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navigation onStart={onStart} onLogin={handleLogin} />
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
