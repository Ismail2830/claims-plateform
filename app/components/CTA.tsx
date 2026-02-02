import React from 'react';

interface CTAProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
}

export function CTA({ onStart }: CTAProps) {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Prêt à transformer votre gestion de sinistres ?</h2>
            <p className="text-blue-100 text-lg mb-10">Rejoignez les milliers d'assureurs et d'assurés qui ont choisi la simplicité et la performance.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => onStart('client')}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-neutral-50 transition-all shadow-xl shadow-blue-900/20"
              >
                Commencer maintenant
              </button>
              <button className="bg-blue-500/30 text-white border border-white/20 backdrop-blur-sm px-8 py-4 rounded-2xl font-bold hover:bg-blue-500/40 transition-all">
                Contacter un expert
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}