# GoalPulse — Global Football Website

Static HTML/CSS/JavaScript website for GitHub Pages.

## Scope in this version
- Removed Botola Pro and Morocco-specific navigation/section.
- Competition filters are grouped into Europe, Americas and Asia.
- The competition dropdown filters fixtures already loaded for the selected date.
- Supported league list includes European competitions, MLS/Brazil/Argentina/Mexico, Saudi Pro League, Japan J1 League and Australia A-League.
- Standings list includes Premier League, La Liga, Champions League, MLS and J1 League as quick selections.

## Data limitations
The site uses ESPN public, undocumented JSON endpoints. These are not a guaranteed developer API; some league endpoints may return HTTP errors or no fixtures. The page must not be described as fully verified until the live Network requests return successful responses and real match data. For reliable production use, choose a licensed football data provider and check competition coverage.

## Publish on GitHub Pages
1. Extract the ZIP.
2. Replace `index.html`, `script.js`, `styles.css` and `README.md` in `goalpulse-football-site`.
3. Commit changes to the branch used by GitHub Pages.
4. Wait for deployment, then hard refresh with Ctrl+Shift+R.
5. Test the filters and check DevTools → Network → Fetch/XHR for failed requests.
