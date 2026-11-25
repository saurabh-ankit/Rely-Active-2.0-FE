import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/** Splits "₹1.2L" → ['₹', '1.2', 'L']. Only text with exactly one number is animated ("4h 30m" is shown as-is). */
function parse(text: string) {
  const numbers = text.match(/\d[\d,]*(\.\d+)?/g)
  if (!numbers || numbers.length !== 1) return null
  const raw = numbers[0]!
  const at = text.indexOf(raw)
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value)) return null
  return {
    prefix: text.slice(0, at),
    suffix: text.slice(at + raw.length),
    value,
    decimals: raw.split('.')[1]?.length ?? 0,
    grouped: raw.includes(','),
  }
}

/**
 * Counts a formatted figure up from 0 on mount, and from the old to the new figure when it changes.
 * The final frame always renders the original text exactly, so formatting (lakh commas, ₹, %, L/Cr) is never altered.
 */
export function CountUp({ text, duration = 0.9 }: { text: string; duration?: number }) {
  const parsed = parse(text)
  const reduceMotion = useReducedMotion()
  // Last figure on screen: the next animation (or a StrictMode re-run) continues from here.
  const shownRef = useRef(0)
  // Start at 0 so the first paint doesn't flash the final figure before counting.
  const [frame, setFrame] = useState<number | null>(() => (parsed && !reduceMotion ? 0 : null))
  const target = parsed?.value

  useEffect(() => {
    if (target === undefined || reduceMotion) {
      if (target !== undefined) shownRef.current = target
      return
    }
    const controls = animate(shownRef.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        shownRef.current = v
        setFrame(v)
      },
      onComplete: () => {
        shownRef.current = target
        setFrame(null)
      },
    })
    return () => controls.stop()
  }, [target, duration, reduceMotion])

  if (!parsed || frame === null || reduceMotion) return <>{text}</>

  const n = parsed.decimals ? frame.toFixed(parsed.decimals) : String(Math.round(frame))
  const shown = parsed.grouped
    ? Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
      })
    : n
  return (
    <>
      {parsed.prefix}
      {shown}
      {parsed.suffix}
    </>
  )
}
