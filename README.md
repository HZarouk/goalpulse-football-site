# GoalPulse — Botola, Ligue 1, Bundesliga, La Liga, Serie A (SportScore)

## Fichiers
- `worker.js`, `wrangler.toml`: proxy Cloudflare Worker (cache, stale fallback, timeout 8 s, KV, cron).
- `index.html`, `script.js`, `styles.css`: front GitHub Pages.

## Déploiement Worker
1. Cloudflare → goalpulse-api → Edit code → coller `worker.js` → Deploy.
2. Settings → Variables and Secrets: `ADMIN_KEY` (Secret) doit exister.
3. Bindings: `GOALPULSE_KV` → namespace `goalpulse-kv`.
4. Triggers: cron `0 1 * * *`.

## Déploiement front
1. GitHub: remplacer `index.html`, `script.js`, `styles.css` dans `goalpulse-football-site`.
2. Attendre 2 min, puis Ctrl + F5.

## Tests
- /health
- /api/matches?date=YYYY-MM-DD
- /api/standings?league=botola|ligue1|bundesliga|laliga|seriea
- /api/topscorers?league=botola|ligue1|bundesliga|laliga|seriea
- /api/admin/archive?key=ADMIN_KEY&date=YYYY-MM-DD (archive manuelle dans KV)

## Attribution
Le lien "Powered by SportScore" (dofollow) doit rester visible dans le footer.

## Championnats
- Ajoutés: Premier League (`premier`), Champions League (`champions`).
- Slugs SportScore à vérifier: `english-premier-league`, `uefa-champions-league` (worker.js, LEAGUES).
- Section Actualités supprimée (front et endpoint /api/news).
