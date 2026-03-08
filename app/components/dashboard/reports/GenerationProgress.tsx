'use client';

import { cn } from '@/lib/utils';

interface Step {
  id:    string;
  label: string;
  icon?: string;
}

const STEPS: Step[] = [
  { id: 'fetch',    label: 'Collecte des données',    icon: '🔍' },
  { id: 'generate', label: 'Génération du fichier',   icon: '⚙️' },
  { id: 'save',     label: 'Sauvegarde',              icon: '💾' },
  { id: 'email',    label: 'Envoi par email',         icon: '📧' },
];

export type ProgressStatus = 'idle' | 'running' | 'done' | 'error';

interface Props {
  currentStep: number; // 0-based index
  status:      ProgressStatus;
  hasEmail:    boolean;
}

export function GenerationProgress({ currentStep, status, hasEmail }: Props) {
  const stepsToShow = hasEmail ? STEPS : STEPS.slice(0, 3);

  return (
    <div className="space-y-3">
      {stepsToShow.map((step, idx) => {
        let stepStatus: 'pending' | 'active' | 'done' | 'error';

        if (status === 'error' && idx === currentStep) {
          stepStatus = 'error';
        } else if (idx < currentStep || (status === 'done' && idx <= currentStep)) {
          stepStatus = 'done';
        } else if (idx === currentStep && status === 'running') {
          stepStatus = 'active';
        } else {
          stepStatus = 'pending';
        }

        return (
          <div key={step.id} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all',
                stepStatus === 'done'    && 'bg-green-100 text-green-700',
                stepStatus === 'active'  && 'bg-blue-100 text-blue-700 ring-2 ring-blue-300',
                stepStatus === 'error'   && 'bg-red-100 text-red-700',
                stepStatus === 'pending' && 'bg-gray-100 text-gray-400',
              )}
            >
              {stepStatus === 'done' ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : stepStatus === 'active' ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : stepStatus === 'error' ? (
                '✗'
              ) : (
                step.icon ?? String(idx + 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  stepStatus === 'done'    && 'text-green-700',
                  stepStatus === 'active'  && 'text-blue-700',
                  stepStatus === 'error'   && 'text-red-700',
                  stepStatus === 'pending' && 'text-gray-400',
                )}
              >
                {step.label}
              </p>
            </div>
            {stepStatus === 'active' && (
              <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-blue-100">
                <div className="animate-pulse h-full w-1/2 bg-blue-500 rounded-full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
