'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Activity, Upload, MessageCircle, Layers,
  CheckCircle2, ArrowRight,
} from 'lucide-react';

type FeatureId = 'chatbot' | 'tracking' | 'documents' | 'messaging';

interface Feature {
  id: FeatureId;
  featured: boolean;
  badge: string | null;
  badgeColor?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  gradient: string;
  border: string;
  number: string;
  title: string;
  description: string;
  tag: string | null;
  tagColor: string | null;
}

export function Features() {
  const features: Feature[] = [
    {
      id: 'chatbot',
      featured: true,
      badge: 'IA',
      badgeColor: 'bg-purple-100 text-purple-700',
      icon: Bot,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      gradient: 'from-purple-50 to-violet-50',
      border: 'border-purple-200/60',
      number: '01',
      title: 'Assistant IA de Déclaration',
      description: 'Déclarez votre sinistre en moins de 5 minutes grâce à notre chatbot intelligent. Il vous guide étape par étape et analyse vos documents automatiquement.',
      tag: 'Exclusif ISM',
      tagColor: 'bg-purple-600 text-white',
    },
    {
      id: 'tracking',
      featured: false,
      badge: null,
      icon: Activity,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      gradient: 'from-blue-50 to-sky-50',
      border: 'border-blue-200/60',
      number: '02',
      title: 'Suivi en Temps Réel',
      description: 'Suivez chaque étape de votre dossier en direct. Notifications instantanées à chaque avancement.',
      tag: 'Nouveau',
      tagColor: 'bg-green-100 text-green-700',
    },
    {
      id: 'documents',
      featured: false,
      badge: null,
      icon: Upload,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-200/60',
      number: '03',
      title: 'Upload de Documents',
      description: 'Envoyez vos photos, constats et pièces justificatives depuis votre téléphone en quelques secondes.',
      tag: null,
      tagColor: null,
    },
    {
      id: 'messaging',
      featured: false,
      badge: null,
      icon: MessageCircle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      gradient: 'from-orange-50 to-amber-50',
      border: 'border-orange-200/60',
      number: '04',
      title: 'Messagerie Directe',
      description: 'Échangez directement avec votre gestionnaire assigné sans passer par le standard téléphonique.',
      tag: null,
      tagColor: null,
    },
  ];

  const featuredFeature = features.find(f => f.featured)!;
  const smallFeatures = features.filter(f => !f.featured);

  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Layers className="w-3 h-3" />
            Fonctionnalités
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Tout ce dont vous avez{' '}
            <span className="text-blue-600">besoin</span>
          </h2>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Des outils intelligents pensés pour vous, de la déclaration initiale au règlement final.
          </p>
        </div>

        {/* Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
            <div className="grid lg:grid-cols-5 gap-5">

              {/* Big Featured Card */}
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`lg:col-span-3 relative rounded-3xl border bg-linear-to-br p-8 overflow-hidden cursor-default ${featuredFeature.gradient} ${featuredFeature.border}`}
              >
                <span className="absolute top-6 right-6 text-5xl font-black text-black/5 select-none">
                  {featuredFeature.number}
                </span>

                {featuredFeature.tag && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mb-4 ${featuredFeature.tagColor}`}>
                    {featuredFeature.tag}
                  </span>
                )}

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${featuredFeature.iconBg}`}>
                  {React.createElement(featuredFeature.icon, {
                    className: `w-7 h-7 ${featuredFeature.iconColor}`,
                  })}
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  {featuredFeature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-base max-w-sm">
                  {featuredFeature.description}
                </p>

                {featuredFeature.id === 'chatbot' && (
                  <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-blue-50 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-gray-700 max-w-xs">
                        Quel type de sinistre souhaitez-vous déclarer?
                      </div>
                    </div>
                    <div className="flex gap-2 ml-10">
                      {['🚗 Auto', '🏠 Habitation', '🏥 Santé'].map(t => (
                        <span key={t} className="bg-white border border-gray-200 rounded-full px-2.5 py-1 text-xs text-gray-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}


              </motion.div>

              {/* Small Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
                {smallFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -3 }}
                    className={`relative rounded-2xl border bg-linear-to-br p-6 overflow-hidden cursor-default transition-shadow duration-200 hover:shadow-md ${feature.gradient} ${feature.border}`}
                  >
                    <span className="absolute top-4 right-4 text-3xl font-black text-black/5 select-none">
                      {feature.number}
                    </span>

                    {feature.tag && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${feature.tagColor}`}>
                        {feature.tag}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${feature.iconBg}`}>
                      {React.createElement(feature.icon, {
                        className: `w-5 h-5 ${feature.iconColor}`,
                      })}
                    </div>

                    <h3 className="text-base font-black text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

            </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-base mb-4">
            Prêt à moderniser votre gestion de sinistres?
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
          >
            Démarrer maintenant
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}