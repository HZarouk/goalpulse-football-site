# GoalPulse — Match Details Reliability Patch

This package improves match detail loading by trying multiple ESPN summary hosts/schema versions and reading additional possible event collections (`scoringPlays`, `keyEvents`, commentary items). It does not fabricate scorers, statistics, lineups, or timelines when the provider has no data.

## Upload
Replace these files in the root of `HZarouk/goalpulse-football-site`:
- `index.html`
- `script.js`
- `styles.css`

The `index.html` and `styles.css` are retained from the Phase C package; `script.js` contains the patch. Upload/replace files, commit changes, then hard refresh the published site with Ctrl+Shift+R.

## Data reliability note
The site currently uses ESPN's public, undocumented JSON endpoints. They are not a guaranteed official developer API, and details availability can differ by competition and match. The patch tries fallbacks but cannot guarantee all match stats or lineups. For production-grade reliability, use a documented football data provider (for example API-Football or football-data.org) through a server-side scheduled job/GitHub Actions and keep any API key in GitHub Secrets, never in browser JavaScript.
