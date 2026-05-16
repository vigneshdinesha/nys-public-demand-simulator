import { Lightbulb } from "lucide-react"

interface InsightsPanelProps {
  insights: string[]
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Interpretation</h3>
      </div>

      <ol className="space-y-3">
        {insights.map((insight, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-slate-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
              {index + 1}
            </span>
            <span>{insight}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <p className="text-xs leading-relaxed text-slate-500">
          <strong className="font-semibold text-slate-600">Note:</strong> Model based on NYS county-month panel data 2018–2025. 
          Predictions use OLS regression with heteroskedasticity-robust standard errors. 
          Not for policy decisions without further validation.
        </p>
      </div>
    </div>
  )
}
