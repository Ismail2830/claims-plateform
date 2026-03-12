'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'

interface SoundToggleProps {
  isMuted: boolean
  onToggle: () => void
}

export function SoundToggle({ isMuted, onToggle }: SoundToggleProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-500 transition-colors text-white"
        aria-label={isMuted ? 'Activer le son' : 'Désactiver le son'}
      >
        {isMuted
          ? <VolumeX className="w-4 h-4" />
          : <Volume2 className="w-4 h-4" />
        }
      </button>
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 text-[10px] bg-gray-900 text-white rounded whitespace-nowrap pointer-events-none">
          {isMuted ? 'Activer le son' : 'Désactiver le son'}
        </div>
      )}
    </div>
  )
}
