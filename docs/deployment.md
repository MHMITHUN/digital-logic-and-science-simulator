# Deployment — Vercel

The app is fully client-side: **no database, no auth, no environment
variables, no server code to configure.** The default Vercel import works
unchanged.

## Steps

1. **Push the repository to GitHub** (the project is a standard Next.js
   App Router app; nothing needs to be cleaned for deploy — `AGENTS.md` and
   `CLAUDE.md`, which the Next dev server auto-generates at the root, are
   already in `.gitignore` and must never be committed).

2. **Import on Vercel**
   - Open [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
   - Select the `02-Digital-Logic-And-Science-Simulator` repository.
   - Vercel auto-detects **Next.js** — keep every default:
     - Framework Preset: Next.js
     - Build Command: `next build`
     - Output: default
     - Install Command: default (`npm install`)

3. **Environment variables: none.** Leave the section empty — there is
   nothing to configure and no `.env` to copy. (Reserved names for the
   optional teacher-authored-lesson storage idea, e.g. `MONGODB_URI`, are
   documented in the README's Future Enhancements and are *not* used by the
   current build.)

4. **Deploy.** First build takes a minute or two. Open the produced URL —
   all eight routes (`/`, `/logic`, `/logic/builder`, `/number-system`,
   `/boolean`, `/physics`, `/classroom`, `/journal`) are served from the
   edge as static + client-side interactive pages.

5. **Paste the URL into the README's "Live Demo" section** and commit that
   one-line change.

## Post-deploy checklist

- [ ] Home page hero and all six module cards render.
- [ ] `/logic` — toggling input B changes the equation and the highlighted
      truth-table row (the smoke e2e covers this locally; a quick manual
      check on the deployed URL is enough).
- [ ] `/classroom` — press F for fullscreen; the header/footer disappear.
- [ ] `/journal` — add one entry; it survives a page reload (per-browser
      `localStorage`).
- [ ] Browser console shows no errors on any route.

## Notes and gotchas

- **Custom domain (optional):** Settings → Domains → add the domain and
  follow the DNS instructions. Nothing app-side changes.
- **Node version:** Vercel's default Node 22+ matches `engines` in
  `package.json` — no override needed.
- **Preview deployments** happen automatically for every branch/PR — handy
  for testing a change before merging it into the deployed main branch.
- **Everything works offline after first load** (no server round-trips),
  so a venue with flapping Wi-Fi will not break a live class once the page
  is open.
- Deploying elsewhere (Netlify, a VPS with `npm run build && npm start`)
  works too — the only requirement is a static-capable Node host for a
  Next.js build. Vercel is simply the zero-config path.

## Screenshots to capture for the README

Run `npm run dev` locally, then `node scripts/screenshots.mjs` (all shots in
one run, written into `docs/screenshots/`):

| File | Page / moment |
| --- | --- |
| `01-home.png` | `/` — hero + module cards |
| `02-logic-lab.png` | `/logic` — AND gate, A=1 B=1, signal mid-propagation |
| `03-number-system.png` | `/number-system` — 25 → binary with the division ladder |
| `04-boolean-kmap.png` | `/boolean` — K-map tab with two accepted groups |
| `05-physics.png` | `/physics` — Ohm solver with 12 V / 4 Ω → 3 A |
| `06-classroom.png` | `/classroom?e=decimal-binary` — mid-lesson, step 3 |
