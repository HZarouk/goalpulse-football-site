/*
 GoalPulse — API-Football integration.
 Browser calls a Cloudflare Worker proxy. The API key must be stored as a Worker secret,
 never in this public JavaScript file. Configure API_BASE after deploying worker.js.
*/
const API_BASE = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";
const ESPN_NEWS = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const leagueConfig = {
  premier: { title: "Premier League", apiId: 39, code: "eng.1", region: "international", season: 2026 },
  laliga: { title: "La Liga", apiId: 140, code: "esp.1", region: "international", season: 2026 },
  botola: { title: "Botola Pro", apiId: 200, code: null, region: "morocco", season: 2026 },
  botola2: { title: "Botola 2", apiId: 201, code: null, region: "morocco", season: 2026 },
  ucl: { title: "Champions League", apiId: 2, code: "uefa.champions", region: "international", season: 2026 },
  ligue1: { title: "Ligue 1", apiId: 61, code: "fra.1", region: "international", season: 2026 },
  bundesliga: { title: "Bundesliga", apiId: 78, code: "ger.1", region: "international", season: 2026 },
  seriea: { title: "Serie A", apiId: 135, code: "ita.1", region: "international", season: 2026 },
  eredivisie: { title: "Eredivisie", apiId: 88, code: "ned.1", region: "international", season: 2026 },
  portugal: { title: "Primeira Liga", apiId: 94, code: "por.1", region: "international", season: 2026 },
  mls: { title: "MLS", apiId: 253, code: "usa.1", region: "international", season: 2026 },
  saudi: { title: "Saudi Pro League", apiId: 307, code: "sau.1", region: "international", season: 2026 },
  turkey: { title: "Turkish Super Lig", apiId: 203, code: "tur.1", region: "international", season: 2026 },
  scotland: { title: "Scottish Premiership", apiId: 179, code: "sco.1", region: "international", season: 2026 },
  europa: { title: "Europa League", apiId: 3, code: "uefa.europa", region: "international", season: 2026 },
  brazil: { title: "Brazil Serie A", apiId: 71, code: "bra.1", region: "international", season: 2026 },
  argentina: { title: "Argentina Primera División", apiId: 128, code: "arg.1", region: "international", season: 2026 },
  mexico: { title: "Liga MX", apiId: 262, code: "mex.1", region: "international", season: 2026 },
  japan: { title: "J1 League", apiId: 98, code: "jpn.1", region: "international", season: 2026 },
  australia: { title: "A-League", apiId: 188, code: "aus.1", region: "international", season: 2026 }
};
const matchGrid = document.getElementById("matchGrid");
const dataStatus = document.getElementById("dataStatus");
const matchDisclaimer = document.getElementById("matchDisclaimer");
const tableTitle = document.getElementById("tableTitle");
const standingsBody = document.getElementById("standingsBody");
const tableDataBadge = document.getElementById("tableDataBadge");
const newsStatus = document.getElementById("newsStatus");
let currentFilter = "all";
let currentSearch = "";\nlet currentCompetition = "all";
let cachedMatches = [];
let activeLeague = "premier";
const matchDateInput = document.getElementById("matchDate");
const competitionFilter = document.getElementById("competitionFilter");
Object.entries(leagueConfig).filter(([key, conf]) => conf.apiId).forEach(([key, conf]) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = conf.title;
  competitionFilter.appendChild(option);
});
competitionFilter.addEventListener("change", () => {
  currentCompetition = competitionFilter.value;
  renderMatches();
});
function localDateKey(date) { return `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}`; }
function dateInputValue(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function selectedDateKey() { return localDateKey(new Date(`${matchDateInput.value}T12:00:00`)); }
function changeSelectedDate(days) { const d = new Date(`${matchDateInput.value}T12:00:00`); d.setDate(d.getDate()+days); matchDateInput.value = dateInputValue(d); loadScoreboards(); }

function safeText(value, fallback = "TBC") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}
function formatKickoff(isoDate) {
  if (!isoDate) return "Time TBC";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "Time TBC";
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function statusLabel(event) {
  const type = event?.status?.type || {};
  const state = type.state;
  if (state === "in") return type.shortDetail || "LIVE";
  if (state === "post") return type.shortDetail || "FT";
  return type.shortDetail || formatKickoff(event.date);
}
function eventToMatch(item) {
  const fixture = item.fixture || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const statusCode = fixture.status?.short || "NS";
  const liveCodes = ["1H","HT","2H","ET","BT","P","LIVE"];
  const doneCodes = ["FT","AET","PEN"];
  const live = liveCodes.includes(statusCode);
  const done = doneCodes.includes(statusCode);
  const homeScore = goals.home;
  const awayScore = goals.away;
  let score = "VS";
  if (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined && (live || done)) {
    score = `${homeScore} – ${awayScore}`;
  }
  const conf = Object.values(leagueConfig).find(c => c.apiId === item.league?.id);
  const leagueName = item.league?.name || conf?.title || "Football";
  const region = conf?.region || (item.league?.country === "Morocco" ? "morocco" : "international");
  const state = live ? "LIVE" : done ? "FULL TIME" : "UPCOMING";
  const kickoff = fixture.date;
  return {
    league: leagueName, competitionKey: Object.keys(leagueConfig).find(key => leagueConfig[key].apiId === item.league?.id) || "unknown",
    region, time: formatKickoff(kickoff),
    home: safeText(teams.home?.name, "Home"), abbrH: safeText(teams.home?.name?.slice(0,3)?.toUpperCase(), "H"),
    away: safeText(teams.away?.name, "Away"), abbrA: safeText(teams.away?.name?.slice(0,3)?.toUpperCase(), "A"),
    score, status: state, venue: safeText(fixture.venue?.name, item.league?.country || "Match details"),
    sortDate: new Date(kickoff || 0).getTime(),
    searchText: `${leagueName} ${teams.home?.name || ""} ${teams.away?.name || ""}`
  };
}
async function getJSON(url) {
  if ((url.startsWith(API_BASE)) && API_BASE.includes("PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE")) {
    throw new Error("API proxy is not configured yet");
  }
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Data provider returned ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}
async function loadScoreboards() {
  const dateKey = matchDateInput.value;
  const selectedLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {weekday:"long", day:"numeric", month:"long", year:"numeric"});
  dataStatus.innerHTML = `◷ <span>Loading ${selectedLabel}…</span>`;
  try {
    const data = await getJSON(`${API_BASE}/fixtures?date=${encodeURIComponent(dateKey)}&timezone=Africa%2FCasablanca`);
    const response = Array.isArray(data.response) ? data.response : [];
    cachedMatches = response.map(eventToMatch).sort((a,b) => {
      const rank = s => s === "LIVE" ? 0 : s === "UPCOMING" ? 1 : 2;
      return rank(a.status) - rank(b.status) || a.sortDate - b.sortDate;
    });
    dataStatus.innerHTML = `◷ <span>Online · ${selectedLabel}</span>`;
    matchDisclaimer.textContent = `Fixtures and results supplied by API-Football for ${selectedLabel}. Coverage and live-score availability vary by competition.`;
  } catch (err) {
    cachedMatches = [];
    dataStatus.innerHTML = "◷ <span>API setup required</span>";
    matchDisclaimer.textContent = `Football data is not connected yet: ${err.message}. Deploy the Cloudflare Worker and set API_BASE in script.js.`;
  }
  renderMatches();
}
function renderMatches() {
  const filtered = cachedMatches.filter(m =>
    (currentFilter === "all" || m.region === currentFilter) &&
    (currentCompetition === "all" || m.competitionKey === currentCompetition) &&
    (!currentSearch || m.searchText.toLowerCase().includes(currentSearch.toLowerCase()))
  );
  const display = filtered.slice(0, 50);
  const cards = display.map(m => {
    const stateClass = m.status === "LIVE" ? "live-pill" : "demo-pill";
    return `<article class="match-card">
      <div class="match-card-top"><span class="match-league"><i class="league-bullet"></i>${m.league}</span><span class="${stateClass}">${m.status}</span></div>
      <div class="teams">
        <div class="team"><span class="team-crest">${m.abbrH}</span><strong>${m.home}</strong><small>Home</small></div>
        <div class="match-score">${m.score}<small>${m.status === "LIVE" ? "LIVE NOW" : m.status === "FULL TIME" ? "RESULT" : "KICK-OFF"}</small></div>
        <div class="team"><span class="team-crest">${m.abbrA}</span><strong>${m.away}</strong><small>Away</small></div>
      </div>
      <div class="match-card-bottom"><span>${m.time}</span><span>${m.venue}</span></div>
    </article>`;
  }).join("");
  const botolaCard = false ? `
    <article class="match-card morocco-data-card">
      <div class="match-card-top"><span class="match-league"><i class="league-bullet"></i>Botola Pro · Morocco</span><span class="demo-pill">NOT CONNECTED</span></div>
      <div class="teams"><div class="team"><span class="team-crest">MA</span><strong>Moroccan league</strong><small>Domestic football</small></div><div class="match-score">—<small>NO FEED</small></div><div class="team"><span class="team-crest">API</span><strong>Data source needed</strong><small>Not live yet</small></div></div>
      <div class="match-card-bottom"><span>Botola fixtures unavailable here</span><span>Setup required</span></div>
    </article>` : "";
  matchGrid.innerHTML = cards + botolaCard;
  if (!display.length) matchGrid.innerHTML = `<div class="date-empty"><strong>No fixtures or results found for this date.</strong><p>Try another date, choose “All matches”, or clear the search. Some competitions may not provide historical/future data through this source.</p></div>`;
}
async function loadStandings(key) {
  activeLeague = key;
  const conf = leagueConfig[key];
  tableTitle.textContent = conf.title;
  if (!conf.apiId) {
    tableDataBadge.textContent = "NOT AVAILABLE";
    standingsBody.innerHTML = `<tr><td colspan="7" class="empty-table">No verified competition ID is configured for this league.</td></tr>`;
    return;
  }
  tableDataBadge.textContent = "LOADING…";
  standingsBody.innerHTML = `<tr><td colspan="7">Loading official provider standings…</td></tr>`;
  try {
    const data = await getJSON(`${API_BASE}/standings?league=${conf.apiId}&season=${conf.season}`);
    const groups = data.response?.[0]?.league?.standings || [];
    const entries = groups.flat();
    if (!entries.length) throw new Error("No standings returned for this competition/season");
    const rows = entries.map((entry, i) => {
      const played = entry.all?.played ?? "—";
      const won = entry.all?.win ?? "—";
      const drawn = entry.all?.draw ?? "—";
      const lost = entry.all?.lose ?? "—";
      const points = entry.points ?? "—";
      return `<tr><td>${entry.rank ?? i+1}</td><td class="club-cell">${safeText(entry.team?.name, "Club")}</td><td>${played}</td><td>${won}</td><td>${drawn}</td><td>${lost}</td><td><strong>${points}</strong></td></tr>`;
    }).join("");
    tableDataBadge.textContent = "ONLINE";
    standingsBody.innerHTML = rows;
  } catch (err) {
    tableDataBadge.textContent = "UNAVAILABLE";
    standingsBody.innerHTML = `<tr><td colspan="7" class="empty-table">Could not load standings: ${err.message}. Check the API key, season and competition coverage.</td></tr>`;
  }
}
async function loadNews() {
  newsStatus.textContent = "Loading latest headlines from ESPN…";
  const sources = [
    { code: "eng.1", label: "Premier League" },
    { code: "uefa.champions", label: "Champions League" }
  ];
  try {
    const responses = await Promise.allSettled(sources.map(s => getJSON(`${ESPN_NEWS}/${s.code}/news?limit=6`)));
    const articles = [];
    responses.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      (r.value.articles || []).forEach(a => articles.push({ ...a, sourceLabel: sources[i].label }));
    });
    const unique = [...new Map(articles.filter(a => a.headline).map(a => [a.headline, a])).values()].slice(0, 6);
    if (!unique.length) throw new Error("No headlines");
    document.getElementById("newsGrid").innerHTML = unique.map((a, i) => {
      const link = a.links?.web?.href || a.links?.api?.news?.href || "#";
      const image = a.images?.[0]?.url;
      const safeLink = /^https?:\/\//i.test(link) ? link : "#";
      return `<article class="news-card"><div class="news-art" ${image ? `style="background-image:linear-gradient(0deg,#111b 0%,#1114 100%),url('${image.replace(/'/g,"%27")}');background-size:cover;background-position:center` : ""}><span class="art-number">ONLINE / ${String(i+1).padStart(2,"0")}</span><span class="art-icon">${image ? "" : "⚽"}</span></div><div class="news-content"><span class="news-category">${a.sourceLabel.toUpperCase()}</span><h3>${a.headline}</h3><p>${safeText(a.description, "Open the source for the full story.")}</p><div class="news-meta"><span>${safeText(a.published, "Latest")}</span><a href="${safeLink}" target="_blank" rel="noopener noreferrer">Read source ↗</a></div></div></article>`;
    }).join("");
    newsStatus.textContent = "Headlines from ESPN. Open each source for the full story.";
  } catch (e) {
    newsStatus.textContent = "Online headlines unavailable at the moment.";
    document.getElementById("newsGrid").innerHTML = `<article class="news-card"><div class="news-content"><span class="news-category">SOURCE STATUS</span><h3>News feed temporarily unavailable</h3><p>We do not publish invented headlines. Try refreshing the page later.</p></div></article>`;
  }
}

document.querySelectorAll(".segment").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".segment").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.filter;
  renderMatches();
}));
document.querySelectorAll(".league-select").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".league-select").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  loadStandings(btn.dataset.league);
}));
document.getElementById("searchToggle").addEventListener("click", () => {
  document.getElementById("searchStrip").classList.toggle("open");
  if (document.getElementById("searchStrip").classList.contains("open")) document.getElementById("siteSearch").focus();
});
document.getElementById("siteSearch").addEventListener("input", e => {
  currentSearch = e.target.value.trim();
  renderMatches();
  document.getElementById("searchHint").textContent = currentSearch ? `Searching online fixtures and stories for “${currentSearch}”` : "Try “Morocco”, “Arsenal” or “Botola”";
});
document.getElementById("menuToggle").addEventListener("click", () => document.querySelector(".desktop-nav").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a => a.addEventListener("click", () => document.querySelector(".desktop-nav").classList.remove("open")));
document.getElementById("newsletterForm").addEventListener("submit", e => {
  e.preventDefault();
  document.getElementById("newsletterNote").textContent = "Preview only — email was not sent or saved.";
});
document.getElementById("year").textContent = new Date().getFullYear();

matchDateInput.value = dateInputValue(new Date());
document.getElementById("prevDate").addEventListener("click", () => changeSelectedDate(-1));
document.getElementById("nextDate").addEventListener("click", () => changeSelectedDate(1));
document.getElementById("todayDate").addEventListener("click", () => { matchDateInput.value = dateInputValue(new Date()); loadScoreboards(); });
matchDateInput.addEventListener("change", loadScoreboards);
loadScoreboards();
loadStandings("premier");
loadNews();
setInterval(loadScoreboards, 5 * 60 * 1000);
setInterval(() => loadStandings(activeLeague), 15 * 60 * 1000);
