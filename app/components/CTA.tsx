import { motion } from 'framer-motion';
import {
  Rocket, User, ArrowRight,
  ShieldCheck, Lock, MapPin, BadgeCheck, Clock,
} from 'lucide-react';

interface CTAProps {
  onStart?: (role: 'client' | 'gestionnaire') => void;
}

export function CTA({ onStart }: CTAProps) {
  const handleStart = (role: 'client' | 'gestionnaire') => {
    if (onStart) {
      onStart(role);
    } else {
      window.location.href = '/auth/login';
    }
  };

  const trustItems = [
    { icon: ShieldCheck, text: 'Agréé ACAPS' },
    { icon: Lock,        text: 'Données chiffrées SSL' },
    { icon: MapPin,      text: 'Hébergé au Maroc' },
    { icon: BadgeCheck,  text: 'Conforme loi 17-99' },
    { icon: Clock,       text: 'Support 24h/24' },
  ] as const;

  return (
    <section className="py-20 sm:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gray-950 p-8 sm:p-12 lg:p-16">

          {/* Background decorations */}
          <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 w-80 h-80 bg-indigo-500 rounded-full blur-[120px] opacity-15" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Header */}
          <div className="relative z-10 text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Rocket className="w-3 h-3" />
              Commencez dès aujourd&apos;hui
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Prêt à moderniser votre{' '}
              <span className="text-blue-400">gestion de sinistres?</span>
            </h2>
            <p className="text-gray-400 text-lg mt-4 max-w-xl mx-auto">
              Rejoignez les 10,000+ assurés et gestionnaires qui ont déjà choisi ISM Assurance.
            </p>
          </div>

          {/* Client card */}
          <div className="relative z-10 max-w-md mx-auto">

            {/* Card 1 — Client */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-blue-600 rounded-2xl p-8 flex flex-col relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-linear-to-br from-blue-500 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <User className="w-6 h-6 text-white" />
                </div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
                  Vous êtes un assuré
                </p>
                <h3 className="text-2xl font-black text-white mb-3">
                  Déclarez votre sinistre en 5 minutes
                </h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-8">
                  Guidé par notre IA, sans paperasse, sans déplacement. Disponible 24h/24, 7j/7. Remboursement sous 48h.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {['✅ Chatbot IA', '✅ Suivi temps réel', '✅ Paiement 48h'].map((f) => (
                    <span key={f} className="bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleStart('client')}
                  className="w-full bg-white text-blue-600 font-black py-4 rounded-xl text-base hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg mt-auto"
                >
                  Accès Client
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-blue-200 text-xs text-center mt-3">
                  Gratuit · Sans engagement · Inscription en 2 min
                </p>
              </div>
            </motion.div>

          </div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative z-10 mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
          >
            {trustItems.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Icon className="w-3.5 h-3.5 text-blue-400" />
                {text}
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
}