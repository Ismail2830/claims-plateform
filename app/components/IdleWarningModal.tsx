'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

const WARN_AFTER_MS   = 28 * 60 * 1000; // Show warning at 28 min
const COUNTDOWN_SECS  = 2 * 60;          // 2-min countdown before auto-logout
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart'] as const;

interface IdleWarningModalProps {
  onStayConnected?: () => void;
  onLogout?: () => void;
}

export default function IdleWarningModal({ onStayConnected, onLogout }: IdleWarningModalProps) {
  const [show, setShow]       = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    setShow(false);
    setCountdown(COUNTDOWN_SECS);
    if (cdRef.current) clearInterval(cdRef.current);
    onStayConnected?.();
  }, [onStayConnected]);

  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(warnTimer);
      if (!show) {
        warnTimer = setTimeout(() => setShow(true), WARN_AFTER_MS);
      }
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(warnTimer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [show]);

  // Start countdown when modal appears
  useEffect(() => {
    if (!show) return;
    setCountdown(COUNTDOWN_SECS);

    cdRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(cdRef.current!);
          onLogout?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(cdRef.current!);
  }, [show, onLogout]);

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="font-bold text-lg text-gray-900 mb-2">Session sur le point d'expirer</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Vous serez déconnecté automatiquement pour inactivité dans
            </p>
            <div className="text-3xl font-bold text-orange-500 mb-5">
              {mins}:{secs}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { onLogout?.(); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Se déconnecter
              </button>
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Rester connecté
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
