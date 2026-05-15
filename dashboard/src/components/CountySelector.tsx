"use client"
// components/CountySelector.tsx
import { useState, useEffect, useRef } from "react"
import { ChevronDown, Search } from "lucide-react"
import type { County, Region } from "@/lib/types"
import { REGION_COLOR } from "@/lib/types"

interface Props {
  counties: County[]
  value: string
  onChange: (county: string) => void
  label?: string
}

export default function CountySelector({ counties, value, onChange, label = "County" }: Props) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState("")
  const ref                   = useRef<HTMLDivElement>(null)

  // Group by region
  const grouped = (["NYC", "Suburban", "Upstate"] as Region[]).map(region => ({
    region,
    items: counties
      .filter(c => c.region === region)
      .filter(c => c.county.toLowerCase().includes(query.toLowerCase())),
  })).filter(g => g.items.length > 0)

  const selected = counties.find(c => c.county === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <p className="section-label">{label}</p>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          transition: "border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selected && (
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: REGION_COLOR[selected.region],
              flexShrink: 0,
            }} />
          )}
          {selected ? `${selected.county} (${selected.region})` : "Select a county…"}
        </span>
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          zIndex: 50,
          maxHeight: 320,
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
        }}>
          {/* Search */}
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            position: "sticky",
            top: 0,
            background: "var(--bg-elevated)",
          }}>
            <Search size={12} color="var(--text-muted)" />
            <input
              autoFocus
              placeholder="Search counties…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                width: "100%",
              }}
            />
          </div>

          {/* Grouped list */}
          {grouped.map(({ region, items }) => (
            <div key={region}>
              <div style={{
                padding: "8px 12px 4px",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: REGION_COLOR[region as Region],
                fontWeight: 500,
              }}>
                {region}
              </div>
              {items.map(c => (
                <button
                  key={c.county}
                  onClick={() => { onChange(c.county); setOpen(false); setQuery("") }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px 8px 24px",
                    background: c.county === value ? "var(--accent-dim)" : "none",
                    border: "none",
                    color: c.county === value ? "var(--accent)" : "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (c.county !== value) e.currentTarget.style.background = "var(--bg-card)"
                  }}
                  onMouseLeave={e => {
                    if (c.county !== value) e.currentTarget.style.background = "none"
                  }}
                >
                  {c.county}
                </button>
              ))}
            </div>
          ))}

          {grouped.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              No counties match "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
