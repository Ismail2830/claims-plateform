import React from 'react';
import { BrainCircuit } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Capture Intelligente",
      desc: "Prenez des photos. Notre IA extrait automatiquement les données pertinentes (plaque d'immatriculation, dégâts visibles)."
    },
    {
      step: "02",
      title: "Analyse Instantanée",
      desc: "Le système compare le sinistre avec des milliers de cas similaires pour évaluer le coût et la validité."
    },
    {
      step: "03",
      title: "Décision Assistée",
      desc: "Les dossiers simples sont approuvés automatiquement. Les cas complexes sont transmis aux experts avec un rapport détaillé."
    }
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 bg-neutral-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 leading-tight">Accélérez vos règlements avec notre moteur IA</h2>
            <div className="space-y-6 sm:space-y-8">
              {steps.map((item, idx) => (
                <div key={idx} className="flex gap-4 sm:gap-6">
                  <span className="text-blue-500 font-black text-xl sm:text-2xl opacity-50 shrink-0">{item.step}</span>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-8 lg:mt-0">
            <div className="aspect-square rounded-full border border-white/10 flex items-center justify-center p-4 sm:p-8 animate-spin-slow">
               <div className="w-full h-full rounded-full border border-blue-500/30 border-dashed" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 bg-blue-600 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-blue-500/50">
                <BrainCircuit className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-white mb-3 sm:mb-4" />
                <p className="font-bold text-center px-4 sm:px-6 text-xs sm:text-sm lg:text-base">Moteur d'Intelligence Artificielle SinistreConnect</p>
              </div>
            </div>
            <div className="absolute top-1/4 -left-4 sm:-left-6 lg:-left-10 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/20 max-w-35 sm:max-w-none">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">Scanning</span>
              </div>
              <div className="h-1 w-16 sm:w-24 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}