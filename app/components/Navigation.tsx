import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface NavigationProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
}

export function Navigation({ onStart }: NavigationProps) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">ISM Assurance</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Fonctionnalités</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Comment ça marche</a>
            <a href="#testimonials" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onStart('client')}
              className="text-sm font-semibold text-neutral-900 hover:text-blue-600 transition-colors"
            >
              Connexion
            </button>
            <button 
              onClick={() => onStart('client')}
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
            >
              Déclarer un sinistre
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}