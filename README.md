# GoalPulse — Phase A upgrade

This package updates the current GoalPulse static site for the first phase of the agreed roadmap: **Leagues + News & Analysis**.

## What's changed
- League/table selector is generated from the same competition configuration used by Match Centre, instead of showing only five hard-coded choices.
- Competition list stays grouped across Europe, the Americas and Asia; Morocco/Botola is not included.
- News requests now try multiple supported competitions across Europe, the Americas and Asia, then display up to nine unique headlines from responses that succeed.
- News headlines/descriptions are HTML-escaped before rendering.
- Existing date selector, region filters, Match Centre and visual styling are retained.

## Install on GitHub Pages
1. Download and unzip this package.
2. In the `goalpulse-football-site` repository, replace `index.html`, `script.js`, `styles.css`, and `README.md` with the files from this package.
3. Commit the changes to the branch configured for GitHub Pages.
4. Wait for deployment, then open the site and press `Ctrl + Shift + R`.
5. Test each league in **Leagues & Tables** and check **News & Analysis**. News/standings coverage depends on ESPN's public, undocumented endpoints and can vary by competition.

## Important limitations
- This is a static front-end; no backend, account system, or email collection is implemented.
- ESPN endpoints are public but undocumented and are not a guaranteed developer API. A successful HTTP response does not guarantee data is available for every competition.
- The newsletter remains a visual preview and does not collect or send emails.
- This package has passed a JavaScript syntax check, but must still be tested on the deployed GitHub Pages site and on mobile devices.
