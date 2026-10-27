GOALPULSE V7 — SportScore source + reduced API calls

Files: index.html, script.js, styles.css.

Changes from V6:
- Uses SportScore public API directly; the API-Football Cloudflare Worker and API_FOOTBALL_KEY are not needed by this frontend.
- Adds a 60-second in-memory cache for repeated identical requests.
- Loads the 7-day history sequentially instead of firing seven requests at once.
- Keeps the visible Powered by SportScore attribution link required by SportScore's published terms.
- Keeps fabricated news and scorer figures removed; the news section remains an honest placeholder until a verified news source is integrated.

Important: this environment could not verify live API responses. Deploy and test in the browser. SportScore's free public API has usage limits and availability is not guaranteed.
