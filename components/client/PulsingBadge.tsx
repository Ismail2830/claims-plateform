'use client'

import { useEffect, useState } from 'react'

interface PulsingBadgeProps {
  count: number
}

export function PulsingBadge({ count }: PulsingBadgeProps) {
  const [bouncing, setBouncing] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setBouncing(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (count <= 0) return null

  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${
        bouncing ? 'animate-bounce' : ''
      }`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
