# GoalPulse Football — SportScore Edition

Version statique conçue pour GitHub Pages. Les données sont demandées directement à l’API publique SportScore : aucun compte API-Football et aucun Cloudflare Worker ne sont requis pour cette version.

## Publication
1. Décompressez le dossier.
2. Téléversez `index.html`, `styles.css` et `script.js` dans la racine du dépôt GitHub Pages.
3. Committez les changements, puis rechargez le site avec `Ctrl + F5`.

## Données et limites
- Les matchs sont chargés depuis SportScore (fixtures datées et liste des matchs).
- Classement et buteurs sont demandés via les endpoints publics SportScore. Leur disponibilité dépend des compétitions/slugs et de la couverture fournie par la source.
- Les actualités restent explicitement indiquées comme non connectées tant qu’une source éditoriale vérifiée n’est pas configurée.
- Aucun résultat, classement ou titre d’actualité fictif n’est généré.
- Conservez le lien visible « Powered by SportScore » conformément aux conditions de l’API.

Documentation : https://sportscore.com/developers/api/
