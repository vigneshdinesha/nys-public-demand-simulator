---
name: scout
description: >
  Scout reference websites for visual and interaction design and write a design proposal
  (token deltas + ranked component suggestions) mapped to this project's Tailwind v4 design
  system. Use when given inspiration URLs, or when asked to "scout", "take design inspiration
  from", or "pull the look of" a site, or to redesign a route/component from reference sites.
argument-hint: "[url] [url ...] [--target <route-or-component>] [--issue]"
---

Orchestrate a design-scout pass. The heavy, isolated capture-and-analyze work runs in the
`design-scout` subagent; this skill parses input, then records the result locally. The scout
**proposes only** — nothing it produces touches component, style, or token files until you
explicitly adopt it.

Arguments: $ARGUMENTS

## Steps

1. **Parse the arguments.** Every bare URL is a reference site. An optional
   `--target <route-or-component>` names what we're redesigning (e.g. `/`, `components/header.tsx`);
   default to `general`. `--issue` opts into opening a GitHub tracking issue (off by default —
   this is a solo repo). If no URL is present, stop and ask for at least one reference URL.

2. **Capability check.** This scout captures rendered design via the Playwright MCP browser tools.
   If those tools are unavailable, tell the user the proposal will be weaker (no rendered styles /
   screenshots) and offer the one-line install before proceeding:
   `claude mcp add playwright npx @playwright/mcp@latest`
   If they decline, the subagent falls back to WebFetch (HTML/CSS only, lower confidence).

3. **Delegate to the `design-scout` subagent** (Agent tool, `subagent_type: "design-scout"`). Pass it
   the URLs, the target, and the chosen capture method. It learns our design system first
   (`dashboard/app/globals.css` tokens + representative components + our CSS-keyframe motion idiom),
   studies each reference at desktop (1440px) and mobile (390px), extracts design-bearing computed
   styles, maps findings to our tokens, and writes a proposal to
   `design-proposals/<target-slug>-<yyyymmdd-hhmm>.json` conforming to
   `.claude/skills/scout/design-proposal.schema.json` with `adoption.status: "proposed"`.
   The subagent is propose-only — it does not register, open issues, or edit code.

4. **Read the proposal** the subagent wrote. Append one row to `design-proposals/INDEX.md`
   (create it if missing) with: date, target, proposal path, `adoption.status`, and the top
   recommendation. This local index is the queryable history — there is no external spec store.

5. **(Optional, only if `--issue`)** Open a GitHub issue (`gh issue create`, label `design-proposal`)
   whose body links the proposal path and lists the top 3 recommendations and any flagged conflicts.
   Write the issue URL into the proposal's `adoption.issue_url`.

6. **Print a short summary:** top 3 recommendations (with impact/effort), any conflicts, open
   questions, and the proposal path. Then tell the user how to adopt:

   > To adopt, set `adoption.status` to `accepted` (everything) or `partial` (fill
   > `accepted_token_changes` / `accepted_suggestions`), then ask me to "apply the accepted
   > design proposal at <path>". I'll apply token changes to the `@theme` block first, then
   > the component suggestions in priority order.

**Do NOT modify any component, style, or token file in this skill.** Adoption is a separate,
gated step you trigger after reviewing the proposal.
