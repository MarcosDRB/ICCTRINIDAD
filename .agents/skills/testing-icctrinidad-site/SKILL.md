---
name: testing-icctrinidad-site
description: How to run and UI-test the ICCTRINIDAD static site (Express + static HTML/CSS/JS), including responsive testing at tablet/mobile widths, known pre-existing issues, and gotchas.
---

# Testing the ICCTRINIDAD site

## Run it
```bash
cd /home/ubuntu/repos/ICCTRINIDAD
npm install          # only if node_modules missing
npm start            # serves http://localhost:3000
```
Pages are plain files: `index.html`, `conocenos.html`, `eventos.html`, `predicas.html`,
`liderazgo.html`, `grupos.html`, `testimonios.html`, `historias.html`, `diezmos.html`.
Shared behaviour lives in `scripts.js`; all CSS in `styles.css`. No login, no secrets, no API keys.

## Devin Secrets Needed
None.

## Shared JS behaviours worth re-checking on any new page
`scripts.js` (DOMContentLoaded) provides:
- mobile menu: `#menuBtn` toggles `.mobile-open` on `header nav ul` (button only rendered/visible below the
  Tailwind `md` breakpoint, i.e. < 768px CSS px).
- a back-to-top button injected into `<body>`; gets `.show` once `window.scrollY > 300`.
- `.reveal` sections get `.visible` when scrolled near viewport. Note `.reveal` in `styles.css` is already
  `opacity:1`, so content should never be invisible — if a section ever renders blank, that is a real bug.
A new page only gets these if it includes `<script src="scripts.js"></script>`.

## Responsive testing without DevTools emulation
Chrome's minimum window width on this box is ~532px, so you cannot reach a 390px viewport by resizing alone.
Workflow that works:
1. Tablet: `xdotool getactivewindow windowsize 916 1000` (≈884px CSS viewport), reload.
2. Mobile: resize to `406 880` (clamps to 532 → ~500px viewport), then press `ctrl+shift+equal`
   (NOT `ctrl+plus`, which xdotool may not deliver) a few times until
   `innerWidth` reads ~400px. Verify with a console snippet.
3. Reset with `ctrl+0` and `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`.
Useful measurement snippet:
```js
JSON.stringify({vw:innerWidth, scrollW:document.documentElement.scrollWidth})
```
plus, to locate an overflowing element:
```js
[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>e.tagName+'.'+e.className)
```

## Known pre-existing issues (do NOT attribute to a new PR without checking index.html first)
- Around 768–1000px the shared header's desktop `<ul class="hidden md:flex">` (9 links) overflows the
  viewport, giving ~150–200px of horizontal scroll and the site title overlapping the first nav item.
  Reproduces on `index.html` too. Always reproduce a suspected layout bug on another page before reporting
  it as a regression; a fix would be raising the mobile-menu breakpoint (e.g. `lg:flex`).
- The console always logs several `cdn.tailwindcss.com should not be used in production` warnings —
  warnings only, not errors.
- `predicas.html` shows an embedded YouTube player that may render "This video is unavailable" locally.
