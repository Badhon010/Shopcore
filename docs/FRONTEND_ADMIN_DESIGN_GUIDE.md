# ShopCore Frontend Admin — Design Guide

> **Audience:** Future AI agents and human designers working on visual/UX decisions in `frontend-admin`.
> **Relationship to other docs:** This guide is design-only. For stack, folder structure, API contracts, auth flow, and coding rules, see `FRONTEND_ADMIN_GUIDE.md`. This document does not repeat that material — it explains *how the panel should look and feel*, and the rules that keep future UI work visually consistent.
> **Grounding:** Statements about tokens, components, and existing behaviour are drawn from the current repository (`tokens.css`, `globals.css`, `AdminLayout.tsx`, `GlobalSearch.tsx`, and related files as documented in the handoff guide). Where a claim cannot be confirmed from the repository, it is marked **not confirmed** rather than assumed.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Colour System](#2-colour-system)
3. [tokens.css — Source of Truth](#3-tokenscss--source-of-truth)
4. [Typography](#4-typography)
5. [Layout System](#5-layout-system)
6. [Sidebar UX](#6-sidebar-ux)
7. [Topbar UX](#7-topbar-ux)
8. [Search UX](#8-search-ux)
9. [Tables and List Pages](#9-tables-and-list-pages)
10. [Forms](#10-forms)
11. [Dashboard Design](#11-dashboard-design)
12. [Charts](#12-charts)
13. [Empty States](#13-empty-states)
14. [Loading States](#14-loading-states)
15. [Notifications, Badges, and Status Indicators](#15-notifications-badges-and-status-indicators)
16. [Overlays, Drawers, Dialogs, and Modals](#16-overlays-drawers-dialogs-and-modals)
17. [Scrollbar Styling](#17-scrollbar-styling)
18. [Iconography](#18-iconography)
19. [Dark Mode and Light Mode](#19-dark-mode-and-light-mode)
20. [Accessibility](#20-accessibility)
21. [Premium Polish Rules](#21-premium-polish-rules)
22. [Do / Don't](#22-do--dont)
23. [Practical References](#23-practical-references)
24. [Design Summary for Future AI](#24-design-summary-for-future-ai)

---

## 1. Design Philosophy

The admin panel is a **control panel**, not a marketing surface. Every decision should be judged against one question: *does this help staff scan information and complete a task faster?* If a visual choice doesn't serve that, it doesn't belong.

Core principles:

- **Dense but readable.** Admin users work in this interface for hours. Favor compact rows, tight but legible tables, and predictable rhythm over generous marketing-style whitespace. Density should never come at the cost of legibility — line-height, contrast, and touch targets still matter.
- **Functional first.** Every element earns its place by supporting a task: finding a record, changing a status, reading a number. Nothing exists purely to look nice.
- **Premium but restrained.** Comparable in quality to Shopify Admin, Stripe Dashboard, Saleor Dashboard, Medusa Admin, Linear, and Vercel Dashboard — but restraint is the mechanism for that quality, not embellishment. Premium here means consistent radii, calm shadows, quiet motion, and confident typography, not gradients, illustrations, or flourish.
- **Low-noise UI.** Reduce the number of colours, borders, and shadows competing for attention on a single screen. Every extra visual signal has to justify itself.
- **Content-first layout.** The data is the interface. Chrome (sidebar, topbar, filters) should recede so tables, forms, and stats can lead.
- **Admin, not storefront.** `frontend-store` sells; `frontend-admin` operates. Storefront patterns like large hero imagery, marketing copy, or decorative banners have no place here.
- **Fast scanning and quick actions.** Staff should be able to skim a page and locate the one row, one number, or one button they need within seconds. Row actions, keyboard shortcuts, and clear hierarchy all serve this.
- **No decorative clutter.** No emoji, no illustration filler, no gratuitous icons, no unnecessary dividers. If a decorative element doesn't aid scanning or comprehension, remove it.

---

## 2. Colour System

### Roles

- **Primary** — the admin's core interactive colour (buttons, active nav states, links, focus rings). Used sparingly and intentionally; it should mark the one or two things on a screen the user is meant to act on, not decorate the page.
- **Accent** — a secondary interactive colour available for supporting emphasis (e.g. secondary CTAs, highlights) without competing with primary.
- **Neutral surfaces** — `background`, `background-subtle`, `surface`, and `surface-elevated` build the layered feel of the app: page background sits lowest, cards and panels sit above it, and elevated surfaces (popovers, dropdowns) sit above those. Layering should be readable through subtle brightness/shadow differences, not heavy borders.
- **Semantic states** — `success`, `warning`, `danger`, `info` each have a strong variant (text, icons, active states) and a `-subtle` variant (backgrounds for badges, banners, alert fills). Never invent new semantic hues outside these four; every status in the product should map onto one of them.
- **Text hierarchy** — `text-primary` for headings and primary content, `text-secondary` for supporting copy, `text-muted`/`text-tertiary` for de-emphasized metadata (timestamps, helper text, counts), `text-inverse`/`text-on-primary` for text sitting on solid primary-coloured surfaces.
- **Borders** — `border` for standard dividers and input outlines, `border-light` for the quietest separators (e.g. inside a table between rows), `border-strong` for cases needing more definition (e.g. scrollbar thumbs, focus outlines before the focus ring itself).

### Dark mode vs. light mode

The two themes are not simple inversions of each other:

- **Light mode** should read as clean and crisp — bright neutral surfaces, moderate contrast borders, and shadows that stay soft and only slightly present (`shadow-xs`/`shadow-sm`).
- **Dark mode** should read as deep and premium — surfaces sit at different depths of dark rather than one flat black, primary shifts to a lighter, higher-chroma value so it stays visible against dark surfaces, and shadows do less work (dark-on-dark can't rely on drop shadows the way light mode does — depth comes more from surface colour steps and borders).

### Avoiding hardcoded colours

Colours are never written as literal hex/rgb values inside component files. Every colour decision references a token (e.g. `hsl(var(--primary))`, `bg-surface`, `text-muted`) so that a single edit to `tokens.css` can retheme the whole app. If a new colour need arises that no existing token covers, the correct move is to propose a new token — not to hardcode a one-off value.

---

## 3. tokens.css — Source of Truth

`tokens.css` (in `frontend-admin/src/styles/`) is the **single authority** for every visual primitive in the admin: colour, radius, shadow, spacing scale, and motion timing. It is loaded once, at the top of `globals.css`, and every component reads from it rather than defining its own values.

What must always be reused from tokens rather than redefined per component:

- **CSS variables** for all colour (`--primary`, `--surface`, `--border`, semantic states, etc.)
- **Radius scale** (`--radius-sm` through `--radius-full`) — component radius choices should map onto this scale, never an arbitrary pixel value
- **Shadows** (`--shadow-xs` through `--shadow-lg`, plus `--shadow-focus-ring`) — elevation should be expressed through this scale, not ad-hoc `box-shadow` values
- **Spacing scale** — Tailwind's spacing scale is treated as the project's spacing tokens; component padding/margin/gap should snap to it
- **Sidebar widths** — the expanded and collapsed sidebar widths are fixed values owned by the layout system, not something individual pages should override
- **Card backgrounds** — cards and panels use the `admin-surface` utility class (`bg-surface` + `border-border` + `shadow-xs` + rounded corners) rather than each component re-declaring the same combination
- **Hover states** — hover treatments (e.g. `--primary-hover`, `--accent-hover`) come from the token file's dedicated hover variants, not from ad-hoc opacity or brightness filters
- **Focus states** — focus is always expressed via `--shadow-focus-ring`, keeping focus visually consistent across every interactive element

Any new component that needs a colour, radius, shadow, or spacing decision should be checked against `tokens.css` first. If a suitable token exists, it must be used. If genuinely none exists, that's a signal to extend the token file — not to introduce a one-off value in a component.

The admin and the store (`frontend-store`) both use the same token **names** with different underlying values (e.g. the store's primary blue is a shade brighter than the admin's). This is intentional — it keeps a future shared design system possible — but tokens must never be cross-imported between the two apps.

---

## 4. Typography

- **Typeface:** a single variable sans-serif font family is used throughout (with system-ui fallbacks). No secondary display font, no serif accents — one type family keeps the interface calm and consistent.
- **Heading hierarchy:** page titles are the largest and boldest text on a screen and should appear exactly once per page, at the top, establishing what the page is about. Section headings within a page (card titles, table section labels) are visually distinct from the page title but still clearly heavier than body text.
- **Page title style:** short, direct, and task-oriented ("Products", "Order #10234"), not a marketing-style sentence.
- **Table text:** table body text uses a smaller, regular-weight size than page content — tables prioritize fitting more rows on screen over generous type size. Header row labels are smaller still, often with a lighter text-muted colour, to visually recede below the data itself.
- **Label style:** form and filter labels are small, medium-weight, and placed with clear proximity to their field so the relationship is unambiguous at a glance.
- **Helper text:** always smaller and quieter (`text-muted`/`text-tertiary`) than the label or value it supports, so it doesn't compete with primary content.
- **Numeric/stat presentation:** large numeric values (dashboard stats, totals) are set noticeably larger and heavier than surrounding text, since numbers are frequently the single most important thing on a card. Trend indicators (up/down %) sit adjacent at a smaller size, colour-coded via semantic tokens (success/danger), never colour alone without an icon.
- **Truncation:** long values (product names, emails, order numbers in narrow columns) truncate with ellipsis rather than wrapping and breaking row height consistency; the full value should be available via a tooltip or the detail page, not lost.
- **Line-height and readability:** body copy uses a relaxed line-height so paragraphs of helper text and descriptions stay easy to read; dense table rows use a tighter effective line-height (governed by row padding, not the font's line-height itself) to preserve density.

---

## 5. Layout System

- **Sidebar:** fixed to one side, persistent on desktop, drawer-style on mobile. See §6.
- **Topbar:** a slim horizontal bar above the content area, housing breadcrumbs/page context, global search entry point, notifications, and the user menu. It should never grow tall enough to compete with the page content for attention.
- **Content area:** the remaining space after sidebar and topbar, where page-specific content renders. This area scrolls independently — sidebar and topbar remain fixed in place.
- **Page headers:** each page opens with a header containing the page title, optional breadcrumbs, and primary page-level actions (e.g. "Add product") aligned to the same row. Secondary filters/search live just below, not crowded into the header row itself.
- **Content width:** content is constrained to a maximum width and centred/padded consistently (the `container-page` utility), so pages don't stretch into unreadably wide tables or forms on large monitors.
- **Spacing rhythm:** a consistent vertical rhythm between page header, filters, and content blocks (cards, tables) should repeat identically across every page — a user should never have to relearn spacing from one page to the next.
- **Responsive breakpoints:** the layout collapses at standard breakpoints — sidebar becomes a drawer, multi-column stat grids stack, tables gain horizontal scroll or collapse to a card-per-row pattern below a defined width. Every page must be usable, not just visible, at mobile widths.
- **Dense but not cramped:** achieve density through smaller text sizes and tighter row heights, not by removing padding to the point that adjacent elements touch or focus rings get clipped.

---

## 6. Sidebar UX

- **Permanent on desktop.** The sidebar is always present at desktop widths — it is the primary navigation surface and should never require an extra click to reveal.
- **Collapsible desktop mode.** A dedicated, clearly visible collapse button toggles the sidebar between full width (icon + label) and a narrow icon-only rail. This should be a deliberate, easy-to-find control — not a hidden gesture.
- **Remembered collapsed state.** Once a user collapses the sidebar, that preference should persist across sessions rather than resetting on reload.
- **Mobile drawer mode.** Below the responsive breakpoint, the sidebar becomes an off-canvas drawer that slides in over the content, with a backdrop behind it. It closes on `Escape` and on backdrop click/tap.
- **Grouped navigation sections.** Nav items are organised into logical groups (e.g. catalog-related items together, order-related items together) with clear but understated group separation — not heavy dividers, just spacing and optional small group labels.
- **Icon + label pattern.** Every nav item pairs one icon with one label. In collapsed/icon-only mode, the icon alone must still be identifiable (via tooltip on hover, at minimum).
- **Active states.** The current page's nav item is unmistakably marked — typically a filled/tinted background using the primary token family plus a bolder label — and this treatment must be visually identical whether the sidebar is expanded or collapsed.
- **Better mobile usability.** Touch targets in the mobile drawer should be generously sized (larger than the desktop rail's icon targets), since the drawer is a touch-first surface.

---

## 7. Topbar UX

- Houses page context (breadcrumbs or current section) on the leading edge, and utility actions (search trigger, notifications, user menu) on the trailing edge.
- Should stay visually quiet — a thin bottom border or subtle shadow separating it from content is enough; it should not carry its own heavy background colour distinct from the page.
- The search trigger should be an obviously clickable affordance (not just a bare icon with no visual container) and should communicate its keyboard shortcut where space allows.
- Notification and user-menu icons follow the same icon-button treatment used elsewhere (see §18), with the notification icon carrying a badge per §15.

---

## 8. Search UX

The global search overlay is one of the highest-polish surfaces in the product — it's a modal that appears frequently and needs to feel instant and trustworthy.

- **Premium overlay feel.** Centred, elevated (`shadow-lg`), with a backdrop that dims the rest of the app so attention is fully on the search field and results.
- **Escape closes it.** Always. No exceptions, no confirmation step.
- **Visible close button.** In addition to `Escape`, there must be an explicit, clickable close affordance — never rely on keyboard-only dismissal.
- **Focus trap.** While open, keyboard focus stays within the overlay (input and result list); it must not be possible to tab out into the page behind it.
- **Clear results presentation.** Results should be grouped or labelled by type (e.g. products, orders, customers) when the search spans multiple domains, so users immediately understand what they're looking at.
- **Keyboard navigation.** Arrow keys move through results, `Enter` selects the highlighted result — the overlay should be fully usable without touching the mouse.
- **Feels fast.** Typing should produce a response with no perceptible stutter; if a query is in flight, a lightweight loading indicator (not a full-page spinner) should show inside the results area.
- **Honesty about live search.** If search is not actually live/instant against the backend (e.g. it only searches local navigation, or requires pressing Enter), the UI must communicate this plainly rather than implying a live search experience it doesn't deliver. **Not confirmed:** whether the current implementation is fully live against the API or partially local — verify against `GlobalSearch.tsx` before asserting either way in future work, and keep the UI's affordances honest about whichever is true.

---

## 9. Tables and List Pages

Tables are the primary admin pattern — most pages are fundamentally "a list of things with actions." Consistency across every table matters more than customizing each one.

- **Clear headers.** Column headers are always visible, distinguishable from body rows (via the type-hierarchy rules in §4), and describe their column unambiguously.
- **Sticky controls where useful.** On long tables, keeping the header row (and, where applicable, filter/search bar) pinned while the body scrolls helps users keep column context.
- **Search, filter, and pagination as a standard trio.** Every list page follows the same pattern: a search/filter row above the table, the table itself, and pagination controls below. Users should never have to relearn where these controls live from page to page.
- **Row actions.** Actions on a row (edit, delete, view detail) are grouped predictably — typically trailing the row — and destructive actions always route through a confirmation dialog (§16), never firing immediately.
- **Bulk selection where needed.** For pages where acting on many rows at once is a real workflow (e.g. bulk status change), a checkbox column plus a contextual bulk-action bar is the pattern — the bar should only appear once at least one row is selected.
- **No clutter.** Only show columns that support scanning or a decision. Prefer a "view details" pattern for secondary data over cramming every field into the row.
- **Clear visual hierarchy.** The most important column (usually the identifying one — name, order number) should be visually primary; supporting columns recede via type-hierarchy and colour choices.
- **Status badges and labels.** Any status value in a table (order status, product status, review approval state) renders as a badge (§15), never as plain coloured text alone.
- **Empty and loading states.** Tables with zero results render the shared `EmptyState` pattern (§13); tables awaiting data render skeleton rows (§14) that preserve the table's structure.

---

## 10. Forms

- **Labels above fields.** Not inline placeholders, not floating labels that disappear — a persistent label above each field so the field's purpose is never in question, especially once filled in.
- **Clear error states.** An invalid field gets a distinct visual treatment (danger-toned border/text) plus a specific inline message explaining what's wrong — never a generic "invalid" with no detail.
- **Helper text.** Supporting guidance sits directly below the field, in the quiet helper-text style from §4, and disappears or is replaced by the error message when validation fails.
- **Required markers.** Required fields are marked consistently (e.g. an asterisk) using the same convention across every form in the app.
- **Grouped sections.** Longer forms are broken into clearly headed sections (e.g. "Basic info," "Pricing," "Inventory") rather than one long undifferentiated list of fields.
- **Sticky save bars.** For long forms, a save/cancel bar that stays reachable (sticky at the bottom of the viewport or panel) prevents users from having to scroll back up to submit.
- **Safe destructive actions.** Any destructive action reachable from a form (delete, archive) is separated visually from the primary save action and confirmed before executing (§16).
- **No accidentally-submittable placeholders.** A field must never default to a value that looks intentional but wasn't chosen by the user (e.g. a price field pre-filled with `"0.00"`). Defaults should be empty, forcing real validation and a deliberate entry.
- **Consistent field widths and spacing.** Field sizing follows predictable rules (e.g. short fields like postal code stay narrow, long fields like description stay full-width) applied the same way across every form, not decided ad hoc per page.

---

## 11. Dashboard Design

- **Stat cards.** The primary dashboard building block: one clear metric, a label describing it, and optionally a trend indicator. Numeric presentation follows §4.
- **Trend indicators.** Up/down movement is shown with both an icon (arrow) and colour (success/danger tokens) — never colour alone — plus the magnitude of change.
- **Charts.** Used only where a shape-over-time or comparison genuinely aids understanding beyond a single number; see §12.
- **Recent activity.** A compact, scannable feed (e.g. recent orders) — list-styled, not table-styled, since it's a glance surface rather than a working surface.
- **Low stock / alert surfaces.** Rendered as a distinct, attention-appropriate block using the `warning` or `danger` semantic tokens, positioned so it's noticeable without dominating the page.
- **Quick actions.** A small set of the most common next steps (e.g. "Add product"), presented as buttons, not as another data table.
- **Empty state behaviour.** A dashboard with no data yet (new install, no orders) should explain what will appear here and how to get started — never show a blank grid of zero-value cards.
- **No fake numbers.** Every value shown must come from a real backend response. If data isn't available, show a neutral fallback (e.g. `'—'`) rather than a placeholder number.
- **Real data over decorative visuals.** A dashboard's job is to inform, not to look impressive — resist adding a chart or visual that doesn't correspond to something staff need to track.

---

## 12. Charts

- **Legible in both themes.** Line colours, gridlines, and labels must all read clearly in light and dark mode — verify explicitly in both rather than assuming one theme "just works" from the other.
- **Token-based colours.** Series colours come from the token palette (primary, accent, semantic colours) rather than a chart-library default palette, so charts feel native to the product rather than dropped in from a generic library.
- **Minimal grid noise.** Gridlines should be faint and only as frequent as needed to anchor the eye — dense gridlines compete with the data itself.
- **Clear tooltips.** Hovering a data point should surface an unambiguous tooltip (value, label, and date/category) styled consistently with the app's overlay treatment (§16), not the charting library's raw default tooltip style.
- **Real backend data only.** As with dashboards generally, no fabricated series — if the underlying data isn't available yet, show an empty/loading state instead of a chart with placeholder numbers.
- **Avoid overcomplication.** Favor the simplest chart type that tells the story (a line for trend over time, a bar for comparison) over multi-axis or multi-series charts that require a legend to decode.

---

## 13. Empty States

- **What a good empty state looks like:** an icon (never an emoji), a short explanatory headline, one line of supporting text, and — where relevant — a primary action to resolve the emptiness (e.g. "Add your first product").
- **Empty vs. not-found vs. loading:** these are three distinct states and must not be conflated.
  - *Empty* — the query succeeded and there's genuinely nothing there yet.
  - *Not found* — a specific lookup (e.g. a detail page for an id) failed to resolve.
  - *Loading* — data is in flight; see §14 for the correct treatment (skeletons), not an empty state shown prematurely.
- **Icons, not emoji.** Consistent with the app-wide iconography rule (§18).
- **Helpful actions.** Where the user has a clear next step, surface it directly in the empty state rather than leaving them to hunt for it elsewhere on the page.
- **Visual consistency.** Every empty state across the app should share the same layout pattern (icon, headline, supporting text, optional action) via the shared `EmptyState` component, so it's immediately recognisable regardless of which page produced it.

---

## 14. Loading States

- **Skeletons for content areas.** Tables, cards, and detail pages awaiting data should render skeleton placeholders that mirror the eventual layout (same row heights, same card shapes) so the page doesn't visually jump once data arrives.
- **Subtle spinners for full-surface loads.** A spinner is reserved for full-page loads or modal-scoped loading (e.g. submitting a form inside a dialog) — not used as a stand-in for content-shaped skeletons.
- **Preserve layout during loading.** The loading state should occupy the same space the loaded content will occupy, preventing layout shift when data resolves.
- **No jumpy UI.** Transitions from loading → loaded should not cause surrounding elements (header, filters, pagination) to shift position.
- **Match the indicator to the surface.** Tables get skeleton rows; stat cards get a skeleton block in place of the number; forms loading existing data get skeleton fields — never a single generic spinner substituting for all of these.

---

## 15. Notifications, Badges, and Status Indicators

- **Unread badge usage.** An unread-count badge appears on the notification icon only when the count is greater than zero — it should never show a visible "0" badge.
- **Notification count style.** A small, solid, high-contrast badge (typically using primary or danger depending on severity) anchored to the corner of its parent icon.
- **Severity colours.** Every status/severity indicator across the app maps onto the four semantic tokens — success, warning, danger, info — consistently. A given real-world state (e.g. "order cancelled") should always render in the same semantic colour everywhere it appears, not vary page to page.
- **Badge shapes.** Status badges use a consistent pill shape (`rounded-full`) with a subtle tinted background (the semantic `-subtle` token) and matching text colour — not a solid saturated fill that fights with surrounding content.
- **When to show or hide.** Badges should only appear when they convey real, current information (an actual unread count, an actual status). A badge shown "just in case" or permanently visible with no signal loses meaning.
- **Avoid noisy indicators.** Don't stack multiple badges/dots on the same element, and don't use colour-pulsing or attention-grabbing animation for routine status — reserve any motion for genuinely time-sensitive alerts, and even then keep it subtle.

---

## 16. Overlays, Drawers, Dialogs, and Modals

- **z-index discipline.** Overlay surfaces (modals, drawers, dropdowns, the search overlay, toasts) must have a clearly defined stacking order so that, for example, a confirmation dialog opened from within a drawer always renders above that drawer, never behind it.
- **Escape to close.** Every dismissible overlay closes on `Escape` as a baseline expectation.
- **Backdrop behaviour.** A dimmed backdrop sits behind the overlay; clicking it dismisses the overlay unless the action is a destructive confirmation the user must explicitly choose (in which case backdrop-click-to-dismiss is still fine — it's equivalent to cancelling).
- **Subtle motion.** Entrances/exits use a quick, understated transition (short duration, small scale/opacity change) — motion should communicate "this appeared" without drawing attention to itself.
- **Size and padding standards.** Modals and drawers follow the same padding and radius scale as cards elsewhere in the app (§3) so they feel like a natural extension of the UI, not a separate visual system.
- **Focus management.** Opening an overlay moves focus into it (typically the first interactive element or the primary input); closing it returns focus to the element that triggered it.
- **Premium overlay treatment.** Elevated shadow (`shadow-lg`), rounded corners consistent with cards, and a clear visual separation from the dimmed page behind it.

---

## 17. Scrollbar Styling

- The admin never uses the browser's default scrollbar appearance. Sidebar, tables, overlays, and any long scrollable panel use a slim, unobtrusive custom scrollbar.
- The scrollbar thumb uses a muted border-strength token (semi-transparent) rather than a bold, attention-grabbing colour — it should be discoverable but not decorative.
- The scrollbar track itself stays transparent, so it doesn't add a visible extra "channel" alongside the content.
- This treatment must work in both light and dark mode without separate overrides per theme — because it's built from theme-aware tokens, it should adapt automatically.
- The scrollbar is styled once, globally — individual components should not introduce their own scrollbar overrides.

---

## 18. Iconography

- **Icons, never emoji**, anywhere in the rendered UI — navigation, actions, empty states, stat cards, badges, banners, table cells.
- **Single icon family.** All icons come from one consistent icon set so stroke width, corner style, and visual weight match across the entire app. Mixing icon families (even if individually fine) breaks the sense of a unified system.
- **Size consistency.** Icons used in the same context (e.g. all nav icons, all row-action icons) share the same fixed size — icons should not appear to vary in scale within a single list or bar.
- **Usage contexts:** navigation items, action buttons/row actions, empty-state illustration, dashboard stat cards, and alert/banner leading icons are the main places icons appear. Each context has one consistent icon-plus-text pattern.
- **Avoid random mixing.** Don't reach for a differently-styled icon (outline vs. filled, different set) just because a "nicer" one exists online — consistency outranks any single icon's individual appeal.

---

## 19. Dark Mode and Light Mode

- **Both intentional, not inverted copies.** Simply inverting light-mode colours to make dark mode is a common shortcut that produces a flat, low-quality result. Each theme should be designed to feel good on its own terms (see §2 for the qualitative difference between them).
- **Light mode:** clean and crisp — bright surfaces, moderate-contrast borders, soft/minimal shadows.
- **Dark mode:** deep and premium — layered dark surfaces (not one flat black), a brightened primary colour for visibility, restrained reliance on shadows for depth.
- **Token-based switching.** Theme changes happen entirely by swapping the CSS custom property values under a `.dark`/`[data-theme="dark"]` selector — never via `prefers-color-scheme` media queries directly, since that would bypass the app's own theme toggle and state.
- **No theme-locked hardcoded colours.** Anything written as a literal colour value (rather than a token reference) is, by definition, going to look wrong in one of the two themes. This is one of the most common regressions to watch for in review.
- **Component behaviour in both modes.** Any new component must be checked in both themes before being considered done — shadows, borders, and semantic-state colours can behave differently enough between themes that a component tested only in one may have a subtle bug in the other.

---

## 20. Accessibility

- **Keyboard navigation.** Every interactive surface (nav, tables with row actions, search overlay, modals, dropdowns) must be fully operable via keyboard alone, not just mouse/touch.
- **Focus rings.** The shared focus-ring treatment (`--shadow-focus-ring`) must be visible on every focusable element — never suppressed with `outline: none` without an equivalent replacement.
- **Contrast.** Text-to-background contrast must remain legible in both themes, especially for `text-muted`/`text-tertiary` on their respective background tokens — quiet text should still be readable, not decoratively faint.
- **Screen-reader labels.** Icon-only buttons (collapse toggle, row actions, close buttons) require an accessible label, since there is no visible text for assistive technology to read.
- **Escape handling.** Consistent across every dismissible surface (§16), which also serves as a keyboard-accessibility requirement, not just a UX nicety.
- **Touch targets.** Interactive elements — especially in the mobile sidebar drawer and row actions — should be sized generously enough for reliable touch interaction, not just precise mouse clicks.
- **Readable tables.** Table markup and visual design should support screen readers navigating by row/column, and should never rely on colour alone to convey a status (badges pair colour with text, per §15).
- **Accessible dialogs and drawers.** Correct focus trapping and return-focus behaviour (§16) is itself an accessibility requirement, not only a polish detail.
- **No colour-only communication.** Every place colour conveys meaning (status, trend direction, validation state) must be paired with a second signal — an icon, a label, or text — so the information isn't lost for users who can't perceive the colour difference.

---

## 21. Premium Polish Rules

What separates a "functional admin" from a "premium admin" panel is entirely in the consistency of small details, not in adding more visual elements:

- Consistent radius across every card, input, button, and overlay — pulled from the token scale, never a one-off value.
- Consistent spacing rhythm repeated identically across every page.
- Subtle shadows used to express elevation, never used decoratively or excessively.
- Content aligned to a shared grid/column structure rather than eyeballed per page.
- Transitions that are quick and quiet — motion should never be the thing a user notices first.
- A calm visual hierarchy where exactly one or two things per screen are visually dominant (the primary action, the key metric) and everything else recedes appropriately.
- No oversized panels or cards with excessive empty padding just to "fill space."
- No cluttered iconography — one icon per concept, not decorative icon repetition.
- No cartoonish styling — no bouncy animations, no illustrated mascots, no playful colour combinations that undercut the "control panel" feel.
- No placeholder junk (lorem ipsum, fake avatars, filler numbers) ever reaching a page a real user can see.
- No emoji-based UI, anywhere, under any circumstance.

---

## 22. Do / Don't

**DO:**
- Use tokens for every colour, radius, shadow, and spacing decision.
- Use icons (from the single established icon family) for all visual indicators.
- Use real data everywhere — dashboards, charts, stat cards, tables.
- Keep every list page, form, and overlay consistent with the patterns in this guide.
- Support dark mode and light mode fully and intentionally for every new component.
- Keep the UI clean, dense, and functional — favor scanability over decoration.

**DON'T:**
- Use emojis anywhere in the UI.
- Hardcode colours (or radii, or shadows) when a token already exists for that purpose.
- Fabricate dashboard, chart, or stat data.
- Create oversized or noisy overlays that don't follow the standard modal/drawer treatment.
- Skip or override the shared scrollbar styling.
- Break established sidebar behaviour (collapse state, mobile drawer, Escape handling).
- Invent a parallel design language — extend `tokens.css`, don't sidestep it.
- Ship forms with placeholder values that could be submitted by accident.

---

## 23. Practical References

These are **descriptive** references for what "good" looks like — not implementation code.

- **A good dashboard card:** a label at the top in quiet, small text; a large, bold numeric value directly below it; an optional trend indicator (icon + percentage, semantic-coloured) beside or below the value; the whole card wrapped in the standard `admin-surface` treatment (rounded corners, subtle border, quiet shadow).
- **A good table row:** the primary identifying value (name, order number) leftmost and visually dominant; supporting columns in progressively quieter text; a status badge where relevant; row actions trailing, revealed clearly but without crowding; consistent row height matching every other row in the table, including skeleton rows.
- **A good empty state:** centred within its container; one representative icon above the text; a short, plain-language headline ("No products yet"); one line of supporting context; a single clear primary action button where one makes sense.
- **A good sidebar item:** icon and label evenly paired; comfortable padding matching every other item in its group; an unmistakable but understated active-state background when it's the current page; identical active-state logic whether the sidebar is expanded or collapsed to icon-only.
- **A good form section:** a short section heading; fields grouped by real-world relatedness (not just alphabetical or database order); consistent field widths for similar data types; helper text directly under each field where needed; validation errors appearing in place, not only in a summary banner.
- **A good search overlay:** appears centred with a dimmed backdrop; input focused immediately; results grouped by type with clear section labels; keyboard-navigable; a visible close affordance in addition to Escape.
- **A good notification badge:** a small, solid-coloured pill or dot anchored to the top corner of the bell icon, showing a real unread count, invisible entirely when that count is zero.
- **A good status pill:** rounded-full shape, tinted (subtle) background matching one of the four semantic tokens, label text in the corresponding stronger semantic colour, sized to match every other badge in the same table or list.

---

## 24. Design Summary for Future AI

The ten rules that override any other instinct when working on `frontend-admin` UI:

1. **This is a control panel, not a marketing site.** Every choice should serve faster scanning and task completion, not visual flourish.
2. **`tokens.css` is the only source of colour, radius, shadow, and spacing.** Never hardcode a value that a token already covers.
3. **No emoji, anywhere, ever.** Use the single established icon family instead.
4. **Every status maps to one of four semantic colours** (success/warning/danger/info) — consistently, everywhere it appears — and colour is never the only signal.
5. **Dark mode and light mode are both designed intentionally**, not derived by inverting the other. Check every new component in both.
6. **Real data only.** Never fabricate dashboard numbers, chart series, or stat values — show loading/empty states instead.
7. **Every dismissible surface closes on Escape, traps focus while open, and has a visible close control** — modals, drawers, and the global search overlay alike.
8. **Destructive actions always go through a confirmation dialog**, never fire immediately from a click.
9. **Loading states are skeletons shaped like their final content**, not generic spinners, and never cause layout shift when data arrives.
10. **Consistency beats novelty.** A new page should look like it belongs immediately next to every existing page — same spacing rhythm, same card treatment, same table pattern, same type scale. When in doubt, match what already exists rather than introducing something new.