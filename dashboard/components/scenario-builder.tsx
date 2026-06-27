"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Play, HelpCircle } from "lucide-react"
import type { County, Scenario, Region } from "@/lib/types"

interface ScenarioBuilderProps {
  counties: County[]
  scenarios: Scenario[]
  selectedCounty: string
  unempShock: number
  onCountyChange: (county: string) => void
  onShockChange: (shock: number) => void
  onRunSimulation: () => void
}

const REGION_COLORS: Record<Region, string> = {
  NYC: "bg-blue-100 text-blue-700",
  Suburban: "bg-emerald-100 text-emerald-700",
  Upstate: "bg-violet-100 text-violet-700",
}

export function ScenarioBuilder({
  counties,
  scenarios,
  selectedCounty,
  unempShock,
  onCountyChange,
  onShockChange,
  onRunSimulation,
}: ScenarioBuilderProps) {
  const [sliderValue, setSliderValue] = useState([unempShock])
  
  const groupedCounties = counties.reduce((acc, county) => {
    if (!acc[county.region]) acc[county.region] = []
    acc[county.region].push(county)
    return acc
  }, {} as Record<Region, County[]>)

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
    onShockChange(value[0])
  }

  const handleScenarioClick = (scenario: Scenario) => {
    onCountyChange(scenario.county)
    setSliderValue([scenario.unemp_shock])
    onShockChange(scenario.unemp_shock)
  }

  const formatShock = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}pp`
  }

  return (
    <aside className="flex w-full flex-col rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Scenario Builder
        </h2>
      </div>

      <div className="flex-1 space-y-6">
        {/* County Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">County</label>
          <Select value={selectedCounty} onValueChange={onCountyChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Select a county" />
            </SelectTrigger>
            <SelectContent>
              {(["NYC", "Suburban", "Upstate"] as Region[]).map((region) => (
                <SelectGroup key={region}>
                  <SelectLabel className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REGION_COLORS[region]}`}>
                      {region}
                    </span>
                  </SelectLabel>
                  {groupedCounties[region]?.map((county) => (
                    <SelectItem key={county.county} value={county.county}>
                      <span className="flex items-center gap-2">
                        {county.county}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${REGION_COLORS[county.region]}`}>
                          {county.region}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unemployment Shock Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              Unemployment Shock
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      <strong>Percentage points (pp)</strong> measure the absolute change in unemployment rate. 
                      A +3pp shock means unemployment rises by 3 percentage points (e.g., from 5% to 8%), 
                      not 3% of the current rate.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
            <div className="mb-4 text-center">
              <span className={`font-display text-4xl font-bold tracking-tight ${
                sliderValue[0] >= 0 ? "text-rose-600" : "text-emerald-600"
              }`}>
                {formatShock(sliderValue[0])}
              </span>
            </div>
            
            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              min={-5}
              max={10}
              step={0.5}
              className="mb-3"
            />

            <div className="flex justify-between text-xs text-slate-500">
              <span>−5pp</span>
              <span>0</span>
              <span>+10pp</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Unemployment {sliderValue[0] >= 0 ? "rises" : "falls"} by{" "}
            <span className="font-medium text-slate-700">{Math.abs(sliderValue[0]).toFixed(1)} percentage points</span>{" "}
            from current level.
          </p>
        </div>

        {/* Run Simulation Button */}
        <Button
          onClick={onRunSimulation}
          size="lg"
          className="w-full gap-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
        >
          <Play className="h-4 w-4" />
          Run Simulation
        </Button>

        {/* Quick Scenarios */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Scenarios
          </h3>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <TooltipProvider key={scenario.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleScenarioClick(scenario)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 ${
                        scenario.unemp_shock >= 0
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {scenario.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{scenario.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {scenario.county} · {scenario.unemp_shock >= 0 ? "+" : ""}{scenario.unemp_shock}pp
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
