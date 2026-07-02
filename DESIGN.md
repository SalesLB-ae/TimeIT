---
name: TimeIT
description: A fast, shared team time tracker with an Apple-style liquid-glass surface on a daylight sky-blue field.
colors:
  clear-sky-blue: "#2f6df6"
  clear-sky-blue-deep: "#1f5be0"
  success-green: "#2bb673"
  paused-amber: "#d8902a"
  danger-red: "#e5484d"
  ink-navy: "#16324f"
  muted-slate: "#5d7793"
  sales-coral: "#ff7a59"
  ops-violet: "#6c5ce7"
  sky-top: "#8ec9ff"
  sky-mid: "#aedaff"
  sky-low: "#d4ecff"
  sky-pale: "#eaf6ff"
  glass-white: "#ffffff"
typography:
  display:
    fontFamily: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "normal"
  numeric:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.5px"
    fontFeature: "tabular-nums"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.5px"
rounded:
  xs: "8px"
  sm: "12px"
  card: "14px"
  md: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
components:
  button-primary:
    backgroundColor: "{colors.clear-sky-blue}"
    textColor: "{colors.glass-white}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.clear-sky-blue-deep}"
    textColor: "{colors.glass-white}"
  button-ghost:
    backgroundColor: "#ffffff99"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "#00000000"
    textColor: "{colors.danger-red}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  chip:
    backgroundColor: "#ffffff80"
    textColor: "{colors.muted-slate}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  chip-active:
    backgroundColor: "{colors.clear-sky-blue}"
    textColor: "{colors.glass-white}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  card-glass:
    backgroundColor: "#ffffff8c"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    padding: "18px"
  input-field:
    backgroundColor: "#ffffffb3"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
  timer-start:
    backgroundColor: "{colors.success-green}"
    textColor: "{colors.glass-white}"
    rounded: "{rounded.pill}"
    size: "48px"
  timer-stop:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.glass-white}"
    rounded: "{rounded.pill}"
    size: "48px"
---

# Design System: TimeIT

## 1. Overview

**Creative North Star: "Daylight Glass"**

TimeIT is Apple-style translucency lit by daylight: soft, frosted surfaces floating on a calm sky-blue field, with sharp typographic hierarchy carrying the data. The glass is the *material*; precision is the *voice*. Every panel is a pane of frosted glass — `rgba(255,255,255,0.55)` behind an 18px `saturate(180%)` blur, edged with a bright inner highlight — but the numbers on that glass are dense, tabular, and unambiguous. The result reads as modern, clean, and quietly confident: a tool that feels effortless to start but billable-grade to trust.

Density serves speed. This is a tool people keep open all day (the live timer even shows in the browser-tab title), so layouts are compact and information-rich rather than airy. The primary action on every screen — hit ▶, review the day, pull the report — is never in doubt. Color is rationed: the surface is atmosphere (sky-blue gradient), and saturated color appears only to signal action, state, or team identity. Feedback is calm and never nagging — a pulse dot while tracking, a live readout, an undo snackbar — never a badge, streak, or guilt.

This system explicitly rejects two things. First, **employee-surveillance aesthetics**: nothing here scores, shames, or gamifies; tracking must feel like personal ownership, not oversight. Second, **heavy enterprise timesheet software**: no dense gray form-grids, no approval-gated wizards, no legacy-ERP chrome. One-click beats a multi-step flow every time. It also avoids the generic purple-gradient SaaS-dashboard look and the hero-metric template.

**Key Characteristics:**
- Frosted liquid-glass panels on a fixed daylight sky-blue gradient
- Soft, tactile, rounded surfaces (18px / 12px radii, full pills for actions)
- Sharp, tabular-numeral data hierarchy on top of the soft glass
- Restrained color: one accent for action/state, semantic green/amber/red, two team hues
- Calm, quiet feedback — never surveillance, never gamification

## 2. Colors

The palette is a rationed one: a daylight sky-blue *world*, a single saturated accent for action, a tight semantic set for timer state, and two dedicated team hues. Saturation is a signal, not decoration.

### Primary
- **Clear-Sky Blue** (#2f6df6): The one action-and-state color. Primary buttons, the active nav item, selected chips, focus borders, calendar selection, report bars, and links. It lives in the same blue family as the background sky, so it reads as "the sky, concentrated." Its hover-deep partner is **Clear-Sky Blue Deep** (#1f5be0) for `:hover` on solid primary buttons.

### Secondary
Semantic state colors — each maps to a single meaning in the timer/entry lifecycle, never used decoratively.
- **Success Green** (#2bb673 · `rgb(43,182,115)`): The *running* state. The start button gradient, the live tracking badge + pulse dot, and the billable-entry marker. Green = "time is counting / this is billable."
- **Paused Amber** (#d8902a): The *paused* state only. The timer card's amber ring and the paused badge. Nothing else.
- **Danger Red** (#e5484d): Stop button, destructive actions (delete), and error banners.

### Tertiary
Team identity colors — color-coded everywhere a person or project has a team.
- **Sales Coral** (#ff7a59, tint `rgba(255,122,89,0.16)`): The Sales team.
- **Ops Violet** (#6c5ce7, tint `rgba(108,92,231,0.16)`): The Ops team.
- Plus a deterministic **8-color tag palette** (`#2f6df6 #2bb673 #e5a23c #e5484d #6c5ce7 #34b3c4 #e36fb0 #7a869a`) hashed per tag name, rendered as pills at 15% tint.

### Neutral
- **Ink Navy** (#16324f): Primary text. All headings, entry descriptions, durations, and totals. Never pure black — the ink carries the same blue undertone as the world.
- **Muted Slate** (#5d7793): Secondary text — meta lines, labels, dim icons, placeholders. *Contrast watch:* on the palest glass this is acceptable, but it drops toward the 4.5:1 floor on more transparent surfaces; push toward ink for anything that must be read, not just glanced.
- **Glass White** (#ffffff at 0.32–0.90 alpha): The surface material itself — every panel, input, and pill is a translucency of white over the sky. Solid `#fff` is reserved for text *on* saturated buttons.

### The Daylight Field
The body background is a **fixed** layered gradient — never scrolls — running sky-blue top to pale bottom (#8ec9ff → #aedaff → #d4ecff → #eaf6ff) with two soft radial sunlight highlights in the upper corners. This is the world every glass panel floats on.

### Named Rules
**The Rationed-Color Rule.** Clear-Sky Blue appears on ≤10% of any screen. The sky is atmosphere; the accent is action. If a screen looks blue-on-blue-on-blue, the accent has stopped meaning "act here."

**The One-Meaning Rule.** Green means running. Amber means paused. Red means stop/destroy. Coral means Sales, violet means Ops. A semantic color is never borrowed for decoration — if you reach for green because it "looks nice," stop.

## 3. Typography

**Display Font:** Poppins (with `-apple-system` / system-sans fallback) — brand wordmark and login only.
**Body / UI Font:** System sans stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) — everything else.

**Character:** One workhorse system sans carries the entire interface — headings, labels, body, and data — so the UI feels native and fast on every platform. Poppins appears *only* as the brand voice (the "TimeIT" wordmark, the login screen), a single geometric grace note against the neutral system sans. The pairing is contrast-by-role, not two-similar-sans.

### Hierarchy
- **Display** (Poppins, 700, 30px, `-0.5px`): The brand wordmark and login title. Nowhere in the app chrome.
- **Numeric** (system sans, 700, 34px, tabular-nums, `0.5px`): The signature — the live timer readout. Big, monospaced-figure, right-aligned. Compact density drops it to 27px. This is the number the whole product exists to show.
- **Headline** (system sans, 800, 30px, tabular-nums): Report grand totals — the "trust the numbers" figure.
- **Title** (system sans, 700, 22px): Page titles (`Track`, `Reports`, `Projects`).
- **Body** (system sans, 400–600, 15px, line-height 1.45): Default text. Entry descriptions run heavier (700, 15.5px) to lead each row; durations heavier still (800, 17px).
- **Label** (system sans, 700, 11.5px, uppercase, `0.5px`): Day headers, summary labels, team badges, role badges — the small structural signposts.

### Named Rules
**The Tabular-Figures Rule.** Every number that represents *time* — timer readout, durations, daily/period totals, report values — uses `font-variant-numeric: tabular-nums`. Figures must not jitter as they tick. This is non-negotiable; it is the difference between a stopwatch and a toy.

**The One-Family Rule.** The system sans carries headings, buttons, labels, body, and data. Poppins is brand chrome only. Never introduce a third family, and never use Poppins for UI labels or data.

## 4. Elevation

Depth is **glass, not shadow-stacking.** Every surface is one frosted pane — a translucent white fill behind a strong backdrop blur, edged with a bright 1px inner highlight (`inset 0 1px 0 rgba(255,255,255,0.9)`) that catches the "light" and a soft ambient drop shadow tinted with the world's own navy (`0 8px 30px rgba(31,73,125,0.16)`). There is one elevation at rest; the blur and the inner highlight *are* the depth. Panels don't stack into deep z-layers — layering is achieved by translucency (you see the sky through the glass), not by piling shadows.

Motion adds a second, transient elevation: hovering an entry lifts it 1px and deepens its shadow; the timer card, when running, swaps its ambient shadow for a green-tinted glow ring, and an amber one when paused. Elevation is a *response to state*, never a decorative default.

### Shadow Vocabulary
- **Glass ambient** (`box-shadow: 0 8px 30px rgba(31,73,125,0.16), inset 0 1px 0 rgba(255,255,255,0.9)`): The resting state of every `.glass` panel. Navy-tinted diffuse shadow + bright top highlight.
- **Hover lift** (`box-shadow: 0 10px 26px rgba(31,73,125,0.18)` + `translateY(-1px)`): Entry rows and interactive cards on hover.
- **Running glow** (`box-shadow: 0 0 0 1px rgba(43,182,115,0.4), 0 8px 30px rgba(43,182,115,0.18)`): The timer card while tracking. Amber-tinted equivalent when paused.
- **Action shadow** (`box-shadow: 0 6px 16px rgba(...,0.4)`): Colored soft shadow under circular timer buttons, tinted to the button's own hue.

### Named Rule
**The Frosted-Not-Flat Rule.** Depth comes from the blur and the inner highlight, never from a dark or hard drop shadow. If a panel looks like it has a 2014-era gray box-shadow, the blur is missing and the shadow is too dark. Test: remove the backdrop-filter and the panel should look *broken*, not merely flatter.

## 5. Components

Components are **soft and tactile**: generously rounded, translucent, gently responsive — but the type and states on them are sharp and unambiguous.

### Buttons
- **Shape:** Rounded rectangles at 12px (`{rounded.sm}`); circular (50%) for the timer transport controls.
- **Primary:** Clear-Sky Blue fill, white text, 700 weight, `10px 16px` padding. Hover → Clear-Sky Blue Deep (#1f5be0).
- **Ghost:** Translucent white fill (`rgba(255,255,255,0.6)`), ink text, 1px glass border. The default "secondary" action.
- **Danger:** Text-only red, no fill; gains a faint white wash on hover. Destructive actions stay quiet until hovered.
- **Timer transport:** 48px circles. Start = green gradient (`160deg, #2fd07a → #22b56a`) with a green tinted shadow; Stop = red gradient; Pause = translucent white with a glass border. `:active` scales to 0.92 for a tactile press.

### Chips
- **Style:** Full pills (`{rounded.pill}`). Resting = translucent white, muted-slate text, glass border, 600 weight.
- **State:** Selected/active → solid Clear-Sky Blue fill, white text. Used for report ranges, filters, and grouping toggles. A small variant (`chip-sm`, `5px 11px`) is used in dense filter bars.

### Cards / Containers
- **Corner Style:** 18px (`{rounded.md}`) for major panels, 14px for the profile card.
- **Background:** The glass primitive — `rgba(255,255,255,0.55)` (0.72 for stronger emphasis) behind `saturate(180%) blur(18px)`.
- **Shadow Strategy:** Glass ambient at rest (see Elevation). Never a hard drop shadow.
- **Border:** 1px `rgba(255,255,255,0.75)` — a bright frosted edge, not a dark stroke.
- **Internal Padding:** 14–24px depending on role (timer card 18px, modal 24px, calendar 14px).

### Inputs / Fields
- **Style:** Translucent white fill (`rgba(255,255,255,0.45–0.7)`), 1px glass border, 12px radius. The timer description composer is borderless and background-less — it floats directly on the card glass at 18px/600.
- **Focus:** Border shifts to Clear-Sky Blue (`border-color: var(--accent)`). No heavy glow ring. Placeholder text uses muted-slate.
- **Select controls:** Custom chevron (inline SVG in the accent blue), translucent fill, frosted — never the raw OS select.

### Navigation
- **Style:** Left sidebar (264px, sticky) as a glass panel. Nav links are 600-weight, muted-slate, 12px-radius rows.
- **States:** Hover → faint white wash + ink text. Active → Clear-Sky Blue text on a `rgba(47,109,246,0.14)` tint.
- **Mobile:** Below 860px the shell stacks vertically and the sidebar collapses behind a hamburger toggle; the calendar and nav hide until expanded.

### Signature: The Timer Card
The heart of the product. A glass card holding the borderless description composer, project/category selects, and the big tabular readout right-aligned. It is **state-expressive**: neutral at rest, a green glow ring + pulse dot + "TRACKING" badge while running, an amber ring + badge while paused. The transport control morphs between the green start circle and the red stop circle. This one component embodies the whole system — soft glass surface, sharp tabular data, calm state feedback.

### Team & Tag Badges
Pills that pair color *with a label* — never color alone. Team badges carry a leading dot (`::before`) plus the uppercase team name; tag pills use the hashed palette at 15% tint with the tag text in full color.

## 6. Do's and Don'ts

### Do:
- **Do** keep Clear-Sky Blue (#2f6df6) to ≤10% of any screen — it means "act here / this is selected," nothing else (the Rationed-Color Rule).
- **Do** use `font-variant-numeric: tabular-nums` on every time figure — readouts, durations, totals. Numbers must not jitter (the Tabular-Figures Rule).
- **Do** build depth from the frosted blur + bright inner highlight, with a soft navy-tinted ambient shadow (`0 8px 30px rgba(31,73,125,0.16)`). Depth is glass, not stacked shadows.
- **Do** pair every team/status color with a text label or badge, so color-blind users never rely on hue alone (coral=Sales, violet=Ops).
- **Do** keep the daylight gradient `background-attachment: fixed` — the glass floats on a stable sky.
- **Do** map each semantic color to exactly one meaning: green=running, amber=paused, red=stop/destroy.
- **Do** honor `prefers-reduced-motion` for the pulse dot, entry fade-ins, and view transitions.

### Don't:
- **Don't** drift toward **employee-surveillance aesthetics** — no activity scores, streaks, idle-shaming, or screenshots. Feedback stays calm and never nags.
- **Don't** adopt **heavy enterprise-timesheet chrome** — no dense gray form-grids, no approval-gated wizards, no legacy-ERP density. One-click beats a multi-step flow.
- **Don't** ship the generic **purple-gradient SaaS dashboard** or the **hero-metric template** (giant number + gradient accent + supporting stats).
- **Don't** use `background-clip: text` gradient text, or a `border-left`/`border-right` colored stripe as an accent — both are banned; use weight, full borders, or background tints.
- **Don't** use glassmorphism as decoration elsewhere — here it is the *system material*, applied consistently to every panel; don't scatter one-off blurred cards for flavor.
- **Don't** use Poppins for UI labels, buttons, or data — it is brand chrome only. One workhorse system sans carries the app.
- **Don't** let muted-slate (#5d7793) body text sit on the most transparent glass where it drops below 4.5:1 — push toward ink navy for anything meant to be read.
- **Don't** use a hard/dark drop shadow — if it looks like a 2014 app, the blur is missing and the shadow is too dark (the Frosted-Not-Flat Rule).
