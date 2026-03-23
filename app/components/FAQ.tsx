'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HelpCircle, MessageSquare, Clock, Shield,
  Smartphone, Banknote, AlertCircle, FileText,
  BadgeCheck, ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Faq {
  id: number;
  category: string;
  categoryColor: string;
  icon: LucideIcon;
  question: string;
  answer: string;
}

const faqs: Faq[] = [
  {
    id: 1,
    category: 'Déclaration',
    categoryColor: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: MessageSquare,
    question: 'ISM Assurance remplace-t-il mon assureur actuel?',
    answer:
      "Non, pas du tout. ISM Assurance est une plateforme numérique de gestion de sinistres. Vous conservez votre compagnie d'assurance actuelle. Nous simplifions uniquement le processus de déclaration et de suivi entre vous et votre assureur.",
  },
  {
    id: 2,
    category: 'Déclaration',
    categoryColor: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Clock,
    question: 'Combien de temps prend une déclaration de sinistre?',
    answer:
      'En moyenne 5 minutes via notre assistant IA disponible 24h/24, 7j/7. Il vous guide étape par étape : type de sinistre, photos, documents. Pas besoin de vous déplacer en agence ni d\'appeler un conseiller.',
  },
  {
    id: 3,
    category: 'Sécurité',
    categoryColor: 'bg-green-50 text-green-600 border-green-200',
    icon: Shield,
    question: 'Mes documents et données personnelles sont-ils sécurisés?',
    answer:
      'Oui, entièrement. Toutes vos données sont chiffrées via SSL/TLS et hébergées au Maroc. ISM Assurance est conforme à la loi 09-08 relative à la protection des données personnelles (CNDP). Vos documents ne sont jamais partagés sans votre consentement.',
  },
  {
    id: 4,
    category: 'Suivi',
    categoryColor: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: Smartphone,
    question: 'Puis-je suivre mon dossier depuis mon téléphone?',
    answer:
      'Oui. La plateforme ISM est 100% responsive et fonctionne sur tout smartphone Android ou iOS, sans téléchargement d\'application. Connectez-vous depuis votre navigateur et consultez l\'avancement de votre dossier à tout moment, où que vous soyez.',
  },
  {
    id: 5,
    category: 'Remboursement',
    categoryColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    icon: Banknote,
    question: 'En combien de temps vais-je être remboursé?',
    answer:
      "Les dossiers simples sont approuvés sous 48 à 72 heures. Le virement en MAD est effectué dans les 2 jours ouvrés suivant l'approbation. Vous recevez une notification SMS et email à chaque étape, y compris à la confirmation du virement.",
  },
  {
    id: 6,
    category: 'Remboursement',
    categoryColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    icon: AlertCircle,
    question: 'Que se passe-t-il si mon dossier est rejeté?',
    answer:
      'Vous recevez un rapport détaillé expliquant les motifs du rejet. Depuis votre espace client, vous pouvez contester la décision et soumettre des documents complémentaires. Un gestionnaire humain réexamine chaque contestation sous 48h.',
  },
  {
    id: 7,
    category: 'Documents',
    categoryColor: 'bg-orange-50 text-orange-600 border-orange-200',
    icon: FileText,
    question: 'Quels documents dois-je fournir pour déclarer?',
    answer:
      "Cela dépend du type de sinistre. Pour un accident automobile : constat amiable, photos des dégâts, permis de conduire, carte grise. Pour habitation : photos des dommages, factures si disponibles. Notre IA vous indique exactement ce qu'il faut selon votre déclaration.",
  },
  {
    id: 8,
    category: 'Conformité',
    categoryColor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    icon: BadgeCheck,
    question: "ISM Assurance est-elle agréée par l'ACAPS?",
    answer:
      "Oui. ISM Assurance opère en conformité avec la réglementation de l'Autorité de Contrôle des Assurances et de la Prévoyance Sociale (ACAPS) et respecte la loi 17-99 portant code des assurances au Maroc.",
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<number | null>(1);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-20 sm:py-28 bg-gray-50 overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3 h-3" />
            Questions fréquentes
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Vous avez des{' '}
            <span className="text-blue-600">questions?</span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
            Tout ce que vous devez savoir avant de déclarer votre sinistre avec ISM Assurance.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            const Icon = faq.icon;
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <div
                  className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
                    isOpen
                      ? 'border-blue-200 shadow-md shadow-blue-50'
                      : 'border-gray-100 shadow-sm hover:border-gray-200'
                  }`}
                >
                  {/* Question row */}
                  <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-colors duration-200 ${
                        isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Question */}
                    <span
                      className={`flex-1 text-sm sm:text-base font-bold transition-colors duration-200 pr-2 ${
                        isOpen ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {faq.question}
                    </span>

                    {/* Category badge — desktop only */}
                    <span
                      className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${faq.categoryColor}`}
                    >
                      {faq.category}
                    </span>

                    {/* Chevron */}
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Animated answer */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pl-19">
                          <p className="text-gray-500 text-sm leading-relaxed">
                            {faq.answer}
                          </p>
                          {faq.id === 8 && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Vous ne trouvez pas votre réponse?{' '}
                              <a
                                href="mailto:support@ism-assurance.ma"
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                Contactez-nous
                              </a>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom help card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-gray-900 font-bold text-base">Vous avez une autre question?</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Notre équipe vous répond en moins de 2 heures pendant les jours ouvrés.
          </p>
          <a
            href="mailto:support@ism-assurance.ma"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-blue-200"
          >
            <MessageSquare className="w-4 h-4" />
            Contacter le support
          </a>
        </motion.div>

      </div>
    </section>
  );
}
