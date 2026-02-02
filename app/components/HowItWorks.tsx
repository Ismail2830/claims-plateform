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
    <section id="how-it-works" className="py-24 bg-neutral-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-8 leading-tight">Accélérez vos règlements avec notre moteur IA</h2>
            <div className="space-y-8">
              {steps.map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <span className="text-blue-500 font-black text-2xl opacity-50">{item.step}</span>
                  <div>
                    <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-full border border-white/10 flex items-center justify-center p-8 animate-spin-slow">
               <div className="w-full h-full rounded-full border border-blue-500/30 border-dashed" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-blue-600 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-blue-500/50">
                <BrainCircuit className="w-20 h-20 text-white mb-4" />
                <p className="font-bold text-center px-6">Moteur d'Intelligence Artificielle SinistreConnect</p>
              </div>
            </div>
            <div className="absolute top-1/4 -left-10 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Scanning</span>
              </div>
              <div className="h-1 w-24 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}