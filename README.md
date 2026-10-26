# GoalPulse — API-Football secure integration

This package prepares the site to use API-Football for fixtures and standings, including a competition dropdown and Botola Pro/Botola 2 entries. It is **not live until you create an API key, deploy the Worker, and configure `API_BASE`**.

## What changed
- Replaces ESPN fixture/standings calls with API-Football through a secure Cloudflare Worker.
- Adds supported competition IDs and date-specific fixtures.
- Keeps the API key out of public GitHub JavaScript.
- Styles the competition dropdown to match GoalPulse's dark UI.
- Includes Botola Pro and Botola 2 IDs as configured candidates; actual season coverage must be confirmed from API response.

## Step 1 — Get a free API key
1. Create an account at https://dashboard.api-football.com/
2. The official free plan currently advertises 100 requests/day and 10 requests/minute. No credit card is required for the free tier.
3. Copy your key from Account / My Access. Do not paste it into `script.js` or public GitHub files.

## Step 2 — Deploy the proxy
1. Open https://dash.cloudflare.com/ and create a Worker (Workers & Pages).
2. Replace its starter code with `worker.js` from this package.
3. In Worker Settings → Variables and Secrets, add a **Secret** named `API_FOOTBALL_KEY` and paste your API key as its value.
4. Deploy. Copy the Worker URL, e.g. `https://goalpulse-api.<your-account>.workers.dev`.
5. For production, change `ALLOWED_ORIGIN` in worker.js from `*` to `https://hzarouk.github.io` and redeploy. This is browser-origin restriction, not API-key authentication.

## Step 3 — Connect GoalPulse
1. In `script.js`, replace `PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE` with your Worker URL (no trailing slash).
2. Upload/replace the site's `index.html`, `styles.css`, `script.js`, `README.md`, and `assets/favicon.svg` in your GitHub repo. Do not upload `worker.js` as a public site asset; deploy it in Cloudflare.
3. Commit changes, wait for Pages, then hard-refresh with Ctrl+F5.

## Step 4 — Test carefully
- Test today's fixtures and a past date.
- Test Premier League and Botola Pro standings.
- If a league returns no table, verify its current season and coverage using the provider's `/leagues?id=...&season=...` endpoint. IDs/seasons can vary in coverage; do not assume all competitions have full data.
- Check API dashboard request usage. The free plan's 100 requests/day can be exhausted during testing. Worker caches responses for 60 seconds to reduce repeated calls.
- Botola coverage must be confirmed from the actual response before advertising it as live.

## Notes
- This is a starter integration, not yet a verified live deployment. The API key and Worker URL are account-specific, so I cannot activate the provider on your account from this ZIP alone.
- API-Football says data availability varies by competition/season. Review its current coverage and terms before using commercially.
- News remains on the existing site feed; this package changes fixtures and standings, not news.
