# GoalPulse — Phase C: Match Details

This package adds a responsive match-details modal to the current GoalPulse Phase B site.

## New features
- Click or keyboard-activate any match card to open Match Details.
- Overview tab: match status, scheduled time, venue, and event timeline when supplied by ESPN.
- Statistics tab: displays available team statistics only; unavailable values are not fabricated.
- Lineups tab: displays player data when supplied by the endpoint.
- Mobile-friendly layout, Escape-to-close, backdrop click, and visible focus styles.
- Existing fixtures, filters, date controls, standings, news, and page layout are retained.

## Deploy
1. Download and unzip this package.
2. In the `goalpulse-football-site` GitHub repository, upload/replace `index.html`, `script.js`, and `styles.css` in the repository root.
3. Commit the changes and wait for GitHub Pages to deploy.
4. Open the site and hard-refresh with `Ctrl + Shift + R`.
5. Click a match card and test Overview, Statistics, Lineups, close button, backdrop click, and Escape key.

## Data limitations
The site uses ESPN public, undocumented JSON endpoints. These are not a guaranteed official developer API and may change. The endpoint may not provide statistics, lineups, or event timelines for every competition or match. The interface explicitly shows a not-available message when extra data cannot be retrieved; it does not invent match facts.

## QA note
JavaScript syntax was checked when packaging. A live browser/device test against the deployed site has not been performed as part of this package. Verify desktop and mobile behavior after deployment.
