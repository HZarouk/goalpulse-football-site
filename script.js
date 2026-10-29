const API_BASE = 'https://goalpulse-api.mizouzarouk.workers.dev';
const TZ = 'Africa/Casablanca';
const LEAGUE_NAMES = {
  botola: 'Botola Pro',
  ligue1: 'Ligue 1',
  bundesliga: 'Bundesliga',
  laliga: 'La Liga',
  seriea: 'Serie A',
};
const LIVE_REFRESH_MS = 120000;
const CLIENT_TIMEOUT_MS = 30000;

const state = { mode: 'day', date: '', league: 'all' };
let liveTimer = null;

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const todayCasa = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const shiftDate = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtHour = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  .format(new Date(iso));
const fmtDay = (iso) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  .format(new Date(iso + 'T12:00:00Z'));

async function api(path, params = {}) {
  const u = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(u, { signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const inLeague = (list) => state.league === 'all' ? list : list.filter(m => m.league_key === state.league);
const logo = (src) => src ? `<img src="${esc(src)}" alt="" loading="lazy">` : '';

// ---------- Rendering ----------
function matchCard(m) {
  let status;
  if (m.status === 'live') status = `<span class="status-live">${esc(m.status_text)}</span>`;
  else if (m.status === 'finished') status = `<span class="status-normal">Terminé</span>`;
  else status = `<span class="status-normal">${m.time ? fmtHour(m.time) : '-'}</span>`;

  const score = m.home_score == null ? 'vs' : `${m.home_score} - ${m.away_score}`;
  const href = m.url ? `https://sportscore.com${m.url}` : 'https://sportscore.com/';

  return `
    <a class="match-card-link" href="${esc(href)}" target="_blank" rel="noopener" title="Voir les détails sur SportScore">
      <article class="match-card">
        <div class="card-header"><span>${esc(m.league_name)}</span>${status}</div>
        <div class="card-body">
          <div class="team">${logo(m.home_logo)}<span class="team-name">${esc(m.home)}</span></div>
          <div class="score">${score}</div>
          <div class="team away"><span class="team-name">${esc(m.away)}</span>${logo(m.away_logo)}</div>
        </div>
        <div class="match-card-hint">Détails sur SportScore ↗</div>
      </article>
    </a>`;
}

function renderMatches(list, emptyMsg) {
  $('matches-container').innerHTML = list.length
    ? list.map(matchCard).join('')
    : `<p class="data-message">${esc(emptyMsg)}</p>`;
}

// ---------- Loaders ----------
async function loadDay() {
  const { matches = [] } = await api('/api/matches', { date: state.date });
  const list = inLeague(matches).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  renderMatches(list, 'Aucun match ce jour-là.');
}

async function loadLive() {
  const { matches = [] } = await api('/api/live');
  renderMatches(inLeague(matches).filter(m => m.status === 'live'), 'Aucun match en direct actuellement.');
}

async function loadHistory() {
  const today = todayCasa();
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(today, -(i + 1)));
  const results = await Promise.allSettled(days.map(d => api('/api/matches', { date: d })));

  $('matches-container').innerHTML = days.map((d, i) => {
    const r = results[i];
    let body;
    if (r.status !== 'fulfilled') {
      body = `<p class="data-message">Données indisponibles.</p>`;
    } else {
      const list = inLeague(r.value.matches || []).filter(m => m.status === 'finished');
      body = list.length ? list.map(matchCard).join('') : `<p class="data-message">Aucun match terminé.</p>`;
    }
    return `<h3 class="day-title" style="grid-column:1/-1">${fmtDay(d)}</h3>${body}`;
  }).join('');
}

async function refreshMatches() {
  try {
    if (state.mode === 'live') await loadLive();
    else if (state.mode === 'history') await loadHistory();
    else await loadDay();
  } catch (e) {
    console.error(e);
    $('matches-container').innerHTML =
      `<p class="data-message">Données temporairement indisponibles. Réessayez plus tard.</p>`;
  }
}

async function loadStandings() {
  const league = $('standings-league-select').value;
  const tbody = $('standings-tbody');
  tbody.innerHTML = `<tr><td colspan="9">Chargement…</td></tr>`;
  try {
    const { standings = [] } = await api('/api/standings', { league });
    tbody.innerHTML = standings.length ? standings.map(r => `
      <tr>
        <td>${r.rank}</td>
        <td class="team-cell">${logo(r.team_logo)}<span>${esc(r.team)}</span></td>
        <td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td>
        <td>${r.goals_for}/${r.goals_against}</td>
        <td>${r.goal_difference}</td>
        <td class="pts-cell">${r.points}</td>
      </tr>`).join('')
      : `<tr><td colspan="9">Aucune donnée disponible.</td></tr>`;
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="9">Classement indisponible pour le moment.</td></tr>`;
  }
}

async function loadScorers() {
  const league = $('standings-league-select').value;
  $('scorers-title').innerHTML = `<i class="fa-solid fa-fire"></i> Top Buteurs (${esc(LEAGUE_NAMES[league])})`;
  const ul = $('top-scorers-list');
  ul.innerHTML = `<li><span>Chargement…</span></li>`;
  try {
    const { scorers = [] } = await api('/api/topscorers', { league });
    ul.innerHTML = scorers.length
      ? scorers.slice(0, 10).map(s =>
          `<li><span>${s.rank}. ${esc(s.player)}<br><small>${esc(s.team)}</small></span><strong>${s.goals}</strong></li>`
        ).join('')
      : `<li><span>Aucune donnée</span></li>`;
  } catch (e) {
    console.error(e);
    ul.innerHTML = `<li><span>Données indisponibles</span></li>`;
  }
}

async function loadNews() {
  const box = $('news-list');
  try {
    const { items = [] } = await api('/api/news');
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    box.innerHTML = items.length
      ? items.map(n => `
        <div class="news-item">
          <a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>
          <div class="news-meta">${esc(n.source || 'Source inconnue')}${n.date ? ' · ' + esc(fmt.format(new Date(n.date))) : ''}</div>
        </div>`).join('')
      : `<p class="data-message">Aucune actualité disponible.</p>`;
  } catch (e) {
    console.error(e);
    box.innerHTML = `<p class="data-message">Actualités indisponibles pour le moment.</p>`;
  }
}

// ---------- Mode & controls ----------
function setActive(id) {
  document.querySelectorAll('.date-btn, .history-btn, .live-filter-btn')
    .forEach(b => b.classList.toggle('active', b.id === id));
}

function stopLive() {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
}

function setMode(mode, date, btnId) {
  state.mode = mode;
  if (date) {
    state.date = date;
    $('custom-date-picker').value = date;
  }
  setActive(btnId || '');
  stopLive();
  if (mode === 'live') {
    liveTimer = setInterval(() => { if (!document.hidden) refreshMatches(); }, LIVE_REFRESH_MS);
  }
  refreshMatches();
}

function selectLeague(key) {
  state.league = key;
  document.querySelectorAll('#league-selector .league-item')
    .forEach(li => li.classList.toggle('active', li.dataset.league === key));
  if (key !== 'all') {
    $('standings-league-select').value = key;
    loadStandings();
    loadScorers();
  }
  refreshMatches();
}

function init() {
  state.date = todayCasa();
  $('custom-date-picker').value = state.date;

  $('btn-yesterday').onclick = () => setMode('day', shiftDate(todayCasa(), -1), 'btn-yesterday');
  $('btn-today').onclick = () => setMode('day', todayCasa(), 'btn-today');
  $('btn-tomorrow').onclick = () => setMode('day', shiftDate(todayCasa(), 1), 'btn-tomorrow');
  $('custom-date-picker').onchange = (e) => { if (e.target.value) setMode('day', e.target.value, ''); };
  $('btn-history').onclick = () => setMode('history', null, 'btn-history');
  $('btn-live').onclick = () => setMode('live', null, 'btn-live');

  document.querySelectorAll('#league-selector .league-item').forEach(li => {
    li.addEventListener('click', () => selectLeague(li.dataset.league));
  });

  $('standings-league-select').onchange = () => { loadStandings(); loadScorers(); };

  setMode('day', state.date, 'btn-today');
  loadStandings();
  loadScorers();
  loadNews();
}

document.addEventListener('DOMContentLoaded', init);
