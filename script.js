// Remplace par ton propre token API Football-Data
const API_KEY = "TON_API_KEY_ICI"; 

// Exemple : Premier League ('PL'), Champions League ('CL'), La Liga ('PD')
const LEAGUE_CODE = "PL"; 
const API_URL = `https://api.football-data.org/v4/competitions/${LEAGUE_CODE}/matches?status=SCHEDULED`;

async function fetchMatchData() {
    const container = document.getElementById("matches-container");
    if (!container) return;

    container.innerHTML = "<p>Chargement des matchs en cours...</p>";

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "X-Auth-Token": API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();
        console.log("Données reçues depuis l'API :", data);

        // Vérification de la présence des matchs
        if (!data.matches || data.matches.length === 0) {
            container.innerHTML = "<p>Aucun match programmé pour le moment.</p>";
            return;
        }

        // Afficher les 10 prochains matchs
        renderMatches(data.matches.slice(0, 10));

    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        container.innerHTML = `<p style="color:red;">Erreur : ${error.message}. Vérifie la console (F12).</p>`;
    }
}

function renderMatches(matches) {
    const container = document.getElementById("matches-container");
    container.innerHTML = "";

    matches.forEach(match => {
        const matchCard = document.createElement("div");
        matchCard.className = "match-card";
        
        // Formater la date du match
        const matchDate = new Date(match.utcDate).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        matchCard.innerHTML = `
            <div class="match-info">
                <span class="date">${matchDate}</span>
            </div>
            <div class="teams">
                <span class="team">${match.homeTeam.name}</span>
                <span class="vs">VS</span>
                <span class="team">${match.awayTeam.name}</span>
            </div>
        `;
        container.appendChild(matchCard);
    });
}

// Lancement automatique au chargement de la page
document.addEventListener("DOMContentLoaded", fetchMatchData);
