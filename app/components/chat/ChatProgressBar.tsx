'use client'

interface Props {
  steps: string[]
  currentStep: string
  claimType: string
}

const TYPE_EMOJI: Record<string, string> = {
  AUTO: '🚗',
  HABITATION: '🏠',
  SANTE: '🏥',
  VIE: '👤',
}

export default function ChatProgressBar({ steps, currentStep, claimType }: Props) {
  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center gap-1 py-2 px-4 overflow-x-auto scrollbar-none">
      <span className="text-base mr-1">{TYPE_EMOJI[claimType] ?? '📋'}</span>
      {steps.map((step, i) => {
        const isActive = step === currentStep
        const isCompleted = i < currentIndex

        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`h-2 rounded-full transition-all ${
                isCompleted
                  ? 'bg-blue-400'
                  : isActive
                  ? 'bg-blue-600 w-6'
                  : 'bg-gray-200'
              } ${isActive ? 'w-6' : 'w-3'}`}
            />
          </div>
        )
      })}
    </div>
  )
}
