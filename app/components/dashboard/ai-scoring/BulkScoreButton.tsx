'use client';

import { useState } from 'react';
import { Zap, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkScoreResult {
  scored:      number;
  failed:      number;
  duration_ms: number;
}

interface BulkScoreButtonProps {
  unscoredCount: number;
  onComplete?:   (result: BulkScoreResult) => void;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function BulkScoreButton({ unscoredCount, onComplete }: BulkScoreButtonProps) {
  const [state,  setState]  = useState<ButtonState>('idle');
  const [result, setResult] = useState<BulkScoreResult | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const handleClick = async () => {
    if (unscoredCount === 0 || state === 'loading') return;
    setState('loading');
    setResult(null);
    setErrMsg('');

    try {
      const res = await fetch('/api/ai-scoring/score-all', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `Erreur HTTP ${res.status}`);
      }

      const data = (await res.json()) as BulkScoreResult;
      setResult(data);
      setState('success');
      onComplete?.(data);

      // Reset to idle after 6 seconds
      setTimeout(() => setState('idle'), 6000);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  };

  const isDisabled = unscoredCount === 0 || state === 'loading';

  return (
    <div className="flex flex-col items-end space-y-1">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm',
          state === 'success'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : state === 'error'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700',
          isDisabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {state === 'loading' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Scoring en cours…</span>
          </>
        ) : state === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Terminé !</span>
          </>
        ) : state === 'error' ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Échec</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>Scorer {unscoredCount > 0 ? `${unscoredCount} dossier${unscoredCount > 1 ? 's' : ''}` : 'tous les dossiers'}</span>
          </>
        )}
      </button>

      {state === 'success' && result && (
        <p className="text-xs text-green-600 font-medium">
          ✅ {result.scored} scoré{result.scored > 1 ? 's' : ''} en {(result.duration_ms / 1000).toFixed(1)}s
          {result.failed > 0 && ` · ${result.failed} échec${result.failed > 1 ? 's' : ''}`}
        </p>
      )}
      {state === 'error' && (
        <p className="text-xs text-red-600 font-medium">⚠️ {errMsg}</p>
      )}
    </div>
  );
}
