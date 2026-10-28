# GOALPULSE V11 — API-Football + Cloudflare Worker

This version replaces SportScore with API-Football behind a Cloudflare Worker proxy. The API key must stay in a Cloudflare secret; never place it in `script.js` or commit it to GitHub.

## What is included
- `index.html`, `styles.css`, `script.js`: GoalPulse front end.
- `worker.js`, `wrangler.toml`: proxy for fixtures, live matches, standings, top scorers and fixture details.

## Setup (free tiers; quotas apply)
1. Create a free account at https://www.api-football.com/ and activate the FREE plan. Its published quota is 100 requests/day, so cache results and avoid repeated refreshes.
2. In API-Football dashboard, open Account / My Access and copy your key. **Do not send the key in chat and do not paste it into website files.**
3. Create a free Cloudflare account at https://dash.cloudflare.com/ .
4. Open Workers & Pages → Create → Worker. Deploy `worker.js` (or use Wrangler CLI with this folder).
5. In the Worker settings → Variables and Secrets, add secret named `API_FOOTBALL_KEY` with your key. Save and deploy.
6. Open `https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/health`; it should return `{"ok":true,...}`.
7. In `script.js`, replace `https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev` in `API_BASE` with your real Worker URL. Commit and push the website files to GitHub Pages.
8. Test `/health`, then check the website. A valid key is needed for real data.

## Important limitations
- API-Football free tier is currently advertised as 100 requests/day. A public site can consume that quota quickly; this starter proxy does not yet provide shared persistent cache/rate-limiting, so don't advertise high-traffic readiness. Cloudflare Worker free tier has separate request limits.
- Historical availability depends on the API plan and the league/season. Data coverage varies by competition. The season is inferred as European-style season (July–June). Verify Botola Pro's coverage in API-Football dashboard before relying on it.
- Match details currently show fixture information; events, lineups and statistics are not fetched by this minimal proxy.
- The UI's history button still requests the last 7 days; the API free plan may limit older seasons.
- If the selected league has no data or the API returns an error, the UI should show unavailable/empty state rather than invented scores.

## Supported league IDs
Premier League 39, La Liga 140, Champions League 2, Serie A 135, Bundesliga 78, Ligue 1 61, Botola Pro 200. IDs follow API-Sports football league IDs; verify season coverage via the API response/dashboard.
