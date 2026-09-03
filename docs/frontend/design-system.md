# Design System

Defined via Tailwind CSS v4's `@theme` directive in [`src/app/globals.css`](../../frontend/src/app/globals.css) — no separate design-token file or config object, Tailwind v4 reads the theme straight out of CSS.

## Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#0D530E` | Primary brand green — buttons, active nav, headings |
| `--color-primary-light` | `#306D29` | Secondary/hover green |
| `--color-background` | `#FBF5DD` | App background (soft cream) |
| Body text | `#1c2d1b` | Set directly on `body`, not a theme token |

Use as Tailwind utilities: `bg-primary`, `text-primary-light`, `bg-background`, etc.

## Typography

| Token | Value |
|---|---|
| `--font-sans` | `"Stack Sans Text", sans-serif` (loaded via Google Fonts import, weights 200-700) |
| `--font-size-xs` | `0.85rem` |
| `--font-size-sm` | `0.95rem` |
| `--font-size-base` | `1.05rem` |

The base font size is intentionally bumped slightly above Tailwind's default `1rem` for readability on dashboard data displays.

## Utilities

- `.scrollbar-hide` — hides scrollbars cross-browser (used on horizontally-scrollable widget rows) while keeping scroll functional.

## Conventions

- No component library (no shadcn/ui, no MUI) — all UI is hand-built with Tailwind utility classes directly in `.tsx` files.
- Icons come from `react-icons` (primarily the `md` — Material Design — set), not a custom icon set.
- Keep new colors/fonts as `@theme` tokens in `globals.css` rather than hardcoding hex values in components, so the palette stays centrally editable.
