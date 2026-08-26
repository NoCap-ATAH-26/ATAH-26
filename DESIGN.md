---
version: alpha
name: NoCap
description: The live truth layer for an AI knowledge base — an autonomous Inspector/Repair/Verifier pipeline that approves, quarantines, or repairs incoming documents with no human in the loop, watched from a cinematic ops dashboard.

colors:
  primary: "#8BE8CB"
  primary-dim: "#6BAA96"
  secondary: "#9C7A97"
  tertiary: "#7EA2AA"
  neutral: "#000000"
  surface: "#1F1F1F"
  surface-2: "#333333"
  on-surface: "#F4F7F5"
  border: "#24262E"
  good: "#0CA30C"
  warning: "#FAB219"
  serious: "#EC835A"
  error: "#DC5252"

typography:
  hero-shout:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline-display:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.01em
  headline-display-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  ui-label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  label-hud:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.1em
  label-hud-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.1em
  label-hud-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.1em
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.1
    fontFeature: "'tnum' 1"
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.15
    fontFeature: "'tnum' 1"
  data-body:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum' 1"

rounded:
  none: 0px
  sm: 7px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px

components:
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.ui-label}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-dim}"
    textColor: "{colors.neutral}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.on-surface}"
    typography: "{typography.ui-label}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  status-approved:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.good}"
    typography: "{typography.label-hud}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-needs-repair:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.warning}"
    typography: "{typography.label-hud}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-repaired:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.serious}"
    typography: "{typography.label-hud}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-quarantined:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.error}"
    typography: "{typography.label-hud}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  hud-label:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-hud-sm}"
  brand-tag:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.ui-label}"
  stat-figure:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-lg}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  input-error:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.error}"
    typography: "{typography.body}"
---

# NoCap

## Overview

NoCap is watched, not just used. Its job is to prove — in real time, to a person who did not touch the keyboard — that an autonomous system is correctly deciding whether a document entering the knowledge base is trustworthy. That framing sets the whole direction: this is not a friendly consumer app and not a plain admin panel. It is an **ops room** — the register of a systems console that a security team leaves on a second monitor, crossed with the **cinematic** confidence of a product that wants a first-time viewer to feel it is watching *something real happen live*, before they ever touch a control.

The direction is **Terminal Precision, staged**. True black, monospace HUD chrome, and hairline borders carry the working dashboard — dense, quiet, built for someone reading it for hours. Layered on top, at the marketing surface only, is a second, more expensive register: a glossy 3D wordmark that tumbles on scroll, a neural-vortex canvas behind the hero, a full-bleed 3D scroll tunnel, and a single italic serif voice that steps in exactly when the copy needs to sound like a person and not a machine. One accent color, Aquamarine, is the only warm-toned interactive signal in an otherwise cold, monochrome-plus-status palette.

What this gives up, deliberately: **approachability as a first impression.** NoCap does not read as inviting or soft. A near-black base, a mono-labeled top bar, and copy like "Guarding what's true" and "no human in the loop" are choosing credibility-through-surveillance over warmth. That is the correct trade for a product whose entire pitch is that it catches lies before a human would — it should look like it is watching closely, because it is. The second sacrifice is engineering weight spent on spectacle: the tunnel scroll and the neural vortex exist purely to sell trust cinematically before the user reaches the working dashboard, and neither pulls its weight to a returning user who only wants the numbers.

## Colors

The palette is four hues plus true black, and each hue has exactly one job. This is a codified system, not a proposed one — the values below are what's already shipped, examined for consistency and audited for contrast rather than reinvented.

- **Primary (#8BE8CB) — Aquamarine.** The sole driver of interaction: buttons, links, focus rings, selection. Reserved deliberately — it never appears as decoration or as a status signal, so when it does appear, it always means "you can act here." At 14.5:1 against the true-black base it is comfortably text-safe, which is why it can carry a filled button's background with black text on top rather than needing a lighter variant.
- **Primary-dim (#6BAA96)** — the same hue, darkened, used only for the primary button's pressed/hover state so the interaction still reads as the same color family rather than a swap.
- **Secondary (#9C7A97) — Dusty Mauve.** The one warm, human note in an otherwise cold system. It never carries interaction or status; it is reserved for the wordmark's gradient and brand-voice moments (a byline, a small brand tag) — the parts of the interface that are allowed to sound like a person rather than a machine.
- **Tertiary (#7EA2AA) — Cool Steel.** The coldest neutral in the family. Used only for de-emphasized text — HUD labels, timestamps, metadata — never for anything that needs to be found quickly. Its restraint is what makes Primary's warmth register as a real accent rather than one hue among several.
- **Neutral (#000000) — true black,** not a softened near-black. The comment in the original stylesheet is worth keeping as the rule itself: gunmetal "reads too grey" for a system that wants to feel like it's staring into a dark ops room, not a grey admin panel. Every surface tier below is computed as a lighten off this exact black, so the whole dark palette stays provably tied to one root value instead of five independently-chosen greys.
- **Surface (#1F1F1F) and Surface-2 (#333333)** — two tonal steps up from black (12% and 22% white respectively). Surface is a card sitting on the page; Surface-2 is a well inside a card — an input, a pressed toggle, a secondary button. The gap between them is small on purpose: elevation here is meant to be felt, not announced.
- **On-surface (#F4F7F5) — ink.** Primary running text on any dark tier, 15–19:1 depending on the surface. Never pure white; it carries a faint warm cast so long reading sessions on true black don't vibrate.
- **Border (#24262E)** — Cool Steel's cousin hue (the same Lavender-Grey family as Tertiary) flattened to a hairline at 22% opacity. This is the primary depth device on dark surfaces — see Elevation & Depth.
- **Good (#0CA30C), Warning (#FAB219), Serious (#EC835A), Error (#DC5252)** — the four pipeline outcomes: Approved, Needs Repair, Repaired, Quarantined. These are fixed across the whole product and are never reused as decoration or theming — a color that can mean "quarantined" must never also mean "featured" or "new," or the badge stops being trustworthy at a glance.

**One audited finding, not slop but a real gap:** the shipped quarantined-red (`#D03B3B`) sits at 4.37:1 against true black as running text — just under the 4.5:1 AA threshold for small text, even though it clears the 3:1 threshold that applies to icon fills, borders, and large text. `Error` above (`#DC5252`) is a minimal, same-hue lightness correction — 5.37:1 on black — proposed specifically for anywhere the color carries text (a badge label, an inline error message). The original `#D03B3B` remains fine for the non-text uses it already has (icon strokes, translucent fills, borders), where the lower threshold applies. Every status badge already pairs color with an icon and a text label (never color alone), which independently covers colorblind users regardless of this fix — the contrast fix is about *low vision* legibility specifically, a separate requirement from color-alone dependence.

## Typography

Three working families plus one that exists purely as a logotype.

**Inter** carries two unrelated jobs, which is deliberate rather than an oversight: at UI sizes (labels, buttons, body copy) it's the invisible workhorse, but at one specific size — the hero headline — it's set at weight 900, uppercase, tight tracking, and pushed to 48px. That single `hero-shout` level is the loudest thing in the system and it is not the serif; the declarative, almost-shouted sans is what makes "Guarding what's true" read as a claim rather than a caption. Fallback: `Inter, "Helvetica Neue", Arial, sans-serif`. SIL Open Font License.

**Playfair Display**, always italic where it appears, is reserved exclusively for editorial section intros — "The Pipeline, Live," "Risk Score, Live," "Sign in to your dashboard." It never appears in UI chrome, buttons, or data. Its one job is to sound like a person narrating what the system is doing, which is why it only shows up at moments the product wants to feel explained rather than operated. Fallback: `"Playfair Display", Georgia, "Times New Roman", serif`. SIL Open Font License.

**JetBrains Mono** is the HUD and data voice — every timestamp, stage label, risk score, file identifier, and status badge runs through it, always with tabular figures enabled so numbers align in the activity feed and score charts. Three sizes (12/11/10px) carry three levels of chrome importance, from a section eyebrow down to the faintest per-row metadata; all three are uppercase with wide tracking (0.1em) when used as labels, which is what reads as "system-generated" rather than "written." Fallback: `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`. SIL Open Font License.

**Baloo 2** (weight 800, not tokenized above) exists solely inside the glossy 3D wordmark SVG. Its thick, rounded strokes give the glass-filter effect enough surface area to render a convincing specular highlight — it is a logotype ingredient, never a text face, and should not be reached for anywhere else.

The scale runs 10 → 48px. There is no single ratio: the mono tiers step by whole pixels (10/11/12) because HUD chrome needs fine, deliberate gradation rather than a mathematically pure curve, while the display tiers (24/36/48) roughly double-step because headlines only need two or three distinct weights of shout. Tracking is negative only at the 48px hero level (−0.02em, to keep bold uppercase from feeling loose) and positive only on mono labels (+0.1em, uppercase always needs the air). Body and UI text carry no tracking adjustment at all.

## Layout

The product is two layouts wearing one skin. The **marketing surface** (hero through the features/how-it-works sections) is full-bleed and cinematic: a fixed 3D wordmark tumbles on a scroll-scrubbed rotation, a neural-vortex canvas runs behind it, and later sections pin into a 3D scroll tunnel. The **dashboard surface** is a conventional constrained-width app shell — a HUD-labeled header, a content column, a mono-labeled footer — built for density and long sessions, not spectacle.

Spacing runs on a **4px base** (4/8/16/24/40), consistent across both surfaces. The dashboard's primary grid is a responsive stat-tile row — 2 columns on mobile, 4 on desktop — plus single-column stacks for the activity feed, score chart, and document viewer below it. Horizontal page padding is 24px (mobile) and holds through desktop rather than scaling further; density comes from tightening vertical rhythm inside cards, not from widening the frame.

The top bar on every surface is a fixed three-zone HUD strip in mono type: identity/title at left, a short tagline centered (marketing only), navigation and auth state at right. This bar is intentionally the one piece of layout DNA shared between the cinematic and operational halves of the product — it is what tells a viewer, even mid-scroll-tunnel, that they are still inside an instrument panel and not a slideshow.

## Elevation & Depth

Dark surfaces carry no neutral drop shadow — a card is never a grey rectangle floating on a grey shadow. Hierarchy on true black is carried by three devices:

1. **Tonal layering.** Neutral → Surface → Surface-2 is a fixed three-step lighten off true black. A card is a slightly brighter patch of the same black, not a floating object with a shadow under it.
2. **Hairline borders.** 1px in `border` (`#24262E`), sometimes strengthened to a higher-opacity variant for emphasis. Borders divide and frame; on true black there is enough native contrast that a border alone reads as a boundary without needing a shadow to reinforce it.
3. **Colored glow**, on the panels the product wants to read as instruments that are actively doing something, not just holding content. This is a system-level device now, not a one-off: `glow-mint` (Aquamarine) marks the live data surfaces — the Risk Score chart's card and its line, and a pipeline node once it has real throughput. `glow-mauve` (Dusty Mauve) marks the one narrative/human-facing surface, the Activity Feed, matching mauve's existing job as the system's one warm, human-facing hue. A softer version of the same two hues also blooms as two large, fixed, blurred radial gradients behind the whole dashboard (`.ambient-glow`) — dim, out-of-focus color pools in the dark, not a lit UI element in their own right. Status badges and stat-tile icons carry a small glow in their *own* status color (good/warning/serious/error or the tile's assigned hue), not the two brand hues — a glow there is read the same way the fill already is: it names the outcome, it doesn't decorate it.

The **light theme is the one other place shadows are earned**, and this is a real, considered exception rather than an inconsistency: on a near-white background, the tonal-step trick has almost no headroom left (surface and surface-2 sit only a few percent apart), so cards there pick up a soft cool-toned shadow and a frosted-glass blur to do the separation job tonal layering can no longer do on its own. Glow is dark-theme-only — `.ambient-glow`'s background is switched off entirely under `[data-theme="light"]`, since a colored bloom reads as light-in-a-dark-room and has no equivalent meaning on a pale surface. This asymmetry should be preserved, not "fixed" into consistency — flat-on-dark, glow-on-dark, and shadowed-on-light are each the correct choice for their own surface, not different answers to the same question.

Glow is still rationed, just no longer to a single hero element: it marks specific emphasis (live/active, narrative, outcome), never a default card treatment. A card with no assigned role — most of the dashboard's chrome — stays on tonal layering and a hairline border alone. If everything glows, nothing reads as "this one is live."

A faint film-grain texture (3.5% opacity noise on dark, 2% on light) sits behind every page. It's what keeps a large true-black field from looking like a placeholder rather than a designed surface — a completely flat black reads as unfinished; a black with a whisper of grain reads as intentional.

## Shapes

Radius is generated from a **single base value (12px)**, scaled by fixed multipliers rather than picked independently at each size — `sm`/`md`/`lg`/`xl` are 0.6×/0.8×/1×/1.4× that one number. This is a genuine authored decision, not a coincidence of a design tool's defaults: shape is one knob for the whole system, so a future change to the base radius updates every rounded corner in proportion instead of requiring five separate re-picks.

`full` (a true pill) is reserved for a specific class of object: status badges and small chips that are meant to read as a distinct, self-contained tag rather than as a container. Cards and inputs never go past `xl` (16px) — nothing in the system uses a large, "friendly" radius, which keeps the instrument-panel read intact even where the interface is at its calmest.

Borders, not radius, are the primary shape signal for state: a focused input gets the `primary` ring color, not a larger radius or a shadow. A radius change should never be used to communicate state — reach for color or the border instead.

## Components

**Buttons.** Primary is a solid `primary` fill with black text and `ui-label` type — the only button allowed a lime fill, since it must always mean "the one action here." Hover moves to `primary-dim`, never to opacity, so the color family stays intact. Secondary is a `surface-2` fill with `on-surface` text, used for anything that isn't the page's one primary action. There is no tertiary/ghost button in the system; a screen needing a third action level should reconsider its actions, not add a button variant.

**Status badges.** Pill-shaped (`rounded.full`), always icon + `label-hud` text together, color drawn only from the four fixed outcome colors and never anything else. They sit directly on `neutral`, not on a card tier — this is why their text pairs against true black rather than `surface` in the token model, and it's also the pairing with the widest contrast margin.

**Stat tiles.** `card`-tiered, `data-lg` mono figures with an icon above and a muted label below. Numbers are always tabular so a four-tile row stays visually aligned as values change live.

**HUD labels.** Every section eyebrow, timestamp, and piece of chrome metadata runs through one of the three mono label sizes, always uppercase, always tracked wide. This is the most load-bearing rule in the whole system for keeping the "instrument panel" read consistent — a plain-sans metadata label anywhere in the dashboard breaks the illusion immediately.

**Inputs.** `surface-2` fill, `md` radius, `body` type at full size — never shrunk to a UI-label size, since this is a document-upload and chat product where people are often reading what they've typed. Error state drops the fill back to `neutral` rather than keeping `surface-2` — this reads as a distinct, more serious state at a glance, and it's also what keeps `error`'s text-safe margin: `#DC5252` clears AA against true black (5.4:1) but not against the lighter `surface-2` well (3.2:1). An icon and a written message always accompany the error color, never color alone.

**Chat and document surfaces.** Use the same card/border/mono-label vocabulary as the rest of the dashboard rather than introducing a distinct "chat app" visual language — a session panel or a document viewer should look like another instrument on the same panel, not like an embedded third-party widget.

**Glow.** Two fixed utilities, `glow-mint` and `glow-mauve`, each a 1px tinted border plus two soft outward shadows (a tight bloom, a wide one) in the same hue — never a neutral shadow with color layered on top. Applied at the card level to a fixed, short list of panels (Risk Score chart, active pipeline nodes → mint; Activity Feed → mauve), never as a generic "make this card pop" treatment. The chart's line gets a matching glow via an SVG `feGaussianBlur`/`feMerge` filter rather than a CSS `box-shadow` or `filter: drop-shadow`, since Recharts' stroke isn't a stable DOM node for CSS filters to target — the SVG filter is the correct primitive for glowing a vector path, the CSS utilities are the correct primitive for glowing a card. Status badges and stat-tile icons use a third pattern, an inline `box-shadow` computed from that element's own status/assigned color rather than the two fixed brand utilities — the glow there is naming an outcome, not a brand moment.

## Do's and Don'ts

- **Do** keep `primary` (Aquamarine) exclusive to real interaction — buttons, links, focus, selection. The moment it's used decoratively, the "you can act here" signal stops meaning anything.
- **Don't** reuse the four status colors (`good`/`warning`/`serious`/`error`) for anything but the four pipeline outcomes. They are fixed, CVD-checked, and load-bearing for trust; a fifth meaning for any of them undermines the other four.
- **Do** pair every status color with an icon and a text label, never color alone — already true throughout the shipped app, and non-negotiable given how central "is this trustworthy" is to the product.
- **Don't** set HUD chrome (labels, timestamps, stage names) in the sans or serif face. If it's metadata about the system's own state, it's mono, uppercase, and tracked — that's the tell that separates "the system reporting on itself" from "content."
- **Do** reserve Playfair italic for editorial section intros that narrate what's happening. It should never appear in a button, a data figure, or dense UI chrome.
- **Don't** add a neutral (grey/black) drop shadow to a dark-mode card, input, or badge. If something needs to feel raised without a specific meaning, move it up a tonal tier or give it a border instead — a shadow there should never just be grey.
- **Do** reserve colored glow (`glow-mint`, `glow-mauve`, and status-colored badge/icon halos) for the fixed, short list of surfaces it's assigned to — live data, the narrative panel, and outcome colors. It's a meaning-carrying device like `primary`, not a default "nicer card" upgrade; a card with no assigned role stays flat.
- **Do** let the light theme keep its shadow-and-blur treatment — it is solving a real headroom problem the dark theme doesn't have, not an inconsistency to be flattened away.
- **Don't** push a card or input radius past `xl` (16px). A "friendlier," larger radius anywhere breaks the instrument-panel register the rest of the system is built on.
- **Do** use tabular mono figures (`data-lg`/`data-md`/`data-body`) for every score, count, and timestamp. Proportional numerals will not align in the activity feed or the stat row.
- **Don't** spend the cinematic marketing vocabulary (tunnel scroll, neural vortex, glossy wordmark tumble) inside the working dashboard. That register is for building trust before someone reaches the tool; once they're in the tool, the terminal-precision half of the system should carry the whole experience.
