// --- GoalPulse Football Site Script --- //

// 1. Dkhl L-API Key o L-Endpoint S-Sḥiḥa dyal l-provider dyalek
const API_KEY = 'YOUR_API_KEY_HERE'; // Dder l-key dyalk hna
const API_URL = 'https://api.football-data.org/v4/matches'; // Mthal: football-data.org

document.addEventListener('DOMContentLoaded', () => {
    fetchLiveMatches();
});

async function fetchLiveMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = '<p>Loading live matches...</p>';

    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'X-Auth-Token': API_KEY // Badel l-header 3la hsab l-API
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        displayMatches(data.matches || []);

    } catch (error) {
        console.error('Error fetching football data:', error);
        container.innerHTML = `<p style="color:red;">Failed to load data. Check API Key or CORS limits.</p>`;
    }
}

function displayMatches(matches) {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    if (matches.length === 0) {
        container.innerHTML = '<p>No matches available right now.</p>';
        return;
    }

    matches.forEach(match => {
        const matchCard = document.createElement('div');
        matchCard.className = 'match-card';
        matchCard.innerHTML = `
            <div class="team">${match.homeTeam.name}</div>
            <div class="score">${match.score.fullTime.home ?? 0} - ${match.score.fullTime.away ?? 0}</div>
            <div class="team">${match.awayTeam.name}</div>
            <div class="status">${match.status}</div>
        `;
        container.appendChild(matchCard);
    });
}
