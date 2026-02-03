import React from 'react';
import { Zap } from 'lucide-react';

export function Testimonials() {
  const testimonials = [
    {
      text: "La rapidité de traitement est incroyable. J'ai été remboursé pour mon dégât des eaux en moins de 48h.",
      author: "Jean-Pierre D.",
      role: "Particulier"
    },
    {
      text: "L'interface gestionnaire est un vrai gain de productivité pour mon équipe. Le scoring IA nous fait gagner un temps précieux.",
      author: "Marie L.",
      role: "Directrice Indemnisation"
    },
    {
      text: "Enfin une application d'assurance qui comprend les besoins des utilisateurs mobiles. Simple et efficace.",
      author: "Thomas B.",
      role: "Professionnel"
    }
  ];

  return (
    <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-16">Ils nous font confiance</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-neutral-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-left border border-neutral-100">
              <div className="flex gap-1 text-amber-400 mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => <Zap key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />)}
              </div>
              <p className="text-neutral-700 italic mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-200" />
                 <div>
                   <p className="font-bold text-sm">{t.author}</p>
                   <p className="text-xs text-neutral-500">{t.role}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}