# Product

## Register

product

## Users

The internal team at LeadersBrands (an `@leadersbrands.ae` Google Workspace org), split into two designated teams — **Sales** (coral) and **Ops** (violet). Everyone shares one workspace and the same set of projects. They sign in with their work Google account and track time throughout the workday: starting the timer when they begin a task, adding manual entries when they forget, editing times, and pulling reports for invoicing. Context of use is a normal work browser, often with the app open all day in a background tab (the live timer shows in the tab title). Admins additionally manage members and projects. The job to be done: **capture time with as little friction as possible, then trust the numbers when reporting.**

## Product Purpose

TimeIT is a fast, shared **team time tracker** in the spirit of Clockify, built on Next.js + Supabase with Row-Level Security. It exists so a small team can log work in one click, see what everyone did on any given day, and export clean totals (by project, person, or team) for invoicing — without the weight of enterprise timesheet software. Success looks like: people actually track their time because starting is effortless, the reports are trusted enough to bill from, and nobody feels watched. RLS guarantees you can only edit your own entries even though the whole team can read reports — the trust model is "shared visibility, personal ownership."

## Brand Personality

**Crisp, efficient, quiet.** Fast and precise, optimized for people who live in the tool all day. The voice is plain and confident — labels over explanations, no marketing tone. Emotionally it should feel effortless and trustworthy: hitting ▶ is instant, the numbers add up, nothing nags. The existing aesthetic — Apple-style "liquid glass" on a sky-blue field, tabular numerals, tight information hierarchy — carries this: light and modern without being decorative. Density serves speed; every screen puts the primary task (track, review, report) first.

## Anti-references

- **Employee-surveillance / monitoring tools.** No screenshots, activity scores, idle-shaming, streaks, or anything that makes tracking feel like being watched. The trust model is personal ownership, not oversight. Tone and features must never drift toward "productivity policing."
- **Heavy enterprise timesheet / ERP software** (SAP, legacy Jira worklogs, dense gray form-grids). Avoid the multi-step, approval-gated, form-heavy feel. One-click beats a wizard.
- Generic purple-gradient SaaS dashboards and the hero-metric template (giant number + gradient accent).

## Design Principles

1. **Starting must be frictionless.** The single most important interaction is hitting ▶. Every design decision protects the speed and obviousness of starting, stopping, and resuming a timer. Ceremony is the enemy.
2. **Trust the numbers.** Totals, durations, and reports are the product's promise. Use tabular numerals, unambiguous time formats, and clear grouping so figures are scannable and billable-grade. Never let visual polish obscure a total.
3. **Shared visibility, personal ownership.** Design reflects the data model: everyone can see the team's day, but your entries are yours. Team color-coding (Sales coral / Ops violet) makes "who did what" instant without exposing edit affordances that RLS forbids.
4. **Density in service of speed, not clutter.** This is a tool people keep open all day. Favor compact, information-rich layouts over airy marketing spacing — but keep hierarchy sharp so the primary action on each screen is never in doubt.
5. **Calm, never nagging.** Feedback is quiet and confident (a pulse dot, a live tab title, an undo snackbar). Nothing shames, gamifies, or interrupts.

## Accessibility & Inclusion

No formal WCAG level committed, but hold a best-effort bar: body text should stay legible against the glass/sky-blue surfaces (watch contrast of `--text-dim` on translucent backgrounds), interactive controls need visible focus states, and the app should remain fully usable by keyboard. Honor `prefers-reduced-motion` for the timer pulse, entry fades, and view transitions. Team color-coding (coral/violet) should never be the *only* signal — always pair color with a text label or badge, for color-blind users.
