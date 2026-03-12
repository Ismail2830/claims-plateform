'use client'

import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ButtonDef {
  label: string
  emoji: string
  href: string
}

interface GreetingButtonsProps {
  primary: ButtonDef
  secondary: ButtonDef
  onNavigate: () => void
  onPrimaryAction?: () => void
}

export function GreetingButtons({ primary, secondary, onNavigate, onPrimaryAction }: GreetingButtonsProps) {
  const router = useRouter()

  function handlePrimary() {
    if (onPrimaryAction) {
      onPrimaryAction()
    } else {
      onNavigate()
      router.push(primary.href)
    }
  }

  function navigate(href: string) {
    onNavigate()
    router.push(href)
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      {/* Primary */}
      <button
        onClick={handlePrimary}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl py-3 px-4 font-medium flex items-center justify-between transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>{primary.emoji}</span>
          <span className="text-sm">{primary.label}</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </button>

      {/* Secondary */}
      <button
        onClick={() => navigate(secondary.href)}
        className="w-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl py-3 px-4 font-medium flex items-center justify-between transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>{secondary.emoji}</span>
          <span className="text-sm">{secondary.label}</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  )
}
