# GoalPulse — Football Website Demo

A responsive, static football website concept built with HTML, CSS and vanilla JavaScript. It is designed to be tested free on GitHub Pages before purchasing a domain.

## What is included
- Responsive home page (desktop and mobile)
- Match-centre cards with filters: all / international / Morocco
- Interactive sample league tables (Premier League, La Liga, Botola Pro, Champions League)
- Editorial story cards
- Search across sample fixtures and stories
- Morocco spotlight section
- Demo newsletter form (does not collect or send email)
- No external libraries, build tools, or API keys required

## Important: demo data
This project intentionally uses illustrative fixtures and sample table rows to test the design and interactions. **They are not current, live, verified scores or standings.** Keep the demo banner visible until a real, permitted data source is connected. Some sample international standings are illustrative examples and should not be published as current data.

## Test locally
1. Download and unzip the project.
2. Open `index.html` in Chrome, Firefox, or Edge.
3. Test the nav links, search button, fixture filters, and league selectors.
4. Resize the browser or use mobile device emulation to test responsive layout.

## Publish for free with GitHub Pages
1. Sign in to GitHub and create a new **public** repository, e.g. `goalpulse-football-site`.
2. Upload the files and folders from this project. `index.html`, `styles.css`, `script.js`, and `assets/` must be in the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then click **Save**.
6. Wait for the published URL shown in Settings → Pages. It will look like `https://YOUR-USERNAME.github.io/goalpulse-football-site/`.
7. Open the URL on desktop and mobile. GitHub may take a few minutes to publish.

## Before launch / monetization
- Connect a reliable football data API after reviewing coverage, rate limits, attribution rules, and commercial-use terms. Never put a secret API key in public JavaScript.
- Replace all sample data and placeholder stories with verified fixtures and original content.
- Add About, Contact, Privacy Policy, Terms, and editorial/source notes.
- Configure analytics and Search Console if desired.
- AdSense approval is not guaranteed. Apply only when the site has useful original content and meets Google's current policies.
- For automatic live data, use a secure backend/serverless function or a trusted provider's supported public integration rather than exposing secret credentials in client-side code.

## Files
- `index.html` — page structure and metadata
- `styles.css` — visual design and responsive styling
- `script.js` — demo fixtures, tables, search and interactions
- `assets/favicon.svg` — simple GoalPulse icon
