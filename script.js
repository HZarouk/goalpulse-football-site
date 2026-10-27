// Clé API Football (Gratuite pour tester)
const API_KEY = "3b08e2f0732808be8060205d15a5bd27"; 
const API_URL_LIVE = "https://v3.football.api-sports.io/fixtures?live=all";

async function fetchLiveMatches() {
    const container = document.getElementById("matches-container");
    if (!container) return;

    container.innerHTML = "<div class='loading'>Chargement des matchs en direct...</div>";

    try {
        const response = await fetch(API_URL_LIVE, {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Données reçues :", data);

        if (!data.response || data.response.length === 0) {
            fetchTodayMatches();
            return;
        }

        renderMatches(data.response);

    } catch (error) {
        console.error("Erreur lors de la récupération :", error);
        container.innerHTML = "<p style='color:red;'>Impossible de charger les matchs. Vérifiez la console (F12).</p>";
    }
}

async function fetchTodayMatches() {
    const container = document.getElementById("matches-container");
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        });

        const data = await response.json();
        
        if (!data.response || data.response.length === 0) {
            container.innerHTML = "<p>Aucun match prévu pour aujourd'hui.</p>";
            return;
        }

        renderMatches(data.response.slice(0, 15));

    } catch (e) {
        container.innerHTML = "<p>Erreur lors du chargement des matchs du jour.</p>";
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

        const card = document.createElement("div");
        card.className = "match-card";
        card.innerHTML = `
            <div class="league-name">${item.league.name} (${item.league.country})</div>
            <div class="match-details">
                <div class="team home">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" width="25">
                    <span>${teams.home.name}</span>
                </div>
                <div class="score">${goals.home ?? 0} - ${goals.away ?? 0}</div>
                <div class="team away">
                    <span>${teams.away.name}</span>
                    <img src="${teams.away.logo}" alt="${teams.away.name}" width="25">
                </div>
            </div>
            <div class="status-badge">${status} - ${fixture.status.elapsed ?? 0}'</div>
        `;
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", fetchLiveMatches);