/*
 GoalPulse online data integration.
 Scoreboards, standings and headlines use ESPN's public, undocumented JSON endpoints.
 They require no API key, but are not a guaranteed/official developer API and may change.
 Competitions are grouped by Europe, the Americas and Asia.
*/
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";

// Optional Cloudflare Worker proxy. After deploying worker.js, paste its URL here.
// Example: const ESPN_PROXY = "https://goalpulse-espn-proxy.YOUR-SUBDOMAIN.workers.dev";
const ESPN_PROXY = "";
const leagueConfig = {
  premier: { title: "Premier League", code: "eng.1", region: "europe" },
  laliga: { title: "La Liga", code: "esp.1", region: "europe" },
  ucl: { title: "Champions League", code: "uefa.champions", region: "europe" },
  ligue1: { title: "Ligue 1", code: "fra.1", region: "europe" },
  bundesliga: { title: "Bundesliga", code: "ger.1", region: "europe" },
  seriea: { title: "Serie A", code: "ita.1", region: "europe" },
  eredivisie: { title: "Eredivisie", code: "ned.1", region: "europe" },
  portugal: { title: "Primeira Liga", code: "por.1", region: "europe" },
  mls: { title: "MLS", code: "usa.1", region: "americas" },
  turkey: { title: "Turkish Super Lig", code: "tur.1", region: "europe" },
  scotland: { title: "Scottish Premiership", code: "sco.1", region: "europe" },
  europa: { title: "Europa League", code: "uefa.europa", region: "europe" },
  brazil: { title: "Brazil Serie A", code: "bra.1", region: "americas" },
  argentina: { title: "Argentina Primera División", code: "arg.1", region: "americas" },
  mexico: { title: "Liga MX", code: "mex.1", region: "americas" },
  japan: { title: "J1 League", code: "jpn.1", region: "asia" },
  australia: { title: "A-League", code: "aus.1", region: "asia" }
};
const matchGrid = document.getElementById("matchGrid");
const dataStatus = document.getElementById("dataStatus");
const matchDisclaimer = document.getElementById("matchDisclaimer");
const tableTitle = document.getElementById("tableTitle");
const standingsBody = document.getElementById("standingsBody");
const tableDataBadge = document.getElementById("tableDataBadge");
const newsStatus = document.getElementById("newsStatus");
let currentFilter = "all";
let currentSearch = "";
let currentCompetition = "all";
let cachedMatches = [];
let activeLeague = "premier";
const matchDateInput = document.getElementById("matchDate");
const competitionFilter = document.getElementById("competitionFilter");
const regionLabels = { europe: "Europe", americas: "Americas", asia: "Asia" };
const leagueColors = ["purple", "red", "blue", "green"];
function renderLeagueChoices() {
  const list = document.getElementById("leagueList");
  list.innerHTML = "";
  Object.entries(leagueConfig).forEach(([key, conf], index) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = conf.title;
    competitionFilter.appendChild(option);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `league-select${key === activeLeague ? " selected" : ""}`;
    button.dataset.league = key;
    const code = conf.title === "Champions League" ? "UCL" : conf.title.split(/\s+/).map(w => w[0]).join("").slice(0,3).toUpperCase();
    button.innerHTML = `<span class="league-icon ${leagueColors[index % leagueColors.length]}">${code}</span><span><strong>${conf.title}</strong><small>${regionLabels[conf.region] || conf.region}</small></span><span class="chevron">↗</span>`;
    button.addEventListener("click", () => {
      document.querySelectorAll(".league-select").forEach(b => b.classList.remove("selected"));
      button.classList.add("selected");
      loadStandings(key);
    });
    list.appendChild(button);
  });
}
competitionFilter.addEventListener("change", () => {
  currentCompetition = competitionFilter.value;
  renderMatches();
});
function localDateKey(date) { return `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}`; }
function dateInputValue(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function selectedDateKey() { return localDateKey(new Date(`${matchDateInput.value}T12:00:00`)); }
function changeSelectedDate(days) { const d = new Date(`${matchDateInput.value}T12:00:00`); d.setDate(d.getDate()+days); matchDateInput.value = dateInputValue(d); loadScoreboards(); }

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
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
  if (hs !== undefined && as !== undefined && (live || done)) score = `${hs} – ${as}`;
  const status = live ? "LIVE" : done ? "FULL TIME" : "UPCOMING";
  return {
    eventId: String(event.id || ""),
    leagueCode: Object.values(leagueConfig).find(c => c.title === leagueName)?.code || "",
    kickoffISO: event.date || "",
    rawStatus: safeText(event.status?.type?.detail, status),
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
  // Browser-to-ESPN calls can be blocked by CORS. When ESPN_PROXY is configured,
  // send the ESPN URL through our own Worker proxy instead.
  const requestURL = ESPN_PROXY
    ? `${ESPN_PROXY.replace(/\\/$/, "")}/?url=${encodeURIComponent(url)}`
    : url;
  const res = await fetch(requestURL, { headers: { "Accept": "application/json" } });
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
    matchDisclaimer.textContent = `Showing fixtures and results for ${selectedLabel}. Scores and fixtures are loaded from ESPN public data endpoints; coverage may vary. Competitions are grouped by Europe, the Americas and Asia.`;
  } else {
    dataStatus.innerHTML = "◷ <span>Data source unavailable</span>";
    matchDisclaimer.textContent = "Could not load online fixtures right now. Check your connection and refresh the page. Some competitions may be temporarily unavailable from the public data source.";
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
    return `<article class="match-card match-card-clickable" tabindex="0" role="button" aria-label="View match details: ${escapeHTML(m.home)} vs ${escapeHTML(m.away)}" data-event-id="${escapeHTML(m.eventId)}" data-league-code="${escapeHTML(m.leagueCode)}">
      <div class="match-card-top"><span class="match-league"><i class="league-bullet"></i>${m.league}</span><span class="${stateClass}">${m.status}</span></div>
      <div class="teams">
        <div class="team"><span class="team-crest">${m.abbrH}</span><strong>${m.home}</strong><small>Home</small></div>
        <div class="match-score">${m.score}<small>${m.status === "LIVE" ? "LIVE NOW" : m.status === "FULL TIME" ? "RESULT" : "KICK-OFF"}</small></div>
        <div class="team"><span class="team-crest">${m.abbrA}</span><strong>${m.away}</strong><small>Away</small></div>
      </div>
      <div class="match-card-bottom"><span>${m.time}</span><span>${m.venue}</span></div>
    </article>`;
  }).join("");
  matchGrid.innerHTML = cards;
  matchGrid.querySelectorAll(".match-card-clickable").forEach(card => {
    const open = () => {
      const match = display.find(item => item.eventId === card.dataset.eventId);
      if (match) openMatchDetails(match);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
  if (!display.length) matchGrid.innerHTML = `<div class="date-empty"><strong>No fixtures or results found for this date.</strong><p>Try another date, choose “All matches”, or clear the search. Some competitions may not provide historical/future data through this source.</p></div>`;
}

const matchModal = document.getElementById("matchModal");
let activeDetailMatch = null;
let activeDetailTab = "overview";
let activeDetailPayload = null;
function detailText(value, fallback = "") { return escapeHTML(value === undefined || value === null || value === "" ? fallback : value); }
function closeMatchDetails() {
  matchModal.hidden = true;
  document.body.style.overflow = "";
  activeDetailMatch = null;
}
function openMatchDetails(match) {
  activeDetailMatch = match;
  activeDetailPayload = null;
  activeDetailTab = "overview";
  document.querySelectorAll(".detail-tab").forEach(b => b.classList.toggle("active", b.dataset.detailTab === activeDetailTab));
  document.getElementById("detailLeague").textContent = match.league;
  document.getElementById("detailHome").textContent = match.home;
  document.getElementById("detailAway").textContent = match.away;
  document.getElementById("detailHomeCrest").textContent = match.abbrH;
  document.getElementById("detailAwayCrest").textContent = match.abbrA;
  document.getElementById("matchModalTitle").textContent = `${match.home} vs ${match.away}`;
  document.getElementById("detailScore").textContent = match.score;
  document.getElementById("detailStatus").textContent = match.status;
  document.getElementById("detailTime").textContent = match.time;
  document.getElementById("detailVenue").textContent = match.venue;
  matchModal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("detailContent").innerHTML = '<div class="detail-empty">Loading available match details…</div>';
  loadMatchSummary(match);
  document.getElementById("closeMatchModal").focus();
}
async function loadMatchSummary(match) {
  if (!match.eventId || !match.leagueCode) {
    document.getElementById("detailContent").innerHTML = '<div class="detail-empty">Detailed data is not available for this match.</div>';
    return;
  }
  try {
    const payload = await getJSON(`${ESPN}/${match.leagueCode}/summary?event=${encodeURIComponent(match.eventId)}`);
    if (activeDetailMatch?.eventId !== match.eventId) return;
    activeDetailPayload = payload;
    renderMatchDetailTab();
  } catch (error) {
    if (activeDetailMatch?.eventId !== match.eventId) return;
    document.getElementById("detailContent").innerHTML = '<div class="detail-empty">The match score and schedule are available, but ESPN did not provide extra details right now. Try again later.</div>';
  }
}
function detailStatValue(team, candidates) {
  const stats = team?.statistics || team?.stats || [];
  for (const candidate of candidates) {
    const found = Array.isArray(stats) ? stats.find(x => String(x.name || x.abbreviation || "").toLowerCase() === candidate.toLowerCase()) : stats[candidate];
    if (found !== undefined) return Array.isArray(stats) ? (found.displayValue ?? found.value ?? found.display ?? "—") : (found.displayValue ?? found.value ?? found);
  }
  return "—";
}
function renderMatchDetailTab() {
  const root = document.getElementById("detailContent");
  const data = activeDetailPayload || {};
  const competition = data.header?.competitions?.[0] || data.header?.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find(c => c.homeAway === "home") || {};
  const away = competitors.find(c => c.homeAway === "away") || {};
  if (activeDetailTab === "statistics") {
    const box = data.boxscore || {};
    const teams = box.teams || [];
    const h = teams.find(t => t.homeAway === "home") || teams[0] || {};
    const a = teams.find(t => t.homeAway === "away") || teams[1] || {};
    const defs = [
      ["Possession", ["possessionPct","possession"]],
      ["Shots", ["totalShots","shots"]],
      ["Shots on target", ["shotsOnTarget","shotsOnGoal"]],
      ["Corners", ["wonCorners","corners"]],
      ["Fouls", ["foulsCommitted","fouls"]],
      ["Yellow cards", ["yellowCards"]],
      ["Red cards", ["redCards"]]
    ];
    const rows = defs.map(([label, keys]) => {
      const hv = detailStatValue(h, keys), av = detailStatValue(a, keys);
      if (hv === "—" && av === "—") return "";
      const hn = parseFloat(hv), an = parseFloat(av), total = (Number.isFinite(hn)?hn:0)+(Number.isFinite(an)?an:0);
      const hp = total ? (Number.isFinite(hn)?hn:0)/total*100 : 50;
      return `<div class="detail-stat"><div><div class="detail-stat-values"><span>${detailText(hv,"—")}</span></div></div><div><div class="detail-stat-label">${escapeHTML(label)}</div><div class="detail-stat-bar"><span style="width:${hp}%"></span><span style="width:${100-hp}%"></span></div></div><div><div class="detail-stat-values"><span>${detailText(av,"—")}</span></div></div></div>`;
    }).filter(Boolean).join("");
    root.innerHTML = rows || '<div class="detail-empty">Match statistics are not available from the data source for this fixture.</div>';
    return;
  }
  if (activeDetailTab === "lineups") {
    const players = data.boxscore?.players || [];
    const blocks = players.map(group => {
      const team = group.team || {};
      const sections = group.statistics || [];
      const names = sections.flatMap(section => section.athletes || []).map(p => p.athlete?.displayName || p.displayName || p.athlete?.fullName).filter(Boolean);
      const distinct = [...new Set(names)];
      if (!distinct.length) return "";
      return `<div class="detail-lineup"><h4>${detailText(team.displayName || team.name, "Team")}</h4><ol>${distinct.map(n=>`<li>${escapeHTML(n)}</li>`).join("")}</ol></div>`;
    }).filter(Boolean).join("");
    root.innerHTML = blocks ? `<div class="detail-lineups">${blocks}</div>` : '<div class="detail-empty">Lineups are not available for this match yet. They may appear closer to kick-off or after the match starts.</div>';
    return;
  }
  const plays = data.plays || data.commentary?.items || [];
  // ESPN summaries commonly expose scoring plays with scoringPlay=true and athletes[].
  // Never infer a scorer from the final score: only show names supplied by the feed.
  const goals = plays.filter(p => {
    const typeText = `${p.type?.text || ""} ${p.type?.name || ""} ${p.text || p.shortText || ""}`.toLowerCase();
    return p.scoringPlay === true || /\b(goal|penalty scored|own goal)\b/.test(typeText);
  });
  const scorerName = p => {
    const athletes = Array.isArray(p.athletes) ? p.athletes : Array.isArray(p.participants) ? p.participants : [];
    const athlete = athletes.map(a => a.athlete || a.player || a).find(a => a?.displayName || a?.fullName || a?.name);
    if (athlete) return athlete.displayName || athlete.fullName || athlete.name;
    return p.scorer?.displayName || p.scorer?.fullName || p.athlete?.displayName || p.athlete?.fullName || "";
  };
  const goalRows = goals.map(p => {
    const clock = p.clock?.displayValue || p.time?.displayValue || p.clock || p.period?.displayValue || "•";
    const name = scorerName(p);
    const description = p.text || p.shortText || p.type?.text || "Goal";
    const score = p.homeScore != null && p.awayScore != null ? `${p.homeScore}–${p.awayScore}` : "";
    return `<div class="detail-event goal-event"><time>${detailText(clock,"•")}</time><span><strong>⚽ ${escapeHTML(name || "Goal scorer not listed")}</strong><br><span class="goal-description">${escapeHTML(description)}</span></span>${score ? `<b class="goal-score">${escapeHTML(score)}</b>` : ""}</div>`;
  }).reverse().join("");
  const goalSection = goals.length
    ? `<section class="goal-scorers"><h3>GOAL SCORERS</h3><div class="detail-event-list">${goalRows}</div></section>`
    : `<section class="goal-scorers"><h3>GOAL SCORERS</h3><div class="detail-empty">Scorer information is not available from ESPN for this match yet.</div></section>`;
  const events = plays.map(p => {
    const clock = p.clock?.displayValue || p.time?.displayValue || p.clock || "";
    const text = p.text || p.shortText || p.type?.text || p.type?.name || "";
    if (!text) return "";
    return `<div class="detail-event"><time>${detailText(clock,"•")}</time><span>${escapeHTML(text)}</span></div>`;
  }).filter(Boolean).slice(-30).reverse().join("");
  const venue = competition.venue?.fullName || competition.venue?.address?.city || activeDetailMatch?.venue;
  const officials = (competition.officials || []).map(o => o.fullName || o.displayName).filter(Boolean).join(", ");
  const meta = [
    `<div class="detail-event"><time>DATE</time><span>${detailText(activeDetailMatch?.time)}</span></div>`,
    `<div class="detail-event"><time>VENUE</time><span>${detailText(venue,"Venue not listed")}</span></div>`,
    officials ? `<div class="detail-event"><time>OFFICIAL</time><span>${escapeHTML(officials)}</span></div>` : ""
  ].join("");
  root.innerHTML = `${goalSection}<h3 class="timeline-heading">MATCH TIMELINE</h3><div class="detail-event-list">${events || '<div class="detail-empty">No event timeline is available for this match yet.</div>'}${meta}</div>`;
}
document.querySelectorAll("[data-detail-tab]").forEach(button => button.addEventListener("click", () => {
  activeDetailTab = button.dataset.detailTab;
  document.querySelectorAll(".detail-tab").forEach(b => b.classList.toggle("active", b === button));
  renderMatchDetailTab();
}));
document.getElementById("closeMatchModal").addEventListener("click", closeMatchDetails);
matchModal.querySelectorAll("[data-close-match]").forEach(el => el.addEventListener("click", closeMatchDetails));
document.addEventListener("keydown", event => { if (event.key === "Escape" && !matchModal.hidden) closeMatchDetails(); });

async function loadStandings(key) {
  activeLeague = key;
  const conf = leagueConfig[key];
  tableTitle.textContent = conf.title;
  tableDataBadge.textContent = "LOADING…";
  standingsBody.innerHTML = `<tr><td colspan="7">Loading online standings…</td></tr>`;
  try {
    const data = await getJSON(`${ESPN_STANDINGS}/${conf.code}/standings`);
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
    { code: "uefa.champions", label: "Champions League" },
    { code: "esp.1", label: "La Liga" },
    { code: "usa.1", label: "MLS" },
    { code: "bra.1", label: "Brazil Serie A" },
    { code: "jpn.1", label: "J1 League" }
  ];
  try {
    const responses = await Promise.allSettled(sources.map(s => getJSON(`${ESPN}/${s.code}/news?limit=6`)));
    const articles = [];
    responses.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      (r.value.articles || []).forEach(a => articles.push({ ...a, sourceLabel: sources[i].label }));
    });
    const unique = [...new Map(articles.filter(a => a.headline).map(a => [a.headline, a])).values()]
      .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
      .slice(0, 9);
    if (!unique.length) throw new Error("No headlines");
    document.getElementById("newsGrid").innerHTML = unique.map((a, i) => {
      const link = a.links?.web?.href || a.links?.api?.news?.href || "#";
      const image = a.images?.[0]?.url;
      const safeLink = /^https?:\/\//i.test(link) ? link : "#";
      return `<article class="news-card"><div class="news-art" ${image ? `style="background-image:linear-gradient(0deg,#111b 0%,#1114 100%),url('${image.replace(/'/g,"%27")}');background-size:cover;background-position:center` : ""}><span class="art-number">ONLINE / ${String(i+1).padStart(2,"0")}</span><span class="art-icon">${image ? "" : "⚽"}</span></div><div class="news-content"><span class="news-category">${escapeHTML(a.sourceLabel.toUpperCase())}</span><h3>${escapeHTML(a.headline)}</h3><p>${escapeHTML(safeText(a.description, "Open the source for the full story."))}</p><div class="news-meta"><span>${escapeHTML(safeText(a.published, "Latest"))}</span><a href="${safeLink}" target="_blank" rel="noopener noreferrer">Read source ↗</a></div></div></article>`;
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
document.getElementById("searchToggle").addEventListener("click", () => {
  document.getElementById("searchStrip").classList.toggle("open");
  if (document.getElementById("searchStrip").classList.contains("open")) document.getElementById("siteSearch").focus();
});
document.getElementById("siteSearch").addEventListener("input", e => {
  currentSearch = e.target.value.trim();
  renderMatches();
  document.getElementById("searchHint").textContent = currentSearch ? `Searching online fixtures and stories for “${currentSearch}”` : "Try “Arsenal”, “Real Madrid” or “Inter Miami”";
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
renderLeagueChoices();
loadScoreboards();
loadStandings("premier");
loadNews();
setInterval(loadScoreboards, 5 * 60 * 1000);
setInterval(() => loadStandings(activeLeague), 15 * 60 * 1000);
