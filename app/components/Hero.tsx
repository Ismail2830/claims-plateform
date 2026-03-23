import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, CheckCircle2, Bot, Clock, Shield, Lock } from 'lucide-react';

interface HeroProps {
  onStart?: (role: 'client' | 'gestionnaire') => void;
}

export function Hero({ onStart }: HeroProps) {
  const handleStart = (role: 'client' | 'gestionnaire') => {
    if (onStart) {
      onStart(role);
    } else {
      // Default behavior: redirect to login page
      window.location.href = '/auth/login';
    }
  };
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%]
                  bg-blue-100 rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%]
                  bg-cyan-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute top-[30%] right-[20%] w-[20%] h-[20%]
                  bg-indigo-50 rounded-full blur-[100px] opacity-30" />
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
                onClick={() => handleStart('client')}
                className="bg-blue-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-sm sm:text-base"
              >
                Accès Client <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => handleStart('gestionnaire')}
                className="bg-white text-neutral-900 border border-neutral-200 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all text-sm sm:text-base"
              >
                Espace Gestionnaire
              </button>
            </div>
            <div className="mt-10 pt-8 border-t border-gray-100
                  flex flex-wrap items-center gap-6 sm:gap-8">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900">10,000+</span>
                <span className="text-xs text-gray-500 mt-0.5">Assurés au Maroc</span>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-blue-600">98%</span>
                <span className="text-xs text-gray-500 mt-0.5">Satisfaction client</span>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900">5 jours</span>
                <span className="text-xs text-gray-500 mt-0.5">Délai moyen de traitement</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>Agréé ACAPS</span>
              </div>
              <span className="text-gray-200">|</span>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                <span>Données sécurisées</span>
              </div>
              <span className="text-gray-200">|</span>
              <div className="flex items-center gap-1.5">
                <span>🇲🇦</span>
                <span>Plateforme 100% Marocaine</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >

            {/* Floating Card 1 — AI Score (top right) */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -top-5 -right-5 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scoring IA</p>
                <p className="text-base font-black text-blue-600">98% Fiable</p>
              </div>
            </motion.div>

            {/* Floating Card 2 — Approved (bottom left) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="absolute -bottom-5 -left-5 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</p>
                <p className="text-sm font-bold text-gray-800">Sinistre Approuvé</p>
              </div>
            </motion.div>

            {/* Floating Card 3 — Processing time (left middle) */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="absolute top-1/2 -translate-y-1/2 -left-8 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-orange-50 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Délai moyen</p>
                <p className="text-base font-black text-orange-600">5 jours</p>
              </div>
            </motion.div>

            {/* CSS Dashboard Mockup */}
            <div className="bg-white rounded-2xl shadow-2xl shadow-blue-100 border border-gray-200 overflow-hidden">

              {/* Browser bar */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 ml-2">
                  <p className="text-xs text-gray-400">app.ism-assurance.ma/dashboard</p>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 bg-gray-50 space-y-3">

                {/* KPI cards row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Dossiers actifs', value: '247', color: 'text-gray-900', change: '↑ +12%', changeColor: 'text-green-600' },
                    { label: 'En instruction', value: '38', color: 'text-blue-600', change: '→ En cours', changeColor: 'text-blue-500' },
                    { label: 'Approuvés', value: '189', color: 'text-green-600', change: '↑ +8%', changeColor: 'text-green-600' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-500 mb-1">{kpi.label}</p>
                      <p className={`text-lg font-black ${kpi.color}`}>{kpi.value}</p>
                      <p className={`text-[10px] ${kpi.changeColor}`}>{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Claim card */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-gray-400">CLM-2026-701007</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                      🔄 En instruction
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">Accident automobile</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">12/03/2026 · Casablanca</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Progression</span>
                      <span>60%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full w-[60%] transition-all duration-700" />
                    </div>
                  </div>
                  <div className="mt-3 bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3 h-3 text-green-600" />
                      <span className="text-[10px] text-gray-600">Recommandation IA:</span>
                      <span className="text-[10px] font-bold text-green-700">✅ APPROUVER</span>
                    </div>
                    <span className="text-[10px] text-green-600 bg-green-100 rounded px-1.5 py-0.5">94%</span>
                  </div>
                </div>

                {/* Mini timeline */}
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-700 mb-3">Suivi du dossier</p>
                  <div className="flex items-center">
                    {[
                      { label: 'Déclaré', done: true },
                      { label: 'Documents', done: true },
                      { label: 'Instruction', done: false, current: true },
                      { label: 'Décision', done: false },
                    ].map((step, i, arr) => (
                      <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-green-500' : step.current ? 'bg-blue-500 animate-pulse' : 'bg-gray-200 border-2 border-gray-300'}`}>
                            {step.done && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-[9px] font-medium ${step.done ? 'text-green-600' : step.current ? 'text-blue-600' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-4 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}