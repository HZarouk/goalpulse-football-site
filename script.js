const API_KEY = "3b08e2f0732808be8060205d15a5bd27"; 

// Fallback data when API limit is reached or no matches found
const SAMPLE_MATCHES = [
    {
        league: { name: "Premier League", country: "England" },
        teams: { 
            home: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
            away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" }
        },
        goals: { home: 2, away: 1 },
        fixture: { status: { short: "2H", elapsed: 75 } }
    },
    {
        league: { name: "La Liga", country: "Spain" },
        teams: { 
            home: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
            away: { name: "FC Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" }
        },
        goals: { home: 0, away: 0 },
        fixture: { status: { short: "NS", elapsed: 0 } }
    },
    {
        league: { name: "Champions League", country: "World" },
        teams: { 
            home: { name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
            away: { name: "PSG", logo: "https://media.api-sports.io/football/teams/85.png" }
        },
        goals: { home: 1, away: 1 },
        fixture: { status: { short: "1H", elapsed: 38 } }
    },
    {
        league: { name: "Botola Pro", country: "Morocco" },
        teams: { 
            home: { name: "Raja CA", logo: "https://media.api-sports.io/football/teams/1020.png" },
            away: { name: "Wydad AC", logo: "https://media.api-sports.io/football/teams/1021.png" }
        },
        goals: { home: 1, away: 0 },
        fixture: { status: { short: "FT", elapsed: 90 } }
    }
];

async function loadMatches(type = 'live') {
    const container = document.getElementById("matches-container");
    container.innerHTML = "<div class='loading'><i class='fa-solid fa-spinner fa-spin'></i> Chargement des matchs...</div>";

    let url = "https://v3.football.api-sports.io/fixtures?live=all";
    if (type === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url = `https://v3.football.api-sports.io/fixtures?date=${today}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "x-apisports-key": API_KEY }
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();

        if (!data.response || data.response.length === 0) {
            renderMatches(SAMPLE_MATCHES);
        } else {
            renderMatches(data.response.slice(0, 12));
        }

    } catch (error) {
        console.warn("Utilisation des données de démonstration (API secours)");
        renderMatches(SAMPLE_MATCHES);
    }
}

function renderMatches(matches) {
    const container = document.getElementById("matches-container");
    container.innerHTML = "";

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
                <span>${item.league.name}</span>
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

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loadMatches('live');

    document.getElementById("btn-live").addEventListener("click", (e) => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        loadMatches('live');
    });

    document.getElementById("btn-today").addEventListener("click", (e) => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        loadMatches('today');
    });

    document.querySelectorAll(".league-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".league-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            loadMatches('today');
        });
    });
});