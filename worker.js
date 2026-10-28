// GoalPulse — proxy SportScore (Botola, Ligue 1, Bundesliga, La Liga, Serie A)
const ALLOWED_ORIGINS = [
  'https://hzarouk.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];
const SPORTSCORE = 'https://sportscore.com';
const UPSTREAM_TIMEOUT_MS = 8000;
const TZ = 'Africa/Casablanca';
const STALE_TTL = 7 * 24 * 3600;
const KV_TTL = 30 * 24 * 3600;
const TTL = { live: 60, today: 300, past: 86400, future: 3600, standings: 1800, scorers: 3600, news: 1800 };

// slug : standings, topscorers et fixtures (competition=slug)
// names / logoIds : utilisés seulement pour /api/live
const LEAGUES = {
  botola: {
    name: 'Botola Pro',
    slug: 'the-botola-pro',
    names: ['The Botola Pro'],
    logoIds: ['c997cac5e146bab6891fd0aef3b943f0'],
  },
  ligue1: {
    name: 'Ligue 1',
    slug: 'french-ligue-1',
    names: ['French Ligue 1'],
    logoIds: ['6e13222836235b121c1af3bc3055e76b'],
  },
  bundesliga: {
    name: 'Bundesliga',
    slug: 'bundesliga',
    names: ['Bundesliga'],
    logoIds: ['0c6a25cd746e802296d9064b4504179d'],
  },
  laliga: {
    name: 'La Liga',
    slug: 'spanish-la-liga',
    names: ['Spanish La Liga'],
    logoIds: ['1fbbb4be3b47d9465c5badecc3122e07'],
  },
  seriea: {
    name: 'Serie A',
    slug: 'italian-serie-a',
    names: ['Italian Serie A'],
    logoIds: ['6b38f4015a6b3309ad9462e6ce27ae99'],
  },
};

const inflight = new Map();

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const casaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function corsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Cache',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function jsonResponse(data, status, cors, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ...extra,
    },
  });
}

// ---------- Upstream (avec timeout) ----------
async function sportscore(path, params) {
  const u = new URL(path, SPORTSCORE);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));

  let res;
  try {
    res = await fetch(u, {
      headers: { Accept: 'application/json', 'User-Agent': 'GoalPulse/1.0' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    throw new HttpError(502, `SportScore injoignable (${err.name === 'TimeoutError' ? 'timeout' : 'erreur réseau'})`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new HttpError(502, `SportScore: ${body.error || res.status}`);
  return body;
}

// ---------- Mapping ----------
function leagueOf(competition, logo) {
  for (const [key, L] of Object.entries(LEAGUES)) {
    if (L.names.includes(competition) || L.logoIds.some(id => (logo || '').includes(id))) return key;
  }
  return null;
}

// forcedKey : clé du championnat quand la requête est filtrée par competition=slug
function mapMatch(x, forcedKey) {
  const key = forcedKey || leagueOf(x.competition, x.competition_logo);
  if (!key) return null;
  return {
    id: x.url ? x.url.split('/').filter(Boolean).pop() : null,
    url: x.url || null,
    league_key: key,
    league_name: LEAGUES[key].name,
    home: x.home,
    away: x.away,
    home_logo: x.home_logo || '',
    away_logo: x.away_logo || '',
    home_score: x.home_score ?? null,
    away_score: x.away_score ?? null,
    status: x.status,
    status_text: x.status_text,
    time: x.time,
  };
}

function mapStandings(body) {
  return (body.tables || []).flatMap(t => t.rows || []).map(r => ({
    rank: r.pos,
    team: r.team,
    team_logo: r.team_logo || '',
    played: r.p, wins: r.w, draws: r.d, losses: r.l,
    goals_for: r.gf, goals_against: r.ga, goal_difference: r.gd,
    points: r.pts,
  }));
}

function mapScorers(body) {
  return (body.scorers || [])
    .filter(s => s.player && s.player !== 'Unknown' && s.goals != null)
    .map(s => ({
      rank: s.rank,
      player: s.player,
      team: s.team,
      team_logo: s.team_logo || '',
      goals: s.goals,
      assists: s.assists ?? 0,
      matches: s.matches ?? null,
    }));
}

// ---------- Cache (fresh + stale fallback + dedupe) ----------
async function cachedJSON(key, ttl, load) {
  const cache = caches.default;
  const freshReq = new Request(`https://cache.goalpulse.internal/fresh/${key}`);
  const staleReq = new Request(`https://cache.goalpulse.internal/stale/${key}`);

  const hit = await cache.match(freshReq);
  if (hit) return { data: await hit.json(), cache: 'HIT' };

  if (!inflight.has(key)) {
    const p = (async () => {
      const data = await load();
      const body = JSON.stringify(data);
      await Promise.all([
        cache.put(freshReq, new Response(body, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` },
        })),
        cache.put(staleReq, new Response(body, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${STALE_TTL}` },
        })),
      ]);
      return data;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }

  try {
    return { data: await inflight.get(key), cache: 'MISS' };
  } catch (err) {
    // SportScore en erreur ou timeout : on renvoie la dernière donnée connue si elle existe
    const old = await cache.match(staleReq);
    if (old) return { data: await old.json(), cache: 'STALE' };
    throw err;
  }
}

// ---------- Data getters ----------
function dayTtl(date) {
  const t = casaToday();
  return date < t ? TTL.past : date === t ? TTL.today : TTL.future;
}

// Un appel par championnat. Si un championnat échoue, les autres restent affichés.
async function loadMatchesForDate(date) {
  const results = await Promise.allSettled(
    Object.entries(LEAGUES).map(([key, L]) =>
      sportscore('/api/v1/fixtures/', {
        sport: 'football', date, competition: L.slug, limit: 200,
      }).then(body => (body.matches || []).map(m => mapMatch(m, key)).filter(Boolean))
    )
  );
  if (results.every(r => r.status === 'rejected')) {
    throw new HttpError(502, 'SportScore indisponible');
  }
  return { matches: results.flatMap(r => (r.status === 'fulfilled' ? r.value : [])) };
}

async function getMatchesForDate(date, env) {
  // Jour passé : archive KV d'abord, sinon SportScore via cache
  if (date < casaToday() && env.GOALPULSE_KV) {
    try {
      const saved = await env.GOALPULSE_KV.get(`day:${date}`, 'json');
      if (saved) return { data: saved, cache: 'KV' };
    } catch (_) {
      // KV indisponible : on continue vers SportScore
    }
  }
  return cachedJSON(`matches:v2:${date}`, dayTtl(date), () => loadMatchesForDate(date));
}

function getLive() {
  return cachedJSON('live', TTL.live, async () => {
    const body = await sportscore('/api/widget/matches/', { sport: 'football', limit: 50 });
    return { matches: (body.matches || []).map(m => mapMatch(m)).filter(Boolean) };
  });
}

function getStandings(key) {
  return cachedJSON(`standings:${key}`, TTL.standings, async () => {
    const body = await sportscore('/api/widget/standings/', { sport: 'football', slug: LEAGUES[key].slug });
    return { standings: mapStandings(body) };
  });
}

function getScorers(key) {
  return cachedJSON(`scorers:${key}`, TTL.scorers, async () => {
    const body = await sportscore('/api/widget/topscorers/', {
      sport: 'football', slug: LEAGUES[key].slug, stat: 'goals',
    });
    return { scorers: mapScorers(body) };
  });
}

// Actualités: Google News en source principale, BBC Sport en secours.
const NEWS_SOURCES = [
  { name: 'Google News RSS', url: 'https://news.google.com/rss/search?q=football&hl=fr&gl=FR&ceid=FR:fr' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
];

const decodeXml = (s) => s
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .trim();

function parseRss(xml) {
  const items = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const r = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
      return r ? decodeXml(r[1].replace(/<[^>]+>/g, '')) : '';
    };
    items.push({ title: pick('title'), link: pick('link'), date: pick('pubDate'), source: pick('source') });
  }
  return items.filter(i => i.title && i.link);
}

function getNews() {
  return cachedJSON('news:global', TTL.news, async () => {
    const failures = [];
    for (const source of NEWS_SOURCES) {
      try {
        const res = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GoalPulse/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (!res.ok) {
          failures.push(`${source.name}: HTTP ${res.status}`);
          continue;
        }
        const items = parseRss(await res.text());
        if (items.length) return { items: items.slice(0, 15), source: source.name };
        failures.push(`${source.name}: flux RSS vide ou invalide`);
      } catch (err) {
        failures.push(`${source.name}: ${err.name === 'TimeoutError' ? 'timeout' : 'erreur réseau'}`);
      }
    }
    throw new HttpError(503, `Aucune source d’actualités disponible (${failures.join('; ')})`);
  });
}

function resolveLeague(v) {
  if (!LEAGUES[v]) throw new HttpError(400, `league doit être: ${Object.keys(LEAGUES).join(', ')}`);
  return v;
}

// ---------- Routing ----------
async function route(url, env) {
  const path = url.pathname;

  if (path === '/api/matches') {
    const today = casaToday();
    const date = url.searchParams.get('date') || today;
    if (!isDate(date)) throw new HttpError(400, 'date invalide (YYYY-MM-DD)');
    if (date < addDays(today, -14) || date > addDays(today, 7)) throw new HttpError(400, 'date hors plage');
    const r = await getMatchesForDate(date, env);
    return { payload: { ...r.data, meta: { date, provider: 'SportScore' } }, cache: r.cache };
  }

  if (path === '/api/live') {
    const r = await getLive();
    return { payload: { ...r.data, meta: { provider: 'SportScore' } }, cache: r.cache };
  }

  if (path === '/api/standings') {
    const league = resolveLeague(url.searchParams.get('league') || '');
    const r = await getStandings(league);
    return { payload: { ...r.data, meta: { league, provider: 'SportScore' } }, cache: r.cache };
  }

  if (path === '/api/topscorers') {
    const league = resolveLeague(url.searchParams.get('league') || '');
    const r = await getScorers(league);
    return { payload: { ...r.data, meta: { league, provider: 'SportScore' } }, cache: r.cache };
  }

  if (path === '/api/news') {
    const r = await getNews();
    return { payload: { ...r.data, meta: { provider: 'Google News RSS' } }, cache: r.cache };
  }

  // Admin : archive un jour dans KV (protégé par ADMIN_KEY)
  if (path === '/api/admin/archive') {
    const key = url.searchParams.get('key');
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) throw new HttpError(403, 'forbidden');
    if (!env.GOALPULSE_KV) throw new HttpError(500, 'KV binding manquant');
    const date = url.searchParams.get('date') || addDays(casaToday(), -1);
    if (!isDate(date)) throw new HttpError(400, 'date invalide (YYYY-MM-DD)');
    const data = await loadMatchesForDate(date);
    await env.GOALPULSE_KV.put(`day:${date}`, JSON.stringify(data), { expirationTtl: KV_TTL });
    return { payload: { archived: date, count: data.matches.length }, cache: 'ADMIN' };
  }

  throw new HttpError(404, 'Not found');
}

// ---------- Entry ----------
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405, cors);

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        provider: 'SportScore',
        leagues: Object.keys(LEAGUES),
        kv: Boolean(env.GOALPULSE_KV),
      }, 200, cors);
    }

    try {
      const { payload, cache } = await route(url, env);
      return jsonResponse(payload, 200, cors, { 'X-Cache': cache });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 502;
      return jsonResponse({ error: e.message || 'Proxy failure' }, status, cors);
    }
  },

  // Cron : archive hier dans KV (chaque jour à 01:00 UTC = 02:00 Casablanca)
  async scheduled(event, env, ctx) {
    if (!env.GOALPULSE_KV) return;
    const yesterday = addDays(casaToday(), -1);
    const data = await loadMatchesForDate(yesterday);
    await env.GOALPULSE_KV.put(`day:${yesterday}`, JSON.stringify(data), {
      expirationTtl: KV_TTL,
    });
  },
};
