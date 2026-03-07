'use client';

import React, { useState } from 'react';
import { X, Shuffle, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { WorkloadBar } from './WorkloadBar';
import type { BalancePreview } from '../types';

interface RebalanceConfirmModalProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onDone: () => void;
}

type Phase = 'confirm' | 'loading' | 'result';

export function RebalanceConfirmModal({ teamId, teamName, onClose, onDone }: RebalanceConfirmModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [result, setResult] = useState<BalancePreview | null>(null);
  const [serverError, setServerError] = useState('');

  const handleConfirm = async () => {
    setPhase('loading');
    setServerError('');
    try {
      const res = await fetch(`/api/teams/${teamId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        setServerError(data.error ?? 'Erreur lors du rééquilibrage');
        setPhase('confirm');
        return;
      }
      setResult(data.data);
      setPhase('result');
    } catch {
      setServerError('Erreur réseau. Veuillez réessayer.');
      setPhase('confirm');
    }
  };

  const handleClose = () => {
    if (phase === 'result') onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={phase !== 'loading' ? handleClose : undefined} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${phase === 'result' ? 'bg-green-100' : 'bg-orange-100'}`}>
                {phase === 'result' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Shuffle className="w-5 h-5 text-orange-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {phase === 'result' ? 'Rééquilibrage terminé' : 'Rééquilibrer la charge'}
                </h2>
                <p className="text-xs text-gray-400">{teamName}</p>
              </div>
            </div>
            {phase !== 'loading' && (
              <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="px-6 py-5">
            {/* Loading */}
            {phase === 'loading' && (
              <div className="flex flex-col items-center py-10 space-y-4">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Rééquilibrage en cours...</p>
                <p className="text-xs text-gray-400">Attribution des dossiers non assignés aux membres</p>
              </div>
            )}

            {/* Confirm */}
            {phase === 'confirm' && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Cette action va redistribuer les dossiers</p>
                    <p className="text-orange-700">
                      Les dossiers non assignés correspondant aux types de sinistres de cette équipe seront
                      répartis automatiquement entre les membres actifs selon la méthode round-robin.
                    </p>
                  </div>
                </div>
                {serverError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {serverError}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {phase === 'result' && result && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="text-sm text-green-800">
                    <span className="font-semibold">{result.redistributed}</span> dossier(s) redistribué(s)
                  </div>
                </div>

                {result.members.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Nouvelle distribution :</p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Membre</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Avant</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Après</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Charge</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {result.members.map((m, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{m.name}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{m.before}</td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`font-medium ${m.after > m.before ? 'text-blue-600' : 'text-gray-700'}`}
                                >
                                  {m.after}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <WorkloadBar
                                  current={m.after}
                                  max={m.maxClaims ?? 20}
                                  size="sm"
                                  showText={false}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
            {phase === 'confirm' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <Shuffle className="w-4 h-4" />
                    <span>Rééquilibrer</span>
                  </span>
                </button>
              </>
            )}
            {phase === 'result' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
