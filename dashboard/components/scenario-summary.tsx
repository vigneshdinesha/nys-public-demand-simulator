import type { SimulationResult, Region } from "@/lib/types"
import { MapPin, Calendar, TrendingUp, Users } from "lucide-react"

interface ScenarioSummaryProps {
  result: SimulationResult
}

const REGION_COLORS: Record<Region, string> = {
  NYC: "bg-blue-100 text-blue-700",
  Suburban: "bg-emerald-100 text-emerald-700",
  Upstate: "bg-violet-100 text-violet-700",
}

export function ScenarioSummary({ result }: ScenarioSummaryProps) {
  const formatPopulation = (pop: number) => {
    return new Intl.NumberFormat("en-US").format(pop)
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Scenario
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{result.county}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REGION_COLORS[result.region]}`}>
            {result.region}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-mono text-xs">
            <span className={result.unemp_shock_pp >= 0 ? "text-rose-600" : "text-emerald-600"}>
              {result.unemp_shock_pp >= 0 ? "+" : ""}{result.unemp_shock_pp}pp
            </span>
            {" unemployment"}
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-xs text-slate-600">
            {result.current_unemp}% → {result.shocked_unemp}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-600">Pop. {formatPopulation(result.population)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">as of {result.as_of_month}</span>
        </div>
      </div>
    </div>
  )
}
