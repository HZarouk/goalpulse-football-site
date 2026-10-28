/* GOALPULSE — direct SportScore public API; no API-Football or Cloudflare Worker. */
const API_BASE = 'https://sportscore.com';
const SPORT = 'football';
const API_CACHE_TTL_MS = 60_000;
const apiCache = new Map();
let currentSelectedLeague = 'all';
let currentDateFilter = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();
let liveOnly = false;

// The old API-Sports numeric IDs are mapped to SportScore competition slugs.
// Slugs are used only where the API expects a competition slug.
const LEAGUE_SLUGS = {
  '39': 'premier-league',
  '140': 'la-liga',
  '2': 'uefa-champions-league',
  '135': 'serie-a',
  '78': 'bundesliga',
  '61': 'ligue-1',
  '200': 'botola-pro'
};
const LEAGUE_SLUG_CANDIDATES = {
  '39': ['premier-league', 'english-premier-league'],
  '140': ['la-liga', 'laliga', 'spanish-la-liga'],
  '2': ['uefa-champions-league', 'champions-league'],
  '135': ['serie-a', 'serie-a-italy', 'italian-serie-a'],
  '78': ['bundesliga', 'german-bundesliga'],
  '61': ['ligue-1', 'ligue-1-france', 'french-ligue-1'],
  '200': ['botola-pro', 'botola']
};
const LEAGUE_NAMES = {
  '39': 'Premier League', '140': 'La Liga', '2': 'UEFA Champions League',
  '135': 'Serie A', '78': 'Bundesliga', '61': 'Ligue 1', '200': 'Botola Pro'
};

async function apiGet(path, params = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  
  const cacheKey = url.toString();
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < API_CACHE_TTL_MS) return cached.data;
  const response = await fetch(cacheKey, { method: 'GET', headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error(`GoalPulse API HTTP ${response.status}`);
  const data = await response.json();
  apiCache.set(cacheKey, { savedAt: Date.now(), data });
  return data;
}

function safeText(value, fallback = '—') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function normaliseMatch(raw) {
  // Fixtures and widget endpoints may wrap the actual match differently.
  const m = raw?.match || raw?.fixture || raw?.data?.match || raw;
  const home = m.home ?? m.home_team ?? m.teams?.home?.name ?? m.homeTeam?.name ?? 'Home';
  const away = m.away ?? m.away_team ?? m.teams?.away?.name ?? m.awayTeam?.name ?? 'Away';
  const homeScore = m.home_score ?? m.score?.home ?? m.goals?.home ?? m.scores?.home;
  const awayScore = m.away_score ?? m.score?.away ?? m.goals?.away ?? m.scores?.away;
  const status = m.status_text ?? m.status ?? m.fixture?.status?.short ?? 'Scheduled';
  const time = m.time ?? m.kickoff ?? m.date ?? m.fixture?.date;
  const league = m.competition?.name ?? (typeof m.competition === 'string' ? m.competition : undefined) ?? m.competition_name ?? m.league?.name ?? (typeof m.league === 'string' ? m.league : undefined) ?? m.tournament?.name ?? m.competition?.title ?? m.tournament_name ?? m.competitionTitle ?? 'Football';
  const leagueSlug = m.competition?.slug ?? m.competition_slug ?? m.league?.slug ?? '';
  const homeLogo = m.home_logo ?? m.teams?.home?.logo ?? m.homeTeam?.logo ?? '';
  const awayLogo = m.away_logo ?? m.teams?.away?.logo ?? m.awayTeam?.logo ?? '';
  return { raw: m, home, away, homeScore, awayScore, status, time, league, leagueSlug, homeLogo, awayLogo, slug: m.slug ?? m.match_slug ?? m.url_slug ?? (m.url ? String(m.url).split('/').filter(Boolean).pop() : '') };
}

function isLiveMatch(m) {
  const status = String(m.status || '').toLowerCase();
  return status.includes('live') || status.includes('half') || status.includes('1h') || status.includes('2h') || status === 'ht' || status.includes('in play') || status.includes('in_progress');
}
function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function extractMatchRows(payload) {
  // Support both documented SportScore envelopes and nested variants.
  const candidates = [
    payload, payload?.matches, payload?.fixtures, payload?.results,
    payload?.data, payload?.data?.matches, payload?.data?.fixtures,
    payload?.response, payload?.data?.results, payload?.fixtures?.data, payload?.data?.fixtures?.data
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function matchesSelectedLeague(matches, leagueId) {
  if (!leagueId || leagueId === 'all') return matches;
  const expected = (LEAGUE_NAMES[leagueId] || '').toLowerCase();
  const slug = (LEAGUE_SLUGS[leagueId] || '').toLowerCase();
  return matches.filter(m => {
    const league = String(m.league || '').toLowerCase();
    const rawSlug = String(m.leagueSlug || '').toLowerCase();
    return (expected && league.includes(expected)) || (slug && (rawSlug === slug || league.includes(slug.replace(/-/g, ' '))));
  });
}

async function fetchMatchesFromAPI(dateStr = currentDateFilter, isLive = false, leagueId = currentSelectedLeague) {
  const container = document.getElementById('matches-container');
  if (!container) return;
  container.innerHTML = `<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des données football…</div>`;
  liveOnly = isLive;
  try {
    let payload;
    if (isLive) {
      payload = await apiGet('/api/widget/matches/', { sport: SPORT, limit: 50 });
    } else {
      // Fetch the selected UTC date without a competition slug first. This
      // avoids an invalid/unsupported competition slug forcing an empty list.
      payload = await apiGet('/api/v1/fixtures/', { sport: SPORT, date: dateStr, limit: 200 });
    }
    let matches = extractMatchRows(payload);
    let normalised = matches.map(normaliseMatch);
    if (isLive) normalised = normalised.filter(isLiveMatch);
    // Always apply the selected competition filter, including Live mode.
    if (leagueId !== 'all') normalised = matchesSelectedLeague(normalised, leagueId);
    renderMatches(normalised);
  } catch (error) {
    console.error('GoalPulse fixtures error:', error);
    container.innerHTML = `<p class="data-message">Impossible de charger les matchs pour le moment. Vérifiez votre connexion puis réessayez. Aucun score fictif ne sera affiché.</p>`;
  }
}

function renderMatches(matches) {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';
  if (!matches.length) {
    container.innerHTML = `<p class="data-message">Aucun match trouvé pour cette date ou ce championnat.</p>`;
    return;
  }
  matches.forEach(m => {
    const live = isLiveMatch(m);
    const hasScore = m.homeScore !== undefined && m.homeScore !== null && m.awayScore !== undefined && m.awayScore !== null;
    const score = hasScore ? `${esc(m.homeScore)} - ${esc(m.awayScore)}` : (m.time ? esc(formatTime(m.time)) : 'VS');
    const card = document.createElement('article');
    card.className = 'match-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Détails du match ${m.home} contre ${m.away}`);
    card.innerHTML = `
      <div class="card-header"><span>${esc(m.league || 'Football')}</span><span class="${live ? 'status-live' : 'status-normal'}">${live ? '● LIVE ' : ''}${esc(m.status)}</span></div>
      <div class="card-body">
        <div class="team">${m.homeLogo ? `<img src="${esc(m.homeLogo)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}<span class="team-name">${esc(m.home)}</span></div>
        <div class="score">${score}</div>
        <div class="team away"><span class="team-name">${esc(m.away)}</span>${m.awayLogo ? `<img src="${esc(m.awayLogo)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}</div>
      </div><div class="match-card-hint">Cliquer pour voir les détails</div>`;
    const open = () => m.slug ? showMatchDetails(m.slug) : showDetailsUnavailable();
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    container.appendChild(card);
  });
}

function ensureDetailsModal() {
  let modal = document.getElementById('match-details-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'match-details-modal';
  modal.className = 'match-details-modal';
  modal.innerHTML = `<div class="match-details-panel" role="dialog" aria-modal="true" aria-labelledby="match-details-title"><button class="details-close" aria-label="Fermer">×</button><div id="match-details-content"><p class="data-message">Chargement…</p></div></div>`;
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.details-close')) modal.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
  document.body.appendChild(modal);
  return modal;
}
function showDetailsUnavailable() {
  const modal = ensureDetailsModal();
  document.getElementById('match-details-content').innerHTML = '<p class="data-message">SportScore n’a pas fourni de référence pour ce match ; les détails ne sont pas disponibles.</p>';
  modal.classList.add('open');
}
function collectDetailSections(data) {
  const root = data?.match || data?.data?.match || data?.data || data;
  const sections = [];
  const addList = (title, list) => {
    if (!Array.isArray(list) || !list.length) return;
    const rows = list.map(item => {
      if (typeof item === 'string' || typeof item === 'number') return `<li>${esc(item)}</li>`;
      const label = item.player?.name || item.name || item.player_name || item.event || item.type || item.minute || JSON.stringify(item);
      const minute = item.minute || item.time || item.elapsed;
      return `<li>${minute ? `<strong>${esc(minute)}'</strong> ` : ''}${esc(label)}</li>`;
    }).join('');
    sections.push(`<section class="detail-section"><h3>${esc(title)}</h3><ul>${rows}</ul></section>`);
  };
  addList('Buteurs & événements', root.timeline || root.events || root.goals || root.scorers);
  addList('Lineups', root.lineups || root.lineups_home || root.players);
  const stats = root.statistics || root.stats;
  if (Array.isArray(stats) && stats.length) {
    const rows = stats.map(s => `<li><strong>${esc(s.type || s.name || s.stat || 'Stat')}</strong>: ${esc(s.home ?? s.home_value ?? s.value?.home ?? '—')} — ${esc(s.away ?? s.away_value ?? s.value?.away ?? '—')}</li>`).join('');
    sections.push(`<section class="detail-section"><h3>Statistiques</h3><ul>${rows}</ul></section>`);
  } else if (stats && typeof stats === 'object') {
    const rows = Object.entries(stats).map(([k,v]) => `<li><strong>${esc(k.replace(/_/g,' '))}</strong>: ${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</li>`).join('');
    sections.push(`<section class="detail-section"><h3>Statistiques</h3><ul>${rows}</ul></section>`);
  }
  return sections;
}
async function showMatchDetails(slug) {
  const modal = ensureDetailsModal();
  const content = document.getElementById('match-details-content');
  content.innerHTML = `<p class="data-message"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des détails du match…</p>`;
  modal.classList.add('open');
  try {
    const data = await apiGet('/api/widget/match/', { sport: SPORT, slug });
    const root = data?.match || data?.data?.match || data?.data || data;
    const home = root.home || root.home_team || root.teams?.home?.name || 'Équipe domicile';
    const away = root.away || root.away_team || root.teams?.away?.name || 'Équipe extérieure';
    const hs = root.home_score ?? root.score?.home ?? root.goals?.home;
    const as = root.away_score ?? root.score?.away ?? root.goals?.away;
    const sections = collectDetailSections(data);
    content.innerHTML = `<h2 id="match-details-title">${esc(home)} ${hs == null ? '' : esc(hs)} - ${as == null ? '' : esc(as)} ${esc(away)}</h2>${sections.length ? sections.join('') : '<p class="data-message">L’API a renvoyé les détails du match, mais les champs buteurs/statistiques/lineups ne sont pas disponibles dans cette réponse.</p>'}<p class="sportscore-credit">Données fournies par <a href="https://sportscore.com/" target="_blank" rel="dofollow noopener">SportScore</a></p>`;
  } catch (error) {
    console.error('SportScore match details error:', error);
    content.innerHTML = `<h2 id="match-details-title">Détails du match</h2><p class="data-message">Les détails de ce match ne sont pas disponibles actuellement. Réessaie plus tard.</p><p class="sportscore-credit">Données fournies par <a href="https://sportscore.com/" target="_blank" rel="dofollow noopener">SportScore</a></p>`;
  }
}

async function fetchHistory() {
  const container = document.getElementById('matches-container');
  if (!container) return;
  liveOnly = false;
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-history')?.classList.add('active');
  container.innerHTML = `<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Chargement de l’historique des 7 derniers jours…</div>`;
  try {
    // Request each UTC calendar day independently. If a competition slug is
    // rejected or returns no rows, retry that day without the competition and
    // filter locally by the competition name returned in each match.
    const dates = Array.from({length: 7}, (_, i) => dateOffset(-(i + 1)));
    const collected = [];
    for (const date of dates) {
      // Always query the date without a competition filter, then filter locally.
      // Some competition slugs are not recognized by the public API.
      const payload = await apiGet('/api/v1/fixtures/', { sport: SPORT, date, limit: 200 });
      const rows = extractMatchRows(payload);
      const normalised = rows.map(normaliseMatch);
      collected.push(...matchesSelectedLeague(normalised, currentSelectedLeague));
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const seen = new Set();
    const matches = collected.filter(m => {
      const key = m.slug || `${m.home}|${m.away}|${m.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b) => new Date(b.time || 0) - new Date(a.time || 0));
    renderMatches(matches);
    if (!matches.length) {
      container.innerHTML = `<p class="data-message">Aucun résultat historique trouvé pour ce championnat. Essayez « Tous les Matchs » pour consulter les autres compétitions.</p>`;
    }
  } catch (error) {
    console.error('GoalPulse history error:', error);
    container.innerHTML = `<p class="data-message">L’historique n’a pas pu être chargé. Réessaie plus tard; aucun résultat fictif ne sera affiché.</p>`;
  }
}

async function fetchTopScorers(leagueId = '39') {
  const list = document.getElementById('top-scorers-list');
  if (!list) return;
  const slug = LEAGUE_SLUGS[leagueId] || 'premier-league';
  try {
    let rows = [];
    let lastError;
    const candidates = LEAGUE_SLUG_CANDIDATES[leagueId] || [slug];
    for (const candidateSlug of candidates) {
      for (const path of ['/api/widget/topscorers/', '/api/v1/topscorers/']) {
        try {
          const payload = await apiGet(path, { sport: SPORT, slug: candidateSlug, limit: 5, stat: 'goals' });
          const root = payload?.data ?? payload;
          const possible = root?.topscorers || root?.top_scorers || root?.scorers || root?.players || root?.rows || root;
          rows = Array.isArray(possible) ? possible : (possible?.players || possible?.rows || []);
          if (rows.length) break;
        } catch (err) { lastError = err; }
      }
      if (rows.length) break;
    }
    if (!rows.length) throw lastError || new Error('No top scorers in response');
    list.innerHTML = '';
    rows.slice(0,5).forEach((r, i) => {
      const player = r.player?.name || r.name || r.player_name || '';
      const team = r.team?.name || r.team_name || '';
      const goals = r.goals ?? r.total ?? r.value ?? r.statistic?.value ?? null;
      // Do not render malformed API rows as if they were real player records.
      if (!player || goals === null) return;
      const li = document.createElement('li');
      li.innerHTML = `<span>${i+1}. ${esc(player)}${team ? ` (${esc(team)})` : ''}</span><strong>${esc(goals)} buts</strong>`;
      list.appendChild(li);
    });
    if (!list.children.length) {
      list.innerHTML = '<li><span>Classement des buteurs indisponible actuellement.</span></li>';
    }
  } catch (error) {
    console.warn('GoalPulse top scorers unavailable:', error);
    list.innerHTML = '<li><span>Classement des buteurs indisponible actuellement.</span></li>';
  }
}

async function fetchStandings(leagueId = '39') {
  const tbody = document.getElementById('standings-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:15px"><i class="fa-solid fa-spinner fa-spin"></i> Chargement du classement…</td></tr>`;
  const slug = LEAGUE_SLUGS[leagueId];
  if (!slug) {
    tbody.innerHTML = `<tr><td colspan="9">Slug du championnat non configuré.</td></tr>`;
    return;
  }
  try {
    let payload;
    let rows = [];
    let lastError;
    const candidates = LEAGUE_SLUG_CANDIDATES[leagueId] || [slug];
    for (const candidateSlug of candidates) {
      for (const path of ['/api/widget/standings/', '/api/v1/standings/']) {
        try {
          payload = await apiGet(path, { sport: SPORT, slug: candidateSlug });
          const root = payload?.data ?? payload;
          const possible = root?.standings || root?.table || root?.rows || root?.standings?.rows || root;
          rows = Array.isArray(possible) ? possible : (possible?.rows || possible?.table || []);
          if (rows.length) break;
        } catch (err) { lastError = err; }
      }
      if (rows.length) break;
    }
    if (!rows.length) throw lastError || new Error('No standings rows in response');
    tbody.innerHTML = '';
    rows.forEach((r, i) => {
      const team = r.team?.name || r.team_name || r.name || r.team || '—';
      const logo = r.team?.logo || r.logo || '';
      const played = r.played ?? r.all?.played ?? r.played_games ?? '—';
      const wins = r.wins ?? r.all?.win ?? r.win ?? '—';
      const draws = r.draws ?? r.all?.draw ?? r.draw ?? '—';
      const losses = r.losses ?? r.all?.lose ?? r.lose ?? '—';
      const gf = r.goals_for ?? r.goals?.for ?? r.all?.goals?.for ?? '—';
      const ga = r.goals_against ?? r.goals?.against ?? r.all?.goals?.against ?? '—';
      const diff = r.goal_difference ?? r.goalsDiff ?? (Number.isFinite(Number(gf)) && Number.isFinite(Number(ga)) ? Number(gf)-Number(ga) : '—');
      const pts = r.points ?? r.pts ?? '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><strong>${esc(r.rank ?? r.position ?? i+1)}</strong></td><td class="team-cell">${logo ? `<img src="${esc(logo)}" width="20" height="20" alt="" onerror="this.style.display='none'">` : ''}<span>${esc(team)}</span></td><td>${esc(played)}</td><td>${esc(wins)}</td><td>${esc(draws)}</td><td>${esc(losses)}</td><td>${esc(gf)}/${esc(ga)}</td><td>${esc(diff)}</td><td class="pts-cell">${esc(pts)}</td>`;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('GoalPulse standings error:', error);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:15px">Le classement n’est pas disponible actuellement. Aucun classement fictif n’est affiché.</td></tr>`;
  }
}

function setActiveDateBtn(btn) {
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function dateOffset(days) {
  // Build a local calendar date; toISOString() can shift the date across time zones.
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const picker = document.getElementById('custom-date-picker');
  if (picker) picker.value = currentDateFilter;
  fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
  fetchStandings(document.getElementById('standings-league-select')?.value || '39');
  fetchTopScorers('39');

  document.getElementById('btn-today')?.addEventListener('click', e => { currentDateFilter = dateOffset(0); if (picker) picker.value = currentDateFilter; setActiveDateBtn(e.currentTarget); fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague); });
  document.getElementById('btn-yesterday')?.addEventListener('click', e => { currentDateFilter = dateOffset(-1); if (picker) picker.value = currentDateFilter; setActiveDateBtn(e.currentTarget); fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague); });
  document.getElementById('btn-tomorrow')?.addEventListener('click', e => { currentDateFilter = dateOffset(1); if (picker) picker.value = currentDateFilter; setActiveDateBtn(e.currentTarget); fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague); });
  picker?.addEventListener('change', e => { currentDateFilter = e.target.value; document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active')); fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague); });
  document.getElementById('btn-history')?.addEventListener('click', fetchHistory);
  document.getElementById('btn-live')?.addEventListener('click', () => { document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active')); fetchMatchesFromAPI(currentDateFilter, true, currentSelectedLeague); });
  document.querySelectorAll('.league-item').forEach(item => item.addEventListener('click', () => {
    document.querySelectorAll('.league-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active'); currentSelectedLeague = item.getAttribute('data-league') || 'all';
    fetchMatchesFromAPI(currentDateFilter, liveOnly, currentSelectedLeague);
  }));
  document.getElementById('standings-league-select')?.addEventListener('change', e => { fetchStandings(e.target.value); fetchTopScorers(e.target.value); });
});
