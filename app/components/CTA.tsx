import React from 'react';

interface CTAProps {
  onStart?: (role: 'client' | 'gestionnaire') => void;
}

export function CTA({ onStart }: CTAProps) {
  const handleStart = (role: 'client' | 'gestionnaire') => {
    if (onStart) {
      onStart(role);
    } else {
      // Default behavior: redirect to login page
      window.location.href = '/auth/login';
    }
  };
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-2xl sm:rounded-4xl lg:rounded-[3rem] p-8 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-blue-900/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 leading-tight">Prêt à transformer votre gestion de sinistres ?</h2>
            <p className="text-blue-100 text-base sm:text-lg mb-8 sm:mb-10 leading-relaxed">Rejoignez les milliers d'assureurs et d'assurés qui ont choisi la simplicité et la performance.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <button 
                onClick={() => handleStart('client')}
                className="bg-white text-blue-600 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-neutral-50 transition-all shadow-xl shadow-blue-900/20 text-sm sm:text-base"
              >
                Commencer maintenant
              </button>
              <button className="bg-blue-500/30 text-white border border-white/20 backdrop-blur-sm px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-blue-500/40 transition-all text-sm sm:text-base">
                Contacter un expert
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}