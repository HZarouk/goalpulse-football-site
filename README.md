GOALPULSE V6 — SportScore

Files: index.html, script.js, styles.css

Fixes included:
- Constrains team crests so logos cannot expand over the page.
- Adds a 7-day history view using SportScore date fixtures.
- Removes hard-coded Premier League top-scorer numbers and attempts to load current data from SportScore.
- Avoids discarding fixtures when SportScore does not include a competition label in each match object.
- Continues to show no fabricated fallback scores.

Important: this is a code-level update only. The environment used to prepare it could not reach SportScore's API directly, so live API response shapes and league coverage still need to be tested after deployment. SportScore attribution must remain visible.
