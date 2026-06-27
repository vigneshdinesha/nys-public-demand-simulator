import { Header } from "@/components/header"
import { Hero } from "@/components/story/hero"
import { RippleSection } from "@/components/story/ripple-section"
import { DataFoundation } from "@/components/story/data-foundation"
import { CovidMoment } from "@/components/story/covid-moment"
import { MethodologySection } from "@/components/story/methodology-section"
import { StoryFooter } from "@/components/story/story-footer"
import { Simulator } from "@/components/simulator"
import { Reveal } from "@/components/reveal"

const GITHUB_URL = "https://github.com/vigneshdinesha/nys-public-demand-simulator"

const DATA_SOURCES = [
  { label: "Unemployment",      source: "NYS Dept. of Labor (LAUS)" },
  { label: "Medicaid",          source: "NYS DOH — extracted from monthly PDFs" },
  { label: "SNAP",              source: "NYS OTDA caseload data" },
  { label: "Crashes",           source: "NYSDOT four-year window" },
  { label: "Transit ridership", source: "MTA monthly ridership" },
  { label: "Population",        source: "U.S. Census Bureau" },
]

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Ambient aurora wash behind the whole story */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60 aurora" aria-hidden />

      <Header dataSources={DATA_SOURCES} githubUrl={GITHUB_URL} />

      <main>
        <Hero />
        <RippleSection />
        <DataFoundation />
        <CovidMoment />

        {/* The interactive payoff */}
        <section id="simulator" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24 sm:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Try it yourself</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Run your own shock.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Pick a county, set an unemployment shock, and watch the estimated demand,
              budget, and staffing impact — each tagged with how much to trust it.
            </p>
          </Reveal>

          <div className="mt-12">
            <Simulator />
          </div>
        </section>

        <MethodologySection />
      </main>

      <StoryFooter githubUrl={GITHUB_URL} />
    </div>
  )
}
