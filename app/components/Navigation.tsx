'use client'
import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Shield, X, Menu,
  LogIn, FileText,
  ArrowRight,
} from 'lucide-react'

const navLinks = [
  { label: 'Fonctionnalités',    href: '#fonctionnalites',    id: 'fonctionnalites'    },
  { label: 'Comment ça marche',  href: '#comment-ca-marche',  id: 'comment-ca-marche'  },
  { label: 'Témoignages',        href: '#temoignages',        id: 'temoignages'        },
  { label: 'FAQ',                href: '#faq',                id: 'faq'                },
  { label: 'Contact',            href: '#contact',            id: 'contact'            },
]

export function Navigation() {
  const [isScrolled,     setIsScrolled]     = useState(false)
  const [isMobileOpen,   setIsMobileOpen]   = useState(false)
  const [activeSection,  setActiveSection]  = useState('')
  const [isBarDismissed, setIsBarDismissed] = useState(false)

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Active section via IntersectionObserver
  useEffect(() => {
    const sections = ['fonctionnalites', 'comment-ca-marche', 'temoignages', 'faq', 'contact']
    const observers = sections.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { threshold: 0.3 },
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  // Restore bar dismissed state from localStorage
  useEffect(() => {
    if (localStorage.getItem('ism-bar-dismissed')) setIsBarDismissed(true)
  }, [])

  const dismissBar = () => {
    setIsBarDismissed(true)
    localStorage.setItem('ism-bar-dismissed', 'true')
  }

  // Close mobile menu on resize to lg
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* ── ANNOUNCEMENT BAR ──────────────────────────────── */}
      <AnimatePresence>
        {!isBarDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-600 text-white text-xs py-2 px-4 text-center relative"
          >
            <span>
              ✨ Nouveau : Dossiers traités en{' '}
              <strong>48h grâce à l&apos;IA</strong>
              {' '}— 10,000+ assurés satisfaits au Maroc
            </span>
            <a
              href="#comment-ca-marche"
              className="underline font-bold ml-2 hover:text-blue-100 transition-colors"
            >
              En savoir plus →
            </a>
            <button
              onClick={dismissBar}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN NAVBAR ───────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">

            {/* LOGO */}
            <a
              href="#"
              className="flex flex-col items-start shrink-0"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black text-gray-900">ISM Assurance</span>
              </div>
              
            </a>

            {/* NAV LINKS — desktop */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => {
                const isActive = activeSection === link.id
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 rounded-lg group ${
                      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute bottom-1 left-4 right-4 h-0.5 bg-blue-600 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0 group-hover:opacity-60 group-hover:scale-x-100'
                      }`}
                    />
                  </a>
                )
              })}
            </div>

            {/* RIGHT ACTIONS — desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href="/auth/login"
                className="text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors px-3 py-2"
              >
                Connexion
              </a>

              {/* CTA button */}
              <a
                href="/auth/register"
                className="relative bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105"
              >
                {/* Pulse ring */}
                <span className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                Déclarer un sinistre
              </a>
            </div>

            {/* MOBILE HAMBURGER */}
            <button
              onClick={() => setIsMobileOpen(prev => !prev)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

          </div>
        </div>
      </nav>

      {/* ── MOBILE MENU PANEL ─────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden bg-white border-b border-gray-100 overflow-hidden sticky top-16 z-40 shadow-lg"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">

              {/* Nav links */}
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.id}
                  href={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    activeSection === link.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {activeSection === link.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </motion.a>
              ))}

              {/* Divider */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-4 mb-2">
                  Accès rapide
                </p>
              </div>

              {/* Connexion */}
              <motion.a
                href="/auth/login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.3 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-gray-600" />
                </div>
                Connexion
              </motion.a>

              {/* Déclarer */}
              <motion.a
                href="/auth/register"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.35 }}
                className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                Déclarer un sinistre
                <ArrowRight className="w-4 h-4 ml-auto" />
              </motion.a>

              {/* Trust footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center justify-center gap-4 pt-4 pb-2 border-t border-gray-100 mt-2"
              >
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" />
                  Agréé ACAPS
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  🇲🇦 Plateforme Marocaine
                </span>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}