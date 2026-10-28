# GoalPulse: Botola Pro + Ligue 1 (SportScore)

## Fichiers
- `worker.js`, `wrangler.toml`: proxy Cloudflare Worker (cache + stale fallback).
- `script.js`: front-end.
- `index.html`, `styles.css`: interface (index.html modifié: Botola + Ligue 1 bark).

## Deploy
1. Worker: Cloudflare → goalpulse-api → Edit code → paste `worker.js` → Deploy.
2. GitHub Pages: upload `index.html`, `script.js`, `styles.css` (et `worker.js` optionnel).
3. Ctrl + F5 après 2 dqayq.

## Tests
- /health
- /api/matches?date=YYYY-MM-DD
- /api/standings?league=botola
- /api/standings?league=ligue1
- /api/topscorers?league=botola

## Attribution
Lien "Powered by SportScore" (dofollow) obligatoire, lazem ybqa f footer.
