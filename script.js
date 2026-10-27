// Configuration dial API Football
const API_KEY = "3b08e2f0732808be8060205d15a5bd27"; // API Key test
const API_URL = "https://v3.football.api-sports.io/fixtures?live=all";

async function fetchLiveMatches() {
    const container = document.getElementById("matches-container");
    if (!container) return;

    container.innerHTML = "<div class='loading'>Jari jalb l-matchat direct...</div>";

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Data API:", data);

        if (!data.response || data.response.length === 0) {
            // Ila makayn 7ta match live daba, njibo matchat dial l-yowm
            fetchTodayMatches();
            return;
        }

        renderMatches(data.response);

    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = "<p style='color:red;'>Mchkil f l-API. T'kked men l-Console (F12).</p>";
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
            container.innerHTML = "<p>Makayn ta match l-yowm.</p>";
            return;
        }
        renderMatches(data.response.slice(0, 15)); // Affiche 15 matches
    } catch (e) {
        container.innerHTML = "<p>Mchkil f l-fetche dial matchat l-yowm.</p>";
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
            <div class="league-name">${item.league.name} - ${item.league.country}</div>
            <div class="match-details">
                <div class="team">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" width="25">
                    <span>${teams.home.name}</span>
                </div>
                <div class="score">${goals.home ?? 0} - ${goals.away ?? 0}</div>
                <div class="team">
                    <img src="${teams.away.logo}" alt="${teams.away.name}" width="25">
                    <span>${teams.away.name}</span>
                </div>
            </div>
            <div class="status-badge">${status} - ${fixture.status.elapsed ?? 0}'</div>
        `;
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", fetchLiveMatches);
