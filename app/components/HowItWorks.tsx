'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, MessageSquare, Upload, Bot,
  Activity, Banknote, Check, FileText, CheckCircle2, Brain,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

type MockupType =
  | 'CHATBOT' | 'UPLOAD' | 'AI_SCORE' | 'TRACKING' | 'PAYMENT';

interface Step {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  mockupType: MockupType;
}

interface StepItemProps {
  step: Step;
  index: number;
  isActive: boolean;
  isDone: boolean;
  onClick: () => void;
  isLast: boolean;
}

interface StepMockupProps {
  mockupType: MockupType;
}

// ─── StepItem ────────────────────────────────────────────

function StepItem({ step, index, isActive, isDone, onClick, isLast }: StepItemProps) {
  const Icon = step.icon;
  return (
    <div className="flex gap-4 cursor-pointer group" onClick={onClick}>
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 shrink-0 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
            : isDone
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-gray-500 border border-white/10'
        }`}>
          {isDone ? <Check className="w-4 h-4" /> : <span>{step.number}</span>}
        </div>
        {!isLast && (
          <div className={`w-px flex-1 min-h-8 my-1 transition-all duration-500 ${
            isDone || isActive ? 'bg-blue-600/40' : 'bg-white/10'
          }`} />
        )}
      </div>

      <div className={`pb-6 transition-all duration-200 ${
        isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'
      }`}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step.tagColor}`}>
          {step.tag}
        </span>
        <h3 className={`text-base font-black mt-1.5 transition-colors duration-200 ${
          isActive ? 'text-white' : 'text-gray-400'
        }`}>
          {step.title}
        </h3>
        <AnimatePresence>
          {isActive && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-gray-400 mt-1.5 leading-relaxed"
            >
              {step.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Mockup sub-components ────────────────────────────────

function ChatbotMockup() {
  return (
    <div className="w-full max-w-sm space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-gray-200 max-w-xs">
          Bonjour! Quel type de sinistre souhaitez-vous déclarer?
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ml-9">
        {['🚗 Auto', '🏠 Habitation', '🏥 Santé', '⚡ Autre'].map(t => (
          <span key={t} className="bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-blue-600/40 transition-colors">
            {t}
          </span>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="bg-blue-600 rounded-2xl rounded-tr-none px-4 py-2.5 text-sm text-white max-w-xs">
          🚗 Accident automobile
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-gray-200 max-w-xs">
          Parfait! Quand l&apos;accident s&apos;est-il produit?
        </div>
      </div>
      <div className="flex items-center gap-1 ml-9">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <span className="text-xs text-gray-500">Alex tape...</span>
      </div>
    </div>
  );
}

function UploadMockup() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="border-2 border-dashed border-blue-500/40 rounded-2xl p-6 text-center">
        <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300 font-medium">Glissez vos photos ici</p>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF · Max 10 Mo</p>
      </div>
      {[
        { name: 'Photo_degats.jpg', status: 'done' },
        { name: 'Constat_amiable.pdf', status: 'done' },
        { name: 'Permis_conduire.jpg', status: 'loading' },
      ].map(file => (
        <div key={file.name} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-300 flex-1 truncate">{file.name}</span>
          {file.status === 'done'
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          }
        </div>
      ))}
    </div>
  );
}

function AIScoreMockup() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-blue-500/40">
          <Brain className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">Analyse en cours...</p>
      </div>
      {[
        { label: 'Score de risque', value: '18/100', bar: 18, color: 'bg-green-500', text: 'text-green-400' },
        { label: 'Fiabilité documents', value: '96%', bar: 96, color: 'bg-blue-500', text: 'text-blue-400' },
        { label: 'Cohérence montant', value: '88%', bar: 88, color: 'bg-purple-500', text: 'text-purple-400' },
      ].map(item => (
        <div key={item.label}>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-gray-400">{item.label}</span>
            <span className={`text-xs font-bold ${item.text}`}>{item.value}</span>
          </div>
          <div className="bg-white/10 rounded-full h-1.5">
            <div className={`${item.color} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${item.bar}%` }} />
          </div>
        </div>
      ))}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2 mt-2">
        <CheckCircle2 className="w-5 h-5 text-green-400" />
        <span className="text-sm text-green-300 font-semibold">Dossier validé — Risque faible</span>
      </div>
    </div>
  );
}

function TrackingMockup() {
  const steps = [
    { label: 'Déclaré', done: true, current: false, date: '12/03 · 09:30' },
    { label: 'Documents', done: true, current: false, date: '12/03 · 09:45' },
    { label: 'Instruction', done: false, current: true, date: undefined },
    { label: 'Décision', done: false, current: false, date: undefined },
    { label: 'Paiement', done: false, current: false, date: undefined },
  ];
  return (
    <div className="w-full max-w-xs space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Suivi — CLM-2026-701007</p>
      {steps.map((s, i) => (
        <div key={s.label} className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              s.done ? 'bg-green-500' : s.current ? 'bg-blue-500 animate-pulse' : 'bg-white/10 border border-white/20'
            }`}>
              {s.done && <Check className="w-3 h-3 text-white" />}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-px h-6 mt-0.5 ${s.done ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
          <div className="pb-1">
            <span className={`text-sm font-semibold ${s.done ? 'text-green-400' : s.current ? 'text-blue-400' : 'text-gray-500'}`}>
              {s.label}
            </span>
            {s.date && <p className="text-[10px] text-gray-500">{s.date}</p>}
            {s.current && <p className="text-[10px] text-blue-400">En cours...</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentMockup() {
  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40">
        <Banknote className="w-10 h-10 text-emerald-400" />
      </div>
      <div>
        <p className="text-4xl font-black text-white">7 200 MAD</p>
        <p className="text-sm text-emerald-400 mt-1 font-semibold">✅ Virement effectué</p>
      </div>
      <div className="bg-white/5 rounded-2xl p-4 text-left space-y-2">
        {[
          ['Dossier', 'CLM-2026-701007'],
          ['Montant approuvé', '7 200 MAD'],
          ['RIB', '****3421'],
          ['Date', '14/03/2026'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-xs text-gray-500">{k}</span>
            <span className="text-xs text-gray-200 font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepMockup({ mockupType }: StepMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl min-h-90 flex items-center justify-center p-8"
    >
      {mockupType === 'CHATBOT' && <ChatbotMockup />}
      {mockupType === 'UPLOAD' && <UploadMockup />}
      {mockupType === 'AI_SCORE' && <AIScoreMockup />}
      {mockupType === 'TRACKING' && <TrackingMockup />}
      {mockupType === 'PAYMENT' && <PaymentMockup />}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const steps: Step[] = [
    {
      number: '01',
      icon: MessageSquare,
      title: 'Déclarez votre sinistre',
      description: 'En moins de 5 minutes via notre chatbot IA. Guidé étape par étape, sans formulaire complexe. Disponible 24h/24.',
      tag: 'Chatbot IA',
      tagColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      mockupType: 'CHATBOT',
    },
    {
      number: '02',
      icon: Upload,
      title: 'Envoyez vos documents',
      description: 'Photographiez vos documents depuis votre téléphone. Notre IA extrait automatiquement les données utiles.',
      tag: 'OCR Automatique',
      tagColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      mockupType: 'UPLOAD',
    },
    {
      number: '03',
      icon: Bot,
      title: "L'IA analyse votre dossier",
      description: "Score de risque calculé en 30 secondes. Détection d'anomalies, validation des documents, estimation du montant.",
      tag: 'Score en 30s',
      tagColor: 'bg-green-500/20 text-green-400 border border-green-500/30',
      mockupType: 'AI_SCORE',
    },
    {
      number: '04',
      icon: Activity,
      title: 'Suivez en temps réel',
      description: "Notifications à chaque étape. Consultez l'avancement de votre dossier depuis votre espace client à tout moment.",
      tag: 'Temps Réel',
      tagColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      mockupType: 'TRACKING',
    },
    {
      number: '05',
      icon: Banknote,
      title: 'Recevez votre indemnisation',
      description: 'Virement bancaire sous 48h après approbation. Notification SMS et email de confirmation automatique.',
      tag: 'Paiement 48h',
      tagColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      mockupType: 'PAYMENT',
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStep(prev => (prev < steps.length - 1 ? prev + 1 : 0));
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused, activeStep, steps.length]);

  return (
    <section id="comment-ca-marche" className="bg-gray-950 py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Zap className="w-3 h-3" />
            Comment ça marche
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Simple, rapide,{' '}
            <span className="text-blue-400">intelligent.</span>
          </h2>
          <p className="text-gray-400 text-lg mt-4 max-w-xl mx-auto">
            Un processus transparent et automatisé, du sinistre au règlement final.
          </p>
        </div>

        {/* Main Content */}
        <div
          className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left — Stepper */}
          <div className="lg:col-span-2 space-y-1">
            {steps.map((step, index) => (
              <StepItem
                key={step.number}
                step={step}
                index={index}
                isActive={activeStep === index}
                isDone={index < activeStep}
                onClick={() => setActiveStep(index)}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>

          {/* Right — Mockup */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <StepMockup
                key={activeStep}
                mockupType={steps[activeStep].mockupType}
              />
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-base mb-4">
            Prêt à vivre une expérience différente?
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-600/30 hover:shadow-xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
          >
            Commencer maintenant
            <Zap className="w-4 h-4" />
          </button>
          
        </motion.div>

      </div>
    </section>
  );
}