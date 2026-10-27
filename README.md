# GOALPULSE V10 — corrections ciblées

Corrections incluses dans cette version :
- Le filtre championnat s'applique aussi lorsque le mode Live Direct est activé.
- Le slug du match peut être extrait du champ `url` retourné par SportScore.
- Les dates calendrier sont calculées en date locale, sans conversion ISO UTC pouvant décaler le jour.
- Les lignes top buteurs incomplètes ne sont plus affichées avec un faux nom générique.

Limite importante :
- L'endpoint de classement `/api/widget/standings/` testé le 27 octobre 2026 avec `slug=premier-league` renvoie HTTP 404 dans le test effectué. Ce ZIP ne prétend donc pas réparer le classement ou garantir les top buteurs : il conserve un message d'indisponibilité plutôt que d'inventer des données.
- Il faut publier ce dossier sur GitHub Pages puis vérifier dans le navigateur que les réponses réelles de l'API et le filtrage sont corrects.
