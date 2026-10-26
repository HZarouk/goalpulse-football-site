# GoalPulse — Online Football Website Test

This is the online-data test build of GoalPulse. It is a static HTML/CSS/JavaScript site suitable for GitHub Pages.

## Online data in this build
- Date-based match scoreboards: choose a date, use previous/next day or Today; ESPN public JSON endpoints for supported competitions including Premier League, La Liga, Champions League, Ligue 1, Bundesliga, Serie A, Eredivisie, Primeira Liga, MLS, Saudi Pro League, Turkish Super Lig, Scottish Premiership, Europa League, Brazil Serie A, Argentina Primera División, Liga MX, J1 League and A-League. A new Competition dropdown lets visitors filter matches by an individual competition.
- League standings: ESPN endpoint for the selected supported competition.
- Headlines: ESPN online headlines for Premier League and Champions League.
- Refresh: scoreboards every 5 minutes; standings every 15 minutes.
- Botola Pro: not connected yet; the Morocco tab remains separate until a verified feed is available. The UI clearly says so rather than showing fake fixtures or tables.

## Important limitations
ESPN's public endpoints used here are undocumented and not guaranteed as a stable developer API. They may change or fail, and competition coverage can vary. Review applicable terms and rights before using this data commercially. For a production site, choose a licensed provider and confirm Botola Pro coverage. Do not present this as official ESPN partnership.
The site is static, so there is no private backend. Never put secret API keys in public JavaScript. If using a provider requiring a key, proxy requests through a serverless/backend service with the key stored as a secret.

## Test locally
Open `index.html` in a browser with internet access. Some browsers may limit `fetch` from local files; if so, test after publishing on GitHub Pages.

## Publish/update on GitHub Pages
1. Extract the ZIP.
2. Open your existing repository: `goalpulse-football-site`.
3. Upload/replace `index.html`, `styles.css`, `script.js`, `README.md` and `assets/favicon.svg`.
4. Commit the changes to the `main` branch.
5. Wait for GitHub Pages to redeploy, then hard-refresh the live site with Ctrl+F5.
6. Test the date picker with today and past dates, then check scoreboards, standings, news and mobile layout. Match availability varies by date and competition. The standings endpoint may remain unavailable because this public ESPN endpoint is undocumented.

## Current status
- Website UI: ready for test
- Online fixtures: connected to public ESPN endpoints
- Online standings: connected for supported competitions
- Online headlines: connected for Premier League and Champions League
- Botola Pro data: still requires a provider with verified coverage
- Newsletter, user accounts, subscriptions and ad monetization: not connected
