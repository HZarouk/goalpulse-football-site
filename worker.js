/*
  GoalPulse ESPN CORS proxy — deploy as a Cloudflare Worker.
  Only allows requests to ESPN's public JSON host. No API keys/secrets required.
*/
const ALLOWED_ORIGIN = "https://hzarouk.github.io";
const ALLOWED_HOST = "site.api.espn.com";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    const incoming = new URL(request.url);
    const targetParam = incoming.searchParams.get("url");
    if (!targetParam) {
      return new Response(JSON.stringify({ error: "Missing url query parameter" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    let target;
    try { target = new URL(targetParam); }
    catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (target.protocol !== "https:" || target.hostname !== ALLOWED_HOST ||
        !target.pathname.startsWith("/apis/")) {
      return new Response(JSON.stringify({ error: "Target host/path not allowed" }), {
        status: 403, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    try {
      const upstream = await fetch(target.toString(), {
        headers: { "Accept": "application/json", "User-Agent": "GoalPulse/1.0" }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...headers,
          "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    } catch {
      return new Response(JSON.stringify({ error: "ESPN upstream request failed" }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }
};
