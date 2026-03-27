import React from 'react'
import {
  Shield, Lock, BadgeCheck, Server, Clock,
  Phone, MessageCircle, Mail, MapPin,
  Linkedin, Facebook, Instagram,
  ArrowRight,
} from 'lucide-react'

const footerLinks = {
  plateforme: {
    title: 'Plateforme',
    links: [
      { label: 'Fonctionnalités',      href: '#fonctionnalites', accent: false },
      { label: 'Comment ça marche',    href: '#comment-ca-marche', accent: false },
      { label: 'Témoignages',          href: '#temoignages', accent: false },
      { label: 'FAQ',                  href: '#faq', accent: false },
      { label: 'Contact',              href: '#contact', accent: false },
      { label: 'Déclarer un sinistre', href: '/auth/login', accent: true },
    ],
  },
  legal: {
    title: 'Légal',
    links: [
      { label: 'Politique de confidentialité',  href: '/confidentialite' },
      { label: "Conditions d'utilisation",      href: '/conditions' },
      { label: 'Mentions légales',              href: '/mentions-legales' },
      { label: 'Protection des données (CNDP)', href: '/cndp' },
      { label: 'Loi 17-99 Assurances',          href: '/loi-assurances' },
    ],
  },
}

const contactItems = [
  {
    icon: Phone,
    label: '0522 XX XX XX',
    sublabel: 'Lun-Ven 8h-18h · Sam 9h-13h',
    href: 'tel:+212522000000',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp Business',
    sublabel: "Réponse en moins d'1h",
    href: 'https://wa.me/212600000000',
  },
  {
    icon: Mail,
    label: 'support@ism-assurance.ma',
    sublabel: null,
    href: 'mailto:support@ism-assurance.ma',
  },
  {
    icon: MapPin,
    label: 'Casablanca, Maroc',
    sublabel: null,
    href: null,
  },
]

const socialLinks = [
  { icon: Linkedin,       label: 'LinkedIn',   href: 'https://linkedin.com/company/ism-assurance', hoverColor: 'hover:bg-blue-600' },
  { icon: Facebook,       label: 'Facebook',   href: 'https://facebook.com/ismassurance',           hoverColor: 'hover:bg-blue-500' },
  { icon: Instagram,      label: 'Instagram',  href: 'https://instagram.com/ismassurance',          hoverColor: 'hover:bg-pink-600' },
  { icon: MessageCircle,  label: 'WhatsApp',   href: 'https://wa.me/212600000000',                  hoverColor: 'hover:bg-green-600' },
]

const trustBadges = [
  { icon: Shield,     text: 'Agréé ACAPS' },
  { icon: Lock,       text: 'SSL 256-bit' },
  { icon: BadgeCheck, text: 'Conforme loi 09-08' },
  { icon: Server,     text: 'Hébergé au Maroc' },
  { icon: Clock,      text: 'Support 24h/24' },
]

export function Footer() {
  return (
    <footer className="bg-gray-950 relative overflow-hidden">

      {/* Top gradient separator line */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-blue-600/60 to-transparent" />

      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">

          {/* ── Column 1: Brand ── */}
          <div className="lg:col-span-1 space-y-6">

            <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black text-white">ISM Assurance</span>
            </a>

            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              La plateforme de gestion de sinistres la plus rapide du Maroc.
              Déclaration en 5 minutes, remboursement sous 48h, assisté par intelligence artificielle.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { emoji: '🛡️', text: 'Agréé ACAPS' },
                { emoji: '🔒', text: 'CNDP' },
                { emoji: '🇲🇦', text: '100% Marocain' },
              ].map(badge => (
                <span
                  key={badge.text}
                  className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] text-gray-400 font-medium"
                >
                  <span>{badge.emoji}</span>
                  {badge.text}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {socialLinks.map(social => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 ${social.hoverColor}`}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                )
              })}
            </div>

            <p className="text-[11px] text-gray-600">🇲🇦 النسخة العربية قريباً</p>

          </div>

          {/* ── Column 2: Plateforme ── */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5">
              Plateforme
            </h3>
            <ul className="space-y-3">
              {footerLinks.plateforme.links.map(link => (
                <li key={link.label}>
                  {link.accent ? (
                    <a
                      href={link.href}
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors group"
                    >
                      {link.label}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors duration-200 block"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Légal ── */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5">
              Légal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.links.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200 block leading-snug"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 4: Contact ── */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5">
              Contact
            </h3>
            <ul className="space-y-4">
              {contactItems.map(item => {
                const Icon = item.icon
                const content = (
                  <div className="flex items-start gap-3 group">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 transition-colors duration-200">
                      <Icon className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.sublabel}</p>
                      )}
                    </div>
                  </div>
                )
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="block"
                      >
                        {content}
                      </a>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

        </div>

        {/* ── Trust Badges Row ── */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {trustBadges.map(badge => {
              const Icon = badge.icon
              return (
                <div key={badge.text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    {badge.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">

          <p className="text-xs text-gray-600 text-center sm:text-left">
            © 2026 ISM Assurance · Tous droits réservés · RC Casablanca
          </p>

          <div className="flex items-center gap-4">
            {[
              { label: 'Confidentialité',  href: '/confidentialite' },
              { label: 'Conditions',       href: '/conditions' },
              { label: 'Mentions légales', href: '/mentions-legales' },
            ].map((link, i, arr) => (
              <React.Fragment key={link.label}>
                <a
                  href={link.href}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors whitespace-nowrap"
                >
                  {link.label}
                </a>
                {i < arr.length - 1 && (
                  <span className="text-gray-700 text-xs">·</span>
                )}
              </React.Fragment>
            ))}
          </div>

        </div>

      </div>
    </footer>
  )
}