"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { wakeApi } from "@/lib/api"

// Fixed star field (hardcoded so SSR and client markup match — no hydration drift).
const STARS = [
  { cx: 60, cy: 40, r: 1.2 }, { cx: 140, cy: 70, r: 0.9 }, { cx: 220, cy: 30, r: 1.1 },
  { cx: 300, cy: 60, r: 0.8 }, { cx: 380, cy: 25, r: 1.3 }, { cx: 470, cy: 55, r: 1 },
  { cx: 540, cy: 35, r: 0.9 }, { cx: 620, cy: 65, r: 1.2 }, { cx: 700, cy: 30, r: 1 },
  { cx: 110, cy: 110, r: 0.8 }, { cx: 250, cy: 100, r: 1 }, { cx: 410, cy: 95, r: 0.9 },
  { cx: 560, cy: 110, r: 1.1 }, { cx: 680, cy: 100, r: 0.8 }, { cx: 30, cy: 80, r: 1 },
  { cx: 730, cy: 70, r: 1.1 },
]

/** Stylized NYC skyline — Statue of Liberty, Empire State, Chrysler, One WTC + city. */
function CitySkyline({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      {/* Statue of Liberty */}
      <rect x="44" y="332" width="56" height="28" />
      <rect x="56" y="300" width="32" height="32" />
      <polygon points="60,300 84,300 80,236 64,236" />
      <circle cx="72" cy="226" r="7" />
      {/* crown spikes */}
      <path d="M57,224 L61,209 L65,222 L69,206 L72,221 L75,206 L79,222 L83,209 L87,224 Z" />
      {/* raised arm + torch */}
      <polygon points="82,238 88,238 99,200 93,198" />
      <path d="M96,198 q-6,-11 0,-18 q6,7 0,18 Z" />

      {/* Left buildings */}
      <rect x="120" y="250" width="30" height="110" />
      <rect x="128" y="240" width="4" height="12" />
      <rect x="154" y="214" width="24" height="146" />

      {/* Empire State Building */}
      <rect x="200" y="150" width="46" height="210" />
      <rect x="210" y="124" width="26" height="30" />
      <rect x="218" y="92" width="10" height="34" />
      <rect x="221" y="62" width="3" height="32" />

      {/* mid buildings */}
      <rect x="256" y="226" width="26" height="134" />
      <rect x="286" y="196" width="30" height="164" />

      {/* Chrysler-style spire */}
      <rect x="332" y="160" width="36" height="200" />
      <polygon points="332,160 350,118 368,160" />
      <rect x="349" y="96" width="2" height="26" />

      <rect x="378" y="232" width="24" height="128" />
      <rect x="406" y="204" width="30" height="156" />

      {/* One World Trade — tapered */}
      <polygon points="452,360 492,360 484,108 460,108" />
      <rect x="470" y="70" width="3" height="40" />

      {/* right buildings */}
      <rect x="502" y="220" width="28" height="140" />
      <rect x="534" y="190" width="34" height="170" />
      <rect x="544" y="178" width="4" height="12" />
      <rect x="574" y="240" width="26" height="120" />
      <rect x="604" y="206" width="32" height="154" />
      <rect x="642" y="248" width="24" height="112" />
      <rect x="670" y="222" width="30" height="138" />
      <rect x="704" y="252" width="22" height="108" />
    </g>
  )
}

export function LoadingScreen() {
  const [mounted, setMounted] = useState(true)
  const [progress, setProgress] = useState(0) // 0..1
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<"loading" | "done" | "failed">("loading")
  const [runId, setRunId] = useState(0)

  const loadedRef = useRef(false)
  const failedRef = useRef(false)

  // Wake the API + drive the fill. Progress creeps toward 90% while waiting,
  // then races to 100% once the server actually answers.
  useEffect(() => {
    loadedRef.current = false
    failedRef.current = false
    setPhase("loading")
    setProgress(0)

    wakeApi()
      .then(() => {
        // Small floor so a warm server doesn't flash by jarringly.
        setTimeout(() => { loadedRef.current = true }, 500)
      })
      .catch(() => {
        failedRef.current = true
        setPhase("failed")
      })

    let raf = 0
    let t0 = 0
    const tick = (ts: number) => {
      if (failedRef.current) return
      if (!t0) t0 = ts
      const t = (ts - t0) / 1000
      setElapsed(Math.floor(t))
      setProgress((prev) => {
        if (loadedRef.current) {
          const np = prev + (1 - prev) * 0.06
          return np > 0.999 ? 1 : np
        }
        const target = 0.9 * (1 - Math.exp(-t / 16))
        return prev > target ? prev : target
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [runId])

  // Once the fill completes, hold a beat then dismiss.
  useEffect(() => {
    if (progress >= 1 && phase === "loading") setPhase("done")
  }, [progress, phase])

  useEffect(() => {
    if (phase !== "done") return
    const t = setTimeout(() => setMounted(false), 850)
    return () => clearTimeout(t)
  }, [phase])

  if (!mounted) return null

  const fillTopY = 360 * (1 - progress)
  const pct = Math.round(progress * 100)
  const showSurge = progress > 0.02 && progress < 0.999

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0f1f] via-[#0c1326] to-[#0e1830] px-6 transition-opacity duration-700 ${
        phase === "done" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Aurora wash */}
      <div className="pointer-events-none absolute inset-0 opacity-40 aurora" aria-hidden />

      <div className="relative w-full max-w-2xl">
        <svg viewBox="0 0 760 360" className="w-full drop-shadow-2xl" role="img" aria-label="New York City skyline loading">
          <defs>
            <linearGradient id="cityFill" x1="0" y1="360" x2="0" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fb923c" />
              <stop offset="0.45" stopColor="#f97316" />
              <stop offset="0.72" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
            <clipPath id="rise">
              <rect x="0" y={fillTopY} width="760" height={360 - fillTopY} />
            </clipPath>
            <filter id="cityGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stars */}
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill="#cbd5e1"
              className="animate-twinkle"
              style={{ animationDelay: `${(i % 5) * 0.4}s` }}
            />
          ))}

          {/* Unlit skyline */}
          <CitySkyline fill="#33415a" />

          {/* Lit skyline, revealed bottom-up by the rising clip */}
          <g clipPath="url(#rise)" filter="url(#cityGlow)">
            <CitySkyline fill="url(#cityFill)" />
          </g>

          {/* Surging glow line at the waterline */}
          {showSurge && (
            <rect
              x="0"
              y={fillTopY - 2}
              width="760"
              height="4"
              fill="#ffd9a8"
              filter="url(#cityGlow)"
              className="animate-surge"
            />
          )}

          {/* Always-lit torch beacon */}
          <path d="M96,198 q-6,-11 0,-18 q6,7 0,18 Z" fill="#fbbf24" filter="url(#cityGlow)" />
        </svg>

        {/* Copy */}
        <div className="mt-8 text-center">
          {phase === "failed" ? (
            <>
              <h2 className="font-display text-2xl font-bold text-white">The city&apos;s still asleep</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                The demo server runs on a free tier that sleeps when idle and didn&apos;t wake in
                time. One more try usually does it.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setRunId((r) => r + 1)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.03]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Wake it up
                </button>
                <button
                  onClick={() => setMounted(false)}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  Continue anyway →
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Lighting up New York
                <span className="text-primary">.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                Heads up: this demo runs on a <span className="font-medium text-slate-200">free tier</span>{" "}
                that sleeps when idle, so the first load wakes the server — usually 30–60s. The skyline
                fills as it comes online.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3 font-mono text-xs text-slate-500">
                <span className="tabular-nums">{pct}%</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span className="tabular-nums">{elapsed}s</span>
              </div>
              {elapsed >= 8 && phase === "loading" && (
                <button
                  onClick={() => setMounted(false)}
                  className="mt-5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  Skip intro →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
