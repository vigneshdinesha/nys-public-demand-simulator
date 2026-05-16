import type { MetricPrediction, Confidence } from "@/lib/types"
import { Users } from "lucide-react"

interface PredictionCardProps {
  title: string
  prediction: MetricPrediction
  accentColor: "blue" | "green"
}

const CONFIDENCE_STYLES: Record<Confidence, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-emerald-50", text: "text-emerald-700", label: "High Confidence" },
  moderate: { bg: "bg-amber-50", text: "text-amber-700", label: "Moderate Confidence" },
  low: { bg: "bg-rose-50", text: "text-rose-700", label: "Low Confidence" },
}

export function PredictionCard({ title, prediction, accentColor }: PredictionCardProps) {
  const confidenceStyle = CONFIDENCE_STYLES[prediction.confidence]
  const isPositive = prediction.delta_headcount >= 0

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(Math.round(num))
  }

  const formatCurrency = (num: number) => {
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(1)}B`
    }
    return `$${(num / 1e6).toFixed(1)}M`
  }

  const formatCurrencyFull = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num)
  }

  // Calculate CI bar positions (percentage of full range)
  const ciMin = prediction.delta_headcount_ci[0]
  const ciMax = prediction.delta_headcount_ci[1]
  const range = ciMax - ciMin
  const center = prediction.delta_headcount
  const leftPercent = ((center - ciMin) / range) * 100
  const rightPercent = ((ciMax - center) / range) * 100

  return (
    <div className="group relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Confidence Badge */}
      <div className="absolute right-4 top-4">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text}`}>
          {confidenceStyle.label}
        </span>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${accentColor === "blue" ? "text-blue-900" : "text-emerald-900"}`}>
          {title}
        </h3>
      </div>

      {/* Big Delta Number */}
      <div className="mb-2">
        <span className={`font-display text-4xl font-bold tracking-tight ${
          isPositive ? "text-rose-600" : "text-emerald-600"
        }`}>
          {isPositive ? "+" : ""}{formatNumber(prediction.delta_headcount)} people
        </span>
      </div>

      {/* Sub-line */}
      <p className="mb-4 text-sm text-slate-600">
        <span className={isPositive ? "text-rose-600" : "text-emerald-600"}>
          {isPositive ? "+" : ""}{prediction.pct_change?.toFixed(2)}%
        </span>
        {" from current "}
        <span className="font-mono text-slate-700">{prediction.current_per_1k?.toFixed(2)}</span>
        {" per 1k residents"}
      </p>

      {/* CI Bar */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-slate-500">95% Confidence Interval</p>
        <div className="relative h-6 rounded-full bg-slate-100">
          <div
            className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${
              accentColor === "blue" ? "bg-blue-200" : "bg-emerald-200"
            }`}
            style={{
              left: "10%",
              right: "10%",
            }}
          />
          <div
            className={`absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full ${
              accentColor === "blue" ? "bg-blue-600" : "bg-emerald-600"
            }`}
            style={{
              left: `${10 + (leftPercent * 0.8)}%`,
            }}
          />
          </div>
        <div className="mt-1 flex justify-between px-[10%]">
          <span className="font-mono text-[10px] text-slate-500">{formatNumber(ciMin)}</span>
          <span className="font-mono text-[10px] text-slate-500">{formatNumber(ciMax)}</span>
        </div>
      </div>

      {/* Budget Impact Panel */}
      {prediction.cost_impact && (
        <div className={`mb-4 rounded-xl p-4 ${accentColor === "blue" ? "bg-blue-50/50" : "bg-emerald-50/50"}`}>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Budget Impact
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Annual Cost</p>
              <p className={`text-xl font-bold ${isPositive ? "text-rose-600" : "text-emerald-600"}`}>
                {isPositive ? "+" : ""}{formatCurrency(prediction.cost_impact.annual_cost)}
              </p>
              <p className="text-[10px] text-slate-400">
                CI: {formatCurrencyFull(prediction.cost_impact.annual_cost_ci[0])} – {formatCurrencyFull(prediction.cost_impact.annual_cost_ci[1])}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Monthly Cost</p>
              <p className="text-xl font-bold text-slate-700">
                {formatCurrency(prediction.cost_impact.monthly_cost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Caseworkers Needed</p>
              <p className="flex items-center gap-1 text-xl font-bold text-slate-700">
                <Users className="h-4 w-4 text-slate-400" />
                {formatNumber(prediction.cost_impact.caseworkers_needed)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Share of Current Budget</p>
              <p className={`text-xl font-bold ${isPositive ? "text-rose-600" : "text-emerald-600"}`}>
                {isPositive ? "+" : ""}{prediction.cost_impact.pct_of_current_cost?.toFixed(2)}%
              </p>
            </div>
          </div>
          {prediction.cost_impact.caveat && (
            <p className="mt-3 text-xs italic text-slate-500">
              {prediction.cost_impact.caveat}
            </p>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Current</p>
          <p className="font-mono text-sm font-medium text-slate-700">
            {prediction.current_per_1k?.toFixed(1)}/1k
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Predicted</p>
          <p className="font-mono text-sm font-medium text-slate-700">
            {prediction.predicted_per_1k?.toFixed(1)}/1k
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Model R²</p>
          <p className="font-mono text-sm font-medium text-slate-700">
            {prediction.model_r2.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Confidence Note */}
      <p className="mt-3 text-xs italic text-slate-500">
        {prediction.confidence_note}
      </p>
    </div>
  )
}
