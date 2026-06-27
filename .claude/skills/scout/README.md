# Design Scout

Turn reference websites into concrete, adoptable design changes for this project — without
ever letting an automated pass silently rewrite your tokens or components.

**Governing principle: the scout proposes; it never mutates.** Every code change to tokens or
components happens downstream, behind a gate you control.

## Flow

```
inspiration URLs
      │  /scout https://a.com https://b.com --target /
      ▼
┌──────────────┐   delegates to   ┌────────────────────┐   writes    ┌─────────────────────────────────┐
│ /scout skill │ ───────────────▶ │ design-scout agent │ ──────────▶ │ design-proposals/<slug>-<ts>.json │
└──────────────┘                  └────────────────────┘             └───────────────┬─────────────────┘
      │ records                                                                       │
      ▼                                                                               │
design-proposals/INDEX.md  (local history — date, target, path, status, top rec)      │
      │ optional: --issue → GitHub issue (label: design-proposal)                     │
      ▼                                                                               │
┌──────────────────────── GATE (you) ────────────────────────┐                       │
│ review the JSON; set adoption.status → accepted / partial   │ ◀─────────────────────┘
└───────────────────────────────┬────────────────────────────┘
                                ▼
                "apply the accepted design proposal at <path>"
                Claude Code applies accepted token_changes to the @theme block first,
                then accepted component_suggestions in priority order. Then commit / PR.
```

## Usage

```
/scout <url> [<url> ...] [--target <route-or-component>] [--issue]
```

- `--target` — what you're redesigning, e.g. `/`, `components/header.tsx`, or `global`. Default `general`.
- `--issue` — also open a GitHub tracking issue. Off by default (solo repo).

Examples:
- `/scout https://linear.app --target components/header.tsx`
- `/scout https://pudding.cool https://flowingdata.com --target /` (scrollytelling inspiration)

## Prerequisite: browser capture

Full-fidelity scouting renders the sites and reads their computed styles via the Playwright MCP.
Install once:

```
claude mcp add playwright npx @playwright/mcp@latest
```

Without it, the scout falls back to `WebFetch` (HTML/CSS only) and lowers its confidence — usable
in a pinch, but screenshots and rendered styles are how it earns its taste.

## Output contract

One JSON file per run conforming to `design-proposal.schema.json`. Invariants:

- Final values are **token names**, never raw hex/px — raw extractions live in `evidence_raw`.
- Every `token_change` / `component_suggestion` has **provenance** + **confidence**.
- Conflicts with existing tokens are **flagged** (`conflict: true`), never silently applied.
- New tokens are explicit (`is_new_token: true`).
- `adoption.status` starts at `proposed`; nothing reaches code until you flip it.

## This project's design system (what the scout maps into)

- Tokens: `dashboard/app/globals.css` — `:root` custom properties + `@theme inline`, **oklch** colors.
- Fonts: `--font-sans` Inter, `--font-mono` DM Mono, `--font-display` Syne.
- Motion: CSS `@keyframes` + utility classes + `tw-animate-css` (NOT Motion/Framer).
