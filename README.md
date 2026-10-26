# GoalPulse — Phase B: Mobile & Launch Readiness

This package builds on the tested Phase A version (Leagues + News & Analysis) and focuses on responsive layout and usability.

## Included
- Improved mobile header and navigation spacing.
- Responsive match controls, competition selector and date controls.
- More robust mobile match cards and league selector layouts.
- Horizontally scrollable standings table on small screens.
- Improved spacing for news cards, newsletter and footer.
- Visible keyboard focus styles and reduced-motion support.
- No intentional changes to ESPN data endpoints or competition configuration.

## Deploy
1. Download and unzip this package.
2. Copy `index.html`, `script.js`, `styles.css`, and `README.md` from `gp_work/` into the root of your `goalpulse-football-site` GitHub repository, replacing the matching files.
3. Commit the changes and wait for GitHub Pages to deploy.
4. Hard-refresh the site with `Ctrl + Shift + R`.

## Mobile QA checklist
Test at approximately 360px, 390px, 768px, and desktop width:
- Header/menu and navigation links.
- Match region tabs, competition dropdown, date picker and Today button.
- Match cards without horizontal page overflow.
- League list and standings table (the table itself may scroll horizontally).
- News cards, newsletter form, footer links.
- Browser DevTools Console and Network for runtime/API errors.

## Verification note
The CSS changes have been reviewed statically and the JavaScript syntax check is run before packaging. A live browser/device test cannot be claimed from this package alone; complete the checklist against the deployed GitHub Pages site.

## Data note
The site uses public ESPN endpoints. Availability, competition coverage and data freshness depend on the upstream service; a successful HTTP response does not guarantee every competition has data for every date.
