# Saeno Studio website

A minimal Japandi-style one-page site with a floating 3D logo in Three.js. It needs no build step.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Any static host works for deploying (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Structure

```
index.html              Page markup and all copy
favicon.svg             Logo mark (favicon)
site.webmanifest, robots.txt
assets/css/style.css    Japandi design system, layout, CSS animations
assets/js/main.js       Loader, text reveals, cursor, magnetic buttons, nav, project list
assets/js/scene.js      Three.js: 3D logo mark and drifting dust
assets/js/projects.js   ← project list (edit this to add projects)
assets/img/logo-mark.svg
assets/img/projects/    Project screenshots (optional)
```

## Adding a project

Add an object to `assets/js/projects.js` (name, url, category, year, summary, tags, image).

## Files still needed from you

| File | Where | Spec |
|---|---|---|
| **Logo mark (vector)** | `assets/img/logo-mark.svg` + `favicon.svg` | SVG of the "S" mark only, transparent background. The current one is a hand-made reconstruction. |
| **Full logo (vector)** | `assets/img/logo-full.svg` | Mark + "saeno studio" + tagline, transparent background |
| **Brand font names** | n/a | Which fonts the wordmark and tagline use (they look like Montserrat; the site uses Montserrat for now) |
| **Other projects** | `assets/js/projects.js` | Name, URL, one-line summary, year, category, image |
| **SK00R launch year** | `assets/js/projects.js` | Currently shows "Live" |
| **Contact email** | `index.html` (`#contact` + JSON-LD) | Set to `hello@saeno-studio.com`. Confirm this mailbox exists |
| **Social share image** | `assets/img/og-image.jpg` | 1200×630 |
| **Copy review** | `index.html` | Hero, principles, approach and services text are draft copy |

## Prompt for ChatGPT (logo files)

Attach the original logo image and paste:

> I'm attaching my company logo, "saeno studio, Technology with purpose". Recreate it as clean, production-ready vector artwork and keep the design exactly the same. Don't redesign or "improve" it.
>
> **The mark:** two identical leaf/drop shapes forming an "S". Each shape has one straight edge, one large rounded end and one sharp pointed corner. The top shape has a flat top edge, its rounded end on the left and its sharp point at the top-right. The bottom shape is the same shape rotated 180°: flat bottom edge, rounded end on the right, sharp point at the bottom-left. They overlap in the middle.
>
> **Gradients (important, keep them):**
> - Top shape: soft linear gradient from warm taupe `#B09A87` (top-left) to light sand/greige `#DCD0C3` (bottom-right).
> - Bottom shape: linear gradient from warm grey `#8E8A84` (bottom-left) to near-black charcoal `#262522` (top-right).
> - Overlap area: muted olive/khaki, `#8E8758` → `#6F6A43`, as if the two translucent shapes mix.
> - Smooth, matte, slightly paper-like. No glow, no 3D bevel, no shadow.
>
> **Wordmark:** "saeno" in a bold geometric sans-serif and "studio" in the same typeface in light/thin weight, lowercase, near-black `#1E1D1B`. Tagline "Technology with purpose" below it, in a regular weight with wide letter-spacing.
>
> **Deliver, all on a transparent background:**
> 1. The mark only, square canvas, 2048×2048 PNG
> 2. The full horizontal logo (mark + wordmark + tagline), 4000 px wide PNG
> 3. The mark in a single colour, charcoal `#262522`
> 4. The full logo reversed for dark backgrounds (wordmark in `#F2EDE4`)
> 5. If you can, an SVG version of 1 and 2 with real `<linearGradient>` fills, so the gradients stay editable
>
> Also tell me the exact font you think the wordmark uses.

ChatGPT's image generator outputs raster images. If it can't produce a real SVG, vectorize the PNG with a tool like vectorizer.ai or Illustrator's Image Trace (keeping gradients). Or send me the PNGs and I'll rebuild the SVG paths to match.

## Cache busting

CSS and JS links carry a `?v=` version (in `index.html` and in the imports at the top of `assets/js/main.js`). Bump it whenever you change those files so browsers and Cloudflare fetch the new version.
