# GoalPulse — CORS fix for standings

The browser console showed a CORS block for ESPN standings. This is not fixable with frontend JavaScript alone. This package adds a small Cloudflare Worker proxy and updates `script.js` to use it once configured.

## Files
- `index.html`, `script.js`, `styles.css`: current GoalPulse site files; layout preserved.
- `worker.js`: Cloudflare Worker proxy, restricted to `https://site.api.espn.com/apis/...`.
- `README.md`: these instructions.

## Step 1 — Deploy the Worker
1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Worker (for example, `goalpulse-espn-proxy`).
3. Open its code editor, replace the starter code with the full contents of `worker.js`, and deploy.
4. Copy the Worker URL, which looks like `https://goalpulse-espn-proxy.<your-subdomain>.workers.dev`.
5. Test it by opening this URL in a browser (replace `WORKER_URL` with your actual URL):
   `WORKER_URL/?url=https%3A%2F%2Fsite.api.espn.com%2Fapis%2Fv2%2Fsports%2Fsoccer%2Feng.1%2Fstandings`
   You should see JSON data, not a CORS error.

## Step 2 — Configure the website
1. In `script.js`, find:
   `const ESPN_PROXY = "";`
2. Replace the empty string with your deployed Worker URL, for example:
   `const ESPN_PROXY = "https://goalpulse-espn-proxy.<your-subdomain>.workers.dev";`
   Do not include a trailing slash.
3. Upload/replace `index.html`, `script.js`, and `styles.css` in the root of the GitHub repository and commit the changes.
4. Wait for GitHub Pages to deploy, then hard-refresh with `Ctrl + Shift + R`.

## Step 3 — Verify
- Open DevTools → Network and reload.
- The standings request should go to your `workers.dev` URL and return 200.
- The standings table should populate if ESPN returns standings for that competition.
- If ESPN has no data or changes its undocumented API, the table may still be unavailable; the proxy only addresses browser CORS.

## Important
- `worker.js` is not automatically executed by GitHub Pages. It must be deployed separately as a Cloudflare Worker.
- ESPN endpoints are public but undocumented and not guaranteed stable. Do not expose private keys in frontend code (this Worker does not need any).
