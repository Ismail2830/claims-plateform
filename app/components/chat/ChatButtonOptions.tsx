'use client'

import { useState } from 'react'

interface ButtonOption {
  label: string
  value: string
  emoji: string
}

interface Props {
  options: ButtonOption[]
  onSelect: (value: string, label: string) => void
  disabled?: boolean
}

export default function ChatButtonOptions({ options, onSelect, disabled = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleClick(value: string, label: string) {
    if (disabled || selected) return
    setSelected(value)
    onSelect(value, label)
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 ml-10">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value, opt.label)}
          disabled={disabled || selected !== null}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all
            ${
              selected === opt.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : selected !== null
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
            }
          `}
        >
          <span>{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
