/**
 * GoalPulse API-Football proxy for Cloudflare Workers.
 * Configure Worker secret: API_FOOTBALL_KEY
 * Routes: /fixtures?date=YYYY-MM-DD&timezone=Africa/Casablanca
 *         /standings?league=39&season=2026
 */
const API_ORIGIN = "https://v3.football.api-sports.io";
const ALLOWED_ORIGIN = "*"; // Replace with your GitHub Pages origin for production.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=60"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") return new Response(JSON.stringify({ error: "GET only" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
    if (!env.API_FOOTBALL_KEY) return new Response(JSON.stringify({ error: "Worker secret API_FOOTBALL_KEY is missing" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const allowed = new Set(["/fixtures", "/standings"]);
    if (!allowed.has(url.pathname)) return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    const params = new URLSearchParams();
    if (url.pathname === "/fixtures") {
      const date = url.searchParams.get("date");
      if (!date || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      params.set("date", date);
      params.set("timezone", url.searchParams.get("timezone") || "Africa/Casablanca");
    } else {
      const league = url.searchParams.get("league");
      const season = url.searchParams.get("season");
      if (!/^\\d+$/.test(league || "") || !/^\\d{4}$/.test(season || "")) return new Response(JSON.stringify({ error: "league and season are required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      params.set("league", league);
      params.set("season", season);
    }
    const cacheKey = new Request(url.origin + url.pathname + "?" + params.toString(), request);
    const cached = await caches.default.match(cacheKey);
    if (cached) return new Response(cached.body, { status: cached.status, headers: { ...Object.fromEntries(cached.headers), ...cors } });
    const upstream = await fetch(API_ORIGIN + url.pathname + "?" + params.toString(), {
      headers: { "x-apisports-key": env.API_FOOTBALL_KEY, "Accept": "application/json" }
    });
    const body = await upstream.text();
    const response = new Response(body, { status: upstream.status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });
    if (upstream.ok) ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  }
};
