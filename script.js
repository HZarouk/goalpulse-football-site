let API_KEY = localStorage.getItem("goalpulse_api_key") || "3b08e2f0732808be8060205d15a5bd27";
let currentSelectedLeague = "all";
let currentDateFilter = new Date().toISOString().split('T')[0];

// Realistic fallback fixtures per date
const FALLBACK_FIXTURES = {
    today: [
        {
            league: { id: 39, name: "Premier League", country: "England" },
            teams: { 
                home: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
                away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" }
            },
            goals: { home: 2, away: 1 },
            fixture: { status: { short: "2H", elapsed: 78 } }
        },
        {
            league: { id: 140, name: "La Liga", country: "Spain" },
            teams: { 
                home: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
                away: { name: "FC Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" }
            },
            goals: { home: 0, away: 0 },
            fixture: { status: { short: "NS", elapsed: 0 } }
        },
        {
            league: { id: 2, name: "Champions League", country: "World" },
            teams: { 
                home: { name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
                away: { name: "PSG", logo: "https://media.api-sports.io/football/teams/85.png" }
            },
            goals: { home: 1, away: 1 },
            fixture: { status: { short: "1H", elapsed: 38 } }
        },
        {
            league: { id: 200, name: "Botola Pro", country: "Morocco" },
            teams: { 
                home: { name: "Raja CA", logo: "https://media.api-sports.io/football/teams/1020.png" },
                away: { name: "Wydad AC", logo: "https://media.api-sports.io/football/teams/1021.png" }
            },
            goals: { home: 1, away: 0 },
            fixture: { status: { short: "FT", elapsed: 90 } }
        },
        {
            league: { id: 135, name: "Serie A", country: "Italy" },
            teams: { 
                home: { name: "Inter Milan", logo: "https://media.api-sports.io/football/teams/505.png" },
                away: { name: "AC Milan", logo: "https://media.api-sports.io/football/teams/489.png" }
            },
            goals: { home: 3, away: 2 },
            fixture: { status: { short: "FT", elapsed: 90 } }
        }
    ],
    yesterday: [
        {
            league: { id: 39, name: "Premier League", country: "England" },
            teams: { 
                home: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
                away: { name: "Man City", logo: "https://media.api-sports.io/football/teams/50.png" }
            },
            goals: { home: 1, away: 1 },
            fixture: { status: { short: "FT", elapsed: 90 } }
        },
        {
            league: { id: 78, name: "Bundesliga", country: "Germany" },
            teams: { 
                home: { name: "Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
                away: { name: "Leverkusen", logo: "https://media.api-sports.io/football/teams/168.png" }
            },
            goals: { home: 2, away: 3 },
            fixture: { status: { short: "FT", elapsed: 90 } }
        }
    ],
    tomorrow: [
        {
            league: { id: 140, name: "La Liga", country: "Spain" },
            teams: { 
                home: { name: "Atletico Madrid", logo: "https://media.api-sports.io/football/teams/530.png" },
                away: { name: "Sevilla FC", logo: "https://media.api-sports.io/football/teams/536.png" }
            },
            goals: { home: 0, away: 0 },
            fixture: { status: { short: "NS", elapsed: 0 } }
        },
        {
            league: { id: 61, name: "Ligue 1", country: "France" },
            teams: { 
                home: { name: "Marseille", logo: "https://media.api-sports.io/football/teams/81.png" },
                away: { name: "Lyon", logo: "https://media.api-sports.io/football/teams/80.png" }
            },
            goals: { home: 0, away: 0 },
            fixture: { status: { short: "NS", elapsed: 0 } }
        }
    ]
};

// Fallback Standings Data
const FALLBACK_STANDINGS = {
    "39": [
        { rank: 1, team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" }, points: 68, goalsDiff: 45, all: { played: 29, win: 21, draw: 5, lose: 3, goals: { for: 70, against: 25 } } },
        { rank: 2, team: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, points: 67, goalsDiff: 38, all: { played: 29, win: 20, draw: 7, lose: 2, goals: { for: 65, against: 27 } } },
        { rank: 3, team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" }, points: 64, goalsDiff: 35, all: { played: 29, win: 19, draw: 7, lose: 3, goals: { for: 63, against: 28 } } },
        { rank: 4, team: { name: "Aston Villa", logo: "https://media.api-sports.io/football/teams/66.png" }, points: 59, goalsDiff: 18, all: { played: 30, win: 18, draw: 5, lose: 7, goals: { for: 62, against: 44 } } },
        { rank: 5, team: { name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png" }, points: 56, goalsDiff: 15, all: { played: 29, win: 17, draw: 5, lose: 7, goals: { for: 61, against: 46 } } }
    ],
    "140": [
        { rank: 1, team: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" }, points: 72, goalsDiff: 40, all: { played: 29, win: 22, draw: 6, lose: 1, goals: { for: 60, against: 20 } } },
        { rank: 2, team: { name: "FC Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" }, points: 64, goalsDiff: 26, all: { played: 29, win: 19, draw: 7, lose: 3, goals: { for: 60, against: 34 } } },
        { rank: 3, team: { name: "Girona", logo: "https://media.api-sports.io/football/teams/547.png" }, points: 62, goalsDiff: 24, all: { played: 29, win: 19, draw: 5, lose: 5, goals: { for: 59, against: 35 } } },
        { rank: 4, team: { name: "Atletico Madrid", logo: "https://media.api-sports.io/football/teams/530.png" }, points: 55, goalsDiff: 19, all: { played: 29, win: 17, draw: 4, lose: 8, goals: { for: 50, against: 31 } } }
    ],
    "200": [
        { rank: 1, team: { name: "AS FAR Rabat", logo: "https://media.api-sports.io/football/teams/1023.png" }, points: 58, goalsDiff: 32, all: { played: 24, win: 18, draw: 4, lose: 2, goals: { for: 53, against: 21 } } },
        { rank: 2, team: { name: "Raja CA", logo: "https://media.api-sports.io/football/teams/1020.png" }, points: 54, goalsDiff: 27, all: { played: 24, win: 15, draw: 9, lose: 0, goals: { for: 41, against: 14 } } },
        { rank: 3, team: { name: "RS Berkane", logo: "https://media.api-sports.io/football/teams/1022.png" }, points: 40, goalsDiff: 12, all: { played: 24, win: 10, draw: 10, lose: 4, goals: { for: 30, against: 18 } } },
        { rank: 4, team: { name: "Wydad AC", logo: "https://media.api-sports.io/football/teams/1021.png" }, points: 37, goalsDiff: 6, all: { played: 24, win: 10, draw: 7, lose: 7, goals: { for: 27, against: 21 } } }
    ]
};

async function fetchMatchesFromAPI(dateStr, isLive = false, leagueId = "all") {
    const container = document.getElementById("matches-container");
    container.innerHTML = "<div class='loading'><i class='fa-solid fa-spinner fa-spin'></i> Chargement des matchs en direct...</div>";

    let url = isLive 
        ? "https://v3.football.api-sports.io/fixtures?live=all" 
        : `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;

    if (leagueId !== "all") {
        url += `&league=${leagueId}&season=2025`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "x-apisports-key": API_KEY }
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            renderMatches(data.response);
        } else {
            console.warn("API renvoie un tableau vide. Basculement sur secours de la date.");
            loadFallbackMatches(dateStr, leagueId);
        }
    } catch (err) {
        console.warn("API Limit / Error. Basculement vers les données locales.", err);
        loadFallbackMatches(dateStr, leagueId);
    }
}

function loadFallbackMatches(dateStr, leagueId) {
    let list = FALLBACK_FIXTURES.today;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (dateStr < todayStr) list = FALLBACK_FIXTURES.yesterday;
    else if (dateStr > todayStr) list = FALLBACK_FIXTURES.tomorrow;

    if (leagueId !== "all") {
        list = list.filter(m => m.league.id.toString() === leagueId.toString());
    }

    if (list.length === 0) {
        list = FALLBACK_FIXTURES.today;
    }

    renderMatches(list);
}

function renderMatches(matches) {
    const container = document.getElementById("matches-container");
    container.innerHTML = "";

    if (!matches || matches.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#94a3b8;'>Aucun match trouvé pour ces critères.</p>";
        return;
    }

    matches.forEach(item => {
        const fixture = item.fixture;
        const teams = item.teams;
        const goals = item.goals;
        const status = fixture.status.short;

        const isLive = status === "1H" || status === "2H" || status === "HT";
        const badgeClass = isLive ? "status-live" : "status-normal";

        const card = document.createElement("div");
        card.className = "match-card";
        card.innerHTML = `
            <div class="card-header">
                <span>${item.league.name} (${item.league.country})</span>
                <span class="${badgeClass}">${isLive ? '<i class="fa-solid fa-circle-dot"></i> LIVE ' + fixture.status.elapsed + "'" : status}</span>
            </div>
            <div class="card-body">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" onerror="this.src='https://via.placeholder.com/25'">
                    <span class="team-name">${teams.home.name}</span>
                </div>
                <div class="score">${goals.home ?? 0} - ${goals.away ?? 0}</div>
                <div class="team away">
                    <span class="team-name">${teams.away.name}</span>
                    <img src="${teams.away.logo}" alt="${teams.away.name}" onerror="this.src='https://via.placeholder.com/25'">
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fetch Standings
async function fetchStandings(leagueId = "39") {
    const tbody = document.getElementById("standings-tbody");
    tbody.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:15px;'><i class='fa-solid fa-spinner fa-spin'></i> Chargement du classement...</td></tr>";

    try {
        const response = await fetch(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=2025`, {
            method: "GET",
            headers: { "x-apisports-key": API_KEY }
        });
        const data = await response.json();
        
        if (data.response && data.response.length > 0 && data.response[0].league.standings) {
            renderStandingsTable(data.response[0].league.standings[0]);
        } else {
            loadFallbackStandings(leagueId);
        }
    } catch (e) {
        loadFallbackStandings(leagueId);
    }
}

function loadFallbackStandings(leagueId) {
    const data = FALLBACK_STANDINGS[leagueId] || FALLBACK_STANDINGS["39"];
    renderStandingsTable(data);
}

function renderStandingsTable(rows) {
    const tbody = document.getElementById("standings-tbody");
    tbody.innerHTML = "";

    rows.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.rank}</strong></td>
            <td class="team-cell">
                <img src="${item.team.logo}" width="20" height="20">
                <span>${item.team.name}</span>
            </td>
            <td>${item.all.played}</td>
            <td>${item.all.win}</td>
            <td>${item.all.draw}</td>
            <td>${item.all.lose}</td>
            <td>${item.all.goals.for}/${item.all.goals.against}</td>
            <td>${item.goalsDiff > 0 ? '+' + item.goalsDiff : item.goalsDiff}</td>
            <td class="pts-cell">${item.points}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Initialization & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("custom-date-picker").value = today;

    // Load initial matches and standings
    fetchMatchesFromAPI(today, false, "all");
    fetchStandings("39");

    // Save user API key
    document.getElementById("save-key-btn").addEventListener("click", () => {
        const inputKey = document.getElementById("user-api-key").value.trim();
        if (inputKey) {
            API_KEY = inputKey;
            localStorage.setItem("goalpulse_api_key", inputKey);
            alert("Clé API enregistrée ! Rechargement des données réelles...");
            fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
            fetchStandings(document.getElementById("standings-league-select").value);
        }
    });

    // Date Filters
    document.getElementById("btn-today").addEventListener("click", (e) => {
        setActiveDateBtn(e.target);
        currentDateFilter = new Date().toISOString().split('T')[0];
        fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
    });

    document.getElementById("btn-yesterday").addEventListener("click", (e) => {
        setActiveDateBtn(e.target);
        const y = new Date();
        y.setDate(y.getDate() - 1);
        currentDateFilter = y.toISOString().split('T')[0];
        fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
    });

    document.getElementById("btn-tomorrow").addEventListener("click", (e) => {
        setActiveDateBtn(e.target);
        const t = new Date();
        t.setDate(t.getDate() + 1);
        currentDateFilter = t.toISOString().split('T')[0];
        fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
    });

    document.getElementById("custom-date-picker").addEventListener("change", (e) => {
        currentDateFilter = e.target.value;
        document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
        fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
    });

    document.getElementById("btn-live").addEventListener("click", () => {
        document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
        fetchMatchesFromAPI(currentDateFilter, true, currentSelectedLeague);
    });

    // League Filters
    document.querySelectorAll(".league-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".league-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            currentSelectedLeague = item.getAttribute("data-league");
            fetchMatchesFromAPI(currentDateFilter, false, currentSelectedLeague);
        });
    });

    // Standings league dropdown
    document.getElementById("standings-league-select").addEventListener("change", (e) => {
        fetchStandings(e.target.value);
    });
});

function setActiveDateBtn(btnElement) {
    document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
    btnElement.classList.add("active");
}