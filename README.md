# GoalPulse — Botola, Ligue 1, Bundesliga, La Liga, Serie A (SportScore)

## Fichiers
- `worker.js`, `wrangler.toml`: proxy Cloudflare Worker (cache + stale fallback).
- `index.html`, `script.js`, `styles.css`: front GitHub Pages.

## Deploy
1. Cloudflare → goalpulse-api → Edit code → paste `worker.js` → Deploy.
2. GitHub: remplacer `index.html`, `script.js`, `styles.css` (et `worker.js` pour garder le code dans le repo).
3. Attendre 2 min, puis Ctrl + F5.

## Tests
- /health
- /api/matches?date=YYYY-MM-DD
- /api/standings?league=botola|ligue1|bundesliga|laliga|seriea
- /api/topscorers?league=botola|ligue1|bundesliga|laliga|seriea

## Attribution
Le lien "Powered by SportScore" (dofollow) doit rester visible dans le footer.
