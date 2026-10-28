// GoalPulse: proxy SportScore (Botola Pro + Ligue 1)
const ALLOWED_ORIGINS = ['https://hzarouk.github.io'];
const SPORTSCORE = 'https://sportscore.com';
const TZ = 'Africa/Casablanca';
const STALE_TTL = 7 * 24 * 3600;
const TTL = { live: 60, today: 300, past: 86400, future: 3600, standings: 1800, scorers: 3600 };

// Compétitions suivies. Match bi smiya dyal championnat wla bi ID dyal logo.
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

// ---------- Upstream ----------
async function sportscore(path, params) {
  const u = new URL(path, SPORTSCORE);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers: { Accept: 'application/json', 'User-Agent': 'GoalPulse/1.0' } });
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

function mapMatch(x) {
  const key = leagueOf(x.competition, x.competition_logo);
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

function getMatchesForDate(date) {
  return cachedJSON(`matches:${date}`, dayTtl(date), async () => {
    const body = await sportscore('/api/v1/fixtures/', { sport: 'football', date, limit: 200 });
    return { matches: (body.matches || []).map(mapMatch).filter(Boolean) };
  });
}

function getLive() {
  return cachedJSON('live', TTL.live, async () => {
    const body = await sportscore('/api/widget/matches/', { sport: 'football', limit: 50 });
    return { matches: (body.matches || []).map(mapMatch).filter(Boolean) };
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
    const body = await sportscore('/api/widget/topscorers/', { sport: 'football', slug: LEAGUES[key].slug, stat: 'goals' });
    return { scorers: mapScorers(body) };
  });
}

function resolveLeague(v) {
  if (!LEAGUES[v]) throw new HttpError(400, 'league doit être botola ou ligue1');
  return v;
}

// ---------- Routing ----------
async function route(url) {
  const path = url.pathname;

  if (path === '/api/matches') {
    const date = url.searchParams.get('date') || casaToday();
    const today = casaToday();
    if (!isDate(date)) throw new HttpError(400, 'date invalide (YYYY-MM-DD)');
    if (date < addDays(today, -14) || date > addDays(today, 7)) throw new HttpError(400, 'date hors plage');
    const r = await getMatchesForDate(date);
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

  throw new HttpError(404, 'Not found');
}

// ---------- Entry ----------
export default {
  async fetch(request) {
    const cors = corsHeaders(request.headers.get('Origin'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405, cors);

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, provider: 'SportScore', leagues: Object.keys(LEAGUES) }, 200, cors);
    }

    try {
      const { payload, cache } = await route(url);
      return jsonResponse(payload, 200, cors, { 'X-Cache': cache });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 502;
      return jsonResponse({ error: e.message || 'Proxy failure' }, status, cors);
    }
  },
};
