"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Eases a number from 0 to `target` once `start` becomes true (typically when
 * the stat scrolls into view). Cubic ease-out for a confident, settling feel.
 */
export function useCountUp(
  target: number,
  { duration = 1600, start = true }: { duration?: number; start?: boolean } = {},
) {
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!start || startedRef.current) return
    startedRef.current = true

    let raf = 0
    let t0 = 0
    const tick = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])

  return value
}
