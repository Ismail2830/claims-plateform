import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface NavigationProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
  onLogin?: () => void;
}

export function Navigation({ onStart, onLogin }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      // Fallback if onLogin is not provided
      onStart('client');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">ISM Assurance</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Fonctionnalités</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Comment ça marche</a>
            <a href="#testimonials" className="text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors">Témoignages</a>
          </div>
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleLoginClick}
              className="text-sm font-semibold text-neutral-900 hover:text-blue-600 transition-colors"
            >
              Connexion
            </button>
            <button 
              onClick={() => onStart('client')}
              className="bg-blue-600 text-white px-3 py-2 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
            >
              <span className="hidden sm:inline">Déclarer un sinistre</span>
              <span className="sm:hidden">Déclarer</span>
            </button>
          </div>
          <button 
            className="sm:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-5 h-5 flex flex-col justify-between">
              <span className={`block h-0.5 bg-neutral-900 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block h-0.5 bg-neutral-900 transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 bg-neutral-900 transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
        {/* Mobile menu */}
        <div className={`sm:hidden transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="px-4 py-4 border-t border-neutral-100 bg-white/95 backdrop-blur-md space-y-4">
            <a href="#features" className="block text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors py-2">Fonctionnalités</a>
            <a href="#how-it-works" className="block text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors py-2">Comment ça marche</a>
            <a href="#testimonials" className="block text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors py-2">Témoignages</a>
            <div className="pt-4 space-y-3">
              <button 
                onClick={handleLoginClick}
                className="block w-full text-left text-sm font-semibold text-neutral-900 hover:text-blue-600 transition-colors py-2"
              >
                Connexion
              </button>
              <button 
                onClick={() => onStart('client')}
                className="block w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
              >
                Déclarer un sinistre
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}