# Tempo brand

**Motto:** Tracking the tempo of every set.

The wordmark is custom **lightning lettering**: angular letters with bolt-angle cuts, and the **T's stem is a lightning bolt**. That bolt-T is the mark of the whole system — it is the favicon, the submark and the stacked logo's icon. The bolt carries the brand gradient (light orange → orange → pink tip); the other letters are black on light backgrounds and white on dark ones. Everything is vector paths, so no font is required.

![Logo system](brand-sheet.png)

## The logos

| Logo | Use it for | Files | In the app |
| --- | --- | --- | --- |
| **Primary** — the TEMPO wordmark with the gradient bolt-T | Home hero, page headers, documents, anywhere there is horizontal room | `public/brand/tempo-primary.svg` (black letters), `tempo-primary-white.svg` (dark backgrounds), `tempo-primary-on-black.svg`, `tempo-primary-mono.svg` (one colour) | `<LogoPrimary width motto />` or `<Logo size />` |
| **Secondary** — the bolt-T mark stacked above a one-colour wordmark | Square or tall placements: splash screens, app store listings, social cards | `public/brand/tempo-secondary.svg`, `tempo-secondary-white.svg`, `tempo-secondary-on-black.svg` | `<LogoSecondary width motto />` or `<Logo variant="secondary" />` |
| **Mark** — the bare gradient bolt-T | Stickers, large icon placements, loading screens | `public/brand/tempo-mark.svg`, `tempo-mark-black.svg` | `<BoltT height />` |
| **Submark** — the bolt-T in a black circle with an orange ring and pink sparks | Top bars, avatars, social profile pictures, watermarks | `public/brand/tempo-submark.svg` (circle), `tempo-submark-square.svg`, `tempo-submark-mono.svg` | `<Submark size shape="circle|square" />` (`<LogoMark>` is the square submark used in the top bar) |
| **Favicon** — the bolt-T, solid orange, on a black rounded square (no gradient, ring or sparks) | Browser tab, installable app / home-screen icon, anything 16–64 px | `public/favicon.svg`, `public/brand/tempo-favicon.svg`, PNGs in `public/icons/` | `index.html`, `manifest.webmanifest` |

PNG exports live in `public/brand/png/` (primary 1600 px, secondary 1200 px, mark and submarks 512 px, favicon 256/32 px). Regenerate everything with `npm run brand` (and `npm run icons` for the PWA icon set) after editing `scripts/make-brand.mjs` or `src/components/Logo.tsx` — both carry the same letter geometry and must be kept in sync.

## Colours

| Role | Hex | Use |
| --- | --- | --- |
| Orange (primary) | `#ff6a00` | Main highlight: primary buttons, active states, Team A, the bolt-T |
| Black (secondary) | `#121212` | Secondary buttons, wordmark letters on light backgrounds, submark background |
| Pink (tertiary) | `#ff3d8a` | Accents: Team B, hit markers, badges, the bolt's tip and sparks |
| Gray | `#eef0f3` | App background |
| White | `#ffffff` | Surfaces (cards, bars) and wordmark letters on dark backgrounds |

Dark mode keeps orange and pink, flips the letters to white and the backgrounds to near-black (`#0f1012` / `#1a1b1e`).

## Rules of thumb

- Keep clear space around every logo of at least the bolt-T's width.
- Never recolour the bolt, un-skew or stretch the letters, or put the primary logo on orange or pink (use the mono submark there).
- Minimum sizes: primary 96 px wide, secondary 90 px wide, submark 24 px, favicon 16 px.
