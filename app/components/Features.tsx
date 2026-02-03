import React from 'react';
import { motion } from 'framer-motion';
import { FileText, BrainCircuit, Clock, BarChart3, Users, Globe } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Déclaration Multi-étapes",
      description: "Un parcours utilisateur fluide pour uploader vos photos, documents et témoignages en quelques minutes.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: <BrainCircuit className="w-6 h-6" />,
      title: "Scoring de Risque IA",
      description: "Analyse automatique des documents pour évaluer le risque de fraude et accélérer les dossiers légitimes.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Suivi Temps Réel",
      description: "Ne restez plus dans le noir. Recevez des notifications à chaque étape de l'avancement de votre dossier.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Dashboards Analytiques",
      description: "Pour les gestionnaires : visualisez les tendances, les pics de sinistres et la performance opérationnelle.",
      color: "bg-amber-100 text-amber-600"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestion des Rôles",
      description: "Espaces dédiés pour les clients, les gestionnaires et les experts tiers avec accès sécurisés.",
      color: "bg-rose-100 text-rose-600"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-dispositifs",
      description: "Accédez à votre dossier depuis votre smartphone sur les lieux de l'accident ou depuis votre ordinateur.",
      color: "bg-cyan-100 text-cyan-600"
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 tracking-tight">Une plateforme complète pour tous les acteurs</h2>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">Conçue pour accélérer chaque étape du processus, de la déclaration initiale au règlement final.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-neutral-100 bg-white hover:shadow-xl hover:shadow-neutral-100 transition-all"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{feature.title}</h3>
              <p className="text-neutral-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}