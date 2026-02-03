import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/file/ImageWithFallback';

interface HeroProps {
  onStart: (role: 'client' | 'gestionnaire') => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap className="w-3 h-3" />
              Nouveau : Analyse de risque par IA
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 mb-4 sm:mb-6 leading-[1.1]">
              La gestion de sinistres, <span className="text-blue-600">enfin simplifiée.</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-6 sm:mb-8 leading-relaxed max-w-xl">
              Déclarez vos sinistres en quelques clics, suivez l'avancement en temps réel et bénéficiez d'un traitement ultra-rapide assisté par notre technologie IA.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={() => onStart('client')}
                className="bg-neutral-900 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 text-sm sm:text-base"
              >
                Accès Client <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => onStart('gestionnaire')}
                className="bg-white text-neutral-900 border border-neutral-200 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all text-sm sm:text-base"
              >
                Espace Gestionnaire
              </button>
            </div>
            <div className="mt-10 flex items-center gap-4 text-sm text-neutral-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center overflow-hidden">
                    <ImageWithFallback 
                      src={`https://i.pravatar.cc/150?u=${i + 10}`} 
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <p>Déjà utilisé par plus de <span className="font-bold text-neutral-900">10,000+</span> assurés satisfaits.</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-blue-200 border border-neutral-100">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1673187139211-1e7ec3dd60ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBhY2NpZGVudCUyMGluc3VyYW5jZSUyMGNsYWltJTIwcHJvY2VzcyUyMG1vYmlsZSUyMGFwcHxlbnwxfHx8fDE3NzAwMjY5NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="Application Mobile SinistreConnect"
                className="w-full h-auto"
              />
            </div>
            {/* Floating Cards */}
            <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 z-20 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-neutral-100 flex items-center gap-3 sm:gap-4 animate-bounce-slow max-w-50 sm:max-w-none">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Statut</p>
                <p className="text-xs sm:text-sm font-bold">Sinistre Approuvé</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 z-20 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-neutral-100 animate-float max-w-37.5 sm:max-w-none">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <p className="text-xs font-bold text-neutral-500 uppercase">Scoring IA</p>
              </div>
              <p className="text-base sm:text-lg font-black text-blue-600">98% Fiable</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}