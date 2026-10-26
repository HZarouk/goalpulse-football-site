/*
 GoalPulse online data integration.
 Scoreboards, standings and headlines use ESPN's public, undocumented JSON endpoints.
 They require no API key, but are not a guaranteed/official developer API and may change.
 ESPN coverage does not include every competition; Botola Pro is left clearly unconnected.
*/
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const leagueConfig = {
  premier: { title: "Premier League", code: "eng.1", region: "international" },
  laliga: { title: "La Liga", code: "esp.1", region: "international" },
  botola: { title: "Botola Pro", code: null, region: "morocco" },
  ucl: { title: "Champions League", code: "uefa.champions", region: "international" },
  ligue1: { title: "Ligue 1", code: "fra.1", region: "international" },
  bundesliga: { title: "Bundesliga", code: "ger.1", region: "international" },
  seriea: { title: "Serie A", code: "ita.1", region: "international" },
  eredivisie: { title: "Eredivisie", code: "ned.1", region: "international" },
  portugal: { title: "Primeira Liga", code: "por.1", region: "international" },
  mls: { title: "MLS", code: "usa.1", region: "international" },
  saudi: { title: "Saudi Pro League", code: "sau.1", region: "international" },
  turkey: { title: "Turkish Super Lig", code: "tur.1", region: "international" },
  scotland: { title: "Scottish Premiership", code: "sco.1", region: "international" },
  europa: { title: "Europa League", code: "uefa.europa", region: "international" },
  brazil: { title: "Brazil Serie A", code: "bra.1", region: "international" },
  argentina: { title: "Argentina Primera División", code: "arg.1", region: "international" },
  mexico: { title: "Liga MX", code: "mex.1", region: "international" },
  japan: { title: "J1 League", code: "jpn.1", region: "international" },
  australia: { title: "A-League", code: "aus.1", region: "international" }
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
Object.entries(leagueConfig).filter(([key, conf]) => conf.code).forEach(([key, conf]) => {
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
function eventToMatch(event, leagueName, region) {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors || [];
  const home = competitors.find(c => c.homeAway === "home") || competitors[0];
  const away = competitors.find(c => c.homeAway === "away") || competitors[1];
  if (!home || !away) return null;
  const state = event.status?.type?.state;
  const live = state === "in";
  const done = state === "post";
  const hs = home.score;
  const as = away.score;
  let score = "VS";
  if (hs !== undefined && as !== undefined && (live || done)) score = `${as} – ${hs}`;
  const status = live ? "LIVE" : done ? "FULL TIME" : "UPCOMING";
  return {
    league: leagueName,
    competitionKey: Object.keys(leagueConfig).find(key => leagueConfig[key].title === leagueName) || "unknown",
    region,
    time: formatKickoff(event.date),
    home: safeText(home.team?.displayName, "Home"),
    abbrH: safeText(home.team?.abbreviation, "H"),
    away: safeText(away.team?.displayName, "Away"),
    abbrA: safeText(away.team?.abbreviation, "A"),
    score,
    status,
    venue: safeText(comp?.venue?.fullName, "Match details"),
    sortDate: new Date(event.date || 0).getTime(),
    searchText: `${leagueName} ${home.team?.displayName || ""} ${away.team?.displayName || ""}`
  };
}
async function getJSON(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Data provider returned ${res.status}`);
  return res.json();
}
async function loadScoreboards() {
  const dateKey = selectedDateKey();
  const selectedLabel = new Date(`${matchDateInput.value}T12:00:00`).toLocaleDateString(undefined, {weekday:"long", day:"numeric", month:"long", year:"numeric"});
  dataStatus.innerHTML = `◷ <span>Loading ${selectedLabel}…</span>`;
  const configs = Object.values(leagueConfig).filter(c => c.code);
  const results = await Promise.allSettled(configs.map(async c => {
    const data = await getJSON(`${ESPN}/${c.code}/scoreboard?dates=${dateKey}`);
    return (data.events || []).map(event => eventToMatch(event, c.title, c.region)).filter(Boolean);
  }));
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  cachedMatches = all.sort((a,b) => {
    const aLive = a.status === "LIVE" ? 0 : a.status === "UPCOMING" ? 1 : 2;
    const bLive = b.status === "LIVE" ? 0 : b.status === "UPCOMING" ? 1 : 2;
    return aLive - bLive || a.sortDate - b.sortDate;
  });
  const succeeded = results.filter(r => r.status === "fulfilled").length;
  if (succeeded) {
    dataStatus.innerHTML = `◷ <span>Online · ${selectedLabel}</span>`;
    matchDisclaimer.textContent = `Showing fixtures and results for ${selectedLabel}. Scores and fixtures are loaded from ESPN public data endpoints; coverage may vary. Botola Pro is not connected yet.`;
  } else {
    dataStatus.innerHTML = "◷ <span>Data source unavailable</span>";
    matchDisclaimer.textContent = "Could not load online fixtures right now. Check your connection and refresh the page. Botola Pro data still needs a separate source.";
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
  if (!conf.code) {
    tableDataBadge.textContent = "NOT CONNECTED";
    standingsBody.innerHTML = `<tr><td colspan="7" class="empty-table">Botola Pro standings need a dedicated data provider. We are not showing invented table data.</td></tr>`;
    return;
  }
  tableDataBadge.textContent = "LOADING…";
  standingsBody.innerHTML = `<tr><td colspan="7">Loading online standings…</td></tr>`;
  try {
    const data = await getJSON(`${ESPN}/${conf.code}/standings`);
    const groups = data.children || [];
    let entries = data.standings?.entries || [];
    if (!entries.length && groups.length) entries = groups.flatMap(g => g.standings?.entries || []);
    if (!entries.length && data.standings?.entries) entries = data.standings.entries;
    if (!entries.length) throw new Error("No standings available");
    const rows = entries.slice(0, 10).map((entry, i) => {
      const stats = {};
      (entry.stats || []).forEach(s => { stats[s.name] = s.displayValue ?? s.value; });
      const team = entry.team || {};
      const played = stats.gamesPlayed ?? stats.played ?? "—";
      const wins = stats.wins ?? "—";
      const draws = stats.ties ?? stats.draws ?? "—";
      const losses = stats.losses ?? "—";
      const points = stats.points ?? "—";
      const initials = safeText(team.abbreviation, team.displayName || "FC").slice(0,3).toUpperCase();
      return `<tr><td>${i+1}</td><td><span class="club-cell"><span class="club-mini">${initials}</span>${safeText(team.displayName, "Club")}</span></td><td>${played}</td><td>${wins}</td><td>${draws}</td><td>${losses}</td><td>${points}</td></tr>`;
    }).join("");
    standingsBody.innerHTML = rows || `<tr><td colspan="7">Standings not available for this competition right now.</td></tr>`;
    tableDataBadge.textContent = "ONLINE DATA";
  } catch (err) {
    tableDataBadge.textContent = "UNAVAILABLE";
    standingsBody.innerHTML = `<tr><td colspan="7">Could not load this league's standings right now. Try again later.</td></tr>`;
  }
}
async function loadNews() {
  newsStatus.textContent = "Loading latest headlines from ESPN…";
  const sources = [
    { code: "eng.1", label: "Premier League" },
    { code: "uefa.champions", label: "Champions League" }
  ];
  try {
    const responses = await Promise.allSettled(sources.map(s => getJSON(`${ESPN}/${s.code}/news?limit=6`)));
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
