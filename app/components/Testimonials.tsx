'use client';

import { motion } from 'framer-motion';
import { Star, BadgeCheck } from 'lucide-react';

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  initials: string;
  city: string;
  type: string;
  role: 'client' | 'gestionnaire';
  rating: number;
  avatarColor: string;
  amount: string | null;
  days: string | null;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "Accident sur l'autoroute Casa-Rabat en février. Dossier traité en 3 jours. 12,400 MAD remboursés sans une seule visite en agence. Incroyable.",
    name: 'Youssef B.',
    initials: 'YB',
    city: 'Casablanca',
    type: '🚗 Accident automobile',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-blue-600',
    amount: '12,400 MAD',
    days: '3 jours',
  },
  {
    id: 2,
    quote: "Dégât des eaux un vendredi soir. J'ai tout déclaré via le chatbot en 8 minutes. Le gestionnaire m'a appelée le lundi matin. Service impeccable.",
    name: 'Fatima Z.',
    initials: 'FZ',
    city: 'Rabat',
    type: '🏠 Dégât des eaux',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-purple-600',
    amount: null,
    days: '8 minutes',
  },
  {
    id: 3,
    quote: "J'avais peur que ça soit compliqué. 3 photos, 2 documents, et le tour était joué. Remboursé en 48h. Je ne reviens plus en arrière.",
    name: 'Karim M.',
    initials: 'KM',
    city: 'Marrakech',
    type: '🚗 Accident automobile',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-green-600',
    amount: '8,900 MAD',
    days: '48 heures',
  },
  {
    id: 4,
    quote: "Le suivi en temps réel change tout. Je savais exactement où en était mon dossier. Fini les appels au 05 pour avoir des nouvelles.",
    name: 'Nadia R.',
    initials: 'NR',
    city: 'Fès',
    type: '🏥 Assurance santé',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-pink-600',
    amount: null,
    days: null,
  },
  {
    id: 5,
    quote: "L'assistant IA m'a guidé étape par étape. Même ma mère de 62 ans a pu faire sa déclaration toute seule depuis son téléphone.",
    name: 'Hassan A.',
    initials: 'HA',
    city: 'Agadir',
    type: '🚗 Accident automobile',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-orange-600',
    amount: null,
    days: '5 minutes',
  },
  {
    id: 6,
    quote: "Voleur a brisé ma vitre à Guéliz. Photos prises sur place, déclaration faite depuis le parking. Remboursé 2,800 MAD en 2 jours.",
    name: 'Amine K.',
    initials: 'AK',
    city: 'Marrakech',
    type: '🚗 Bris de vitre',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-teal-600',
    amount: '2,800 MAD',
    days: '2 jours',
  },
  {
    id: 7,
    quote: "La recommandation IA réduit mon temps de décision de 40 minutes à 2 minutes par dossier. Je traite 3x plus de dossiers qu'avant.",
    name: 'Mehdi O.',
    initials: 'MO',
    city: 'Casablanca',
    type: '💼 Gestionnaire Senior',
    role: 'gestionnaire',
    rating: 5,
    avatarColor: 'bg-indigo-600',
    amount: null,
    days: '2 min/dossier',
  },
  {
    id: 8,
    quote: "La détection de fraude automatique m'a évité d'approuver un dossier douteux la semaine dernière. L'IA avait vu ce que j'aurais raté.",
    name: 'Salma K.',
    initials: 'SK',
    city: 'Rabat',
    type: '💼 Gestionnaire',
    role: 'gestionnaire',
    rating: 5,
    avatarColor: 'bg-rose-600',
    amount: null,
    days: null,
  },
  {
    id: 9,
    quote: "Mon dossier habitation traité en une semaine. L'expert est venu rapidement et le paiement était sur mon compte 2 jours après. Merci ISM.",
    name: 'Zineb A.',
    initials: 'ZA',
    city: 'Kenitra',
    type: '🏠 Sinistre habitation',
    role: 'client',
    rating: 5,
    avatarColor: 'bg-cyan-600',
    amount: '31,000 MAD',
    days: '7 jours',
  },
  {
    id: 10,
    quote: "Les dashboards analytiques me donnent une vision que je n'avais jamais eue. Je pilote mon équipe avec des données réelles en temps réel.",
    name: 'Omar T.',
    initials: 'OT',
    city: 'Casablanca',
    type: '💼 Manager Senior',
    role: 'gestionnaire',
    rating: 5,
    avatarColor: 'bg-violet-600',
    amount: null,
    days: null,
  },
];

const row1 = testimonials.filter((_, i) => i < 6);
const row2 = testimonials.filter((_, i) => i >= 6);

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-gray-700 text-sm leading-relaxed mb-5 line-clamp-4">
        &ldquo;{item.quote}&rdquo;
      </p>

      {/* Stat pills */}
      {(item.amount || item.days) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {item.amount && (
            <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-bold px-2.5 py-1 rounded-full">
              💰 {item.amount}
            </span>
          )}
          {item.days && (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-full">
              ⏱️ {item.days}
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${item.avatarColor}`}
          >
            {item.initials}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-400">{item.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <BadgeCheck className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] text-blue-500 font-semibold">Vérifié</span>
        </div>
      </div>

      {/* Type tag */}
      <div className="mt-3">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            item.role === 'gestionnaire'
              ? 'bg-indigo-50 text-indigo-600'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item.type}
        </span>
      </div>
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
}: {
  items: Testimonial[];
  direction: 'left' | 'right';
}) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee-container overflow-hidden w-full py-3">
      <div
        className={`flex w-max ${
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        }`}
      >
        {doubled.map((t, i) => (
          <div key={`${t.id}-${i}`} className="pr-5">
            <TestimonialCard item={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="temoignages" className="py-20 sm:py-28 bg-white overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          Témoignages
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
          Ce que disent{' '}
          <span className="text-blue-600">nos assurés</span>
        </h2>
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-gray-900 font-black text-lg">4.9</span>
          <span className="text-gray-400 text-sm">· Plus de 847 avis vérifiés</span>
        </div>
      </div>

      {/* Marquee rows — full width */}
      <div className="space-y-4 mb-16">
        <MarqueeRow items={row1} direction="left" />
        <MarqueeRow items={row2} direction="right" />
      </div>

      {/* Bottom stats bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border border-gray-100 rounded-2xl p-6 bg-gray-50 max-w-2xl mx-auto"
        >
          <div className="grid grid-cols-3 gap-6 text-center divide-x divide-gray-200">
            <div>
              <p className="text-2xl font-black text-gray-900">847+</p>
              <p className="text-xs text-gray-500 mt-0.5">Avis vérifiés</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <p className="text-2xl font-black text-gray-900">4.9</p>
              </div>
              <p className="text-xs text-gray-500">Note moyenne</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">98%</p>
              <p className="text-xs text-gray-500 mt-0.5">Recommandent ISM-Assurance</p>
            </div>
          </div>
          
        </motion.div>
      </div>
    </section>
  );
}