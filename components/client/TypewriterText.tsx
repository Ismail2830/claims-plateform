'use client'

import { useEffect, useState, useRef } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export function TypewriterText({ text, speed = 30, onComplete, className }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0

    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        indexRef.current++
        setDisplayed(text.slice(0, indexRef.current))
        if (indexRef.current >= text.length) {
          clearInterval(interval)
          onCompleteRef.current?.()
        }
      }, speed)
      return () => clearInterval(interval)
    }, 300)

    return () => clearTimeout(delay)
  }, [text, speed])

  return <span className={className}>{displayed}</span>
}
