#!/usr/bin/env bash
# Parcours de vérification de l'API Strapi : chaque étape de l'énoncé (et des bonus) est
# exécutée puis vérifiée. Nécessite seulement curl et l'application démarrée (docker compose).
# Crée des données de test (discussion « Vérification automatique … », réponse, vote).
set -uo pipefail

BASE="${API_URL:-http://localhost:1337}/api"
PASSWORD='Demo1234!'
FAILURES=0
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT

step() { printf '\n== %s\n' "$1"; }
ok() { printf '   ok %s\n' "$1"; }
ko() { printf '   KO %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

# req METHOD PATH [TOKEN] [JSON] → code HTTP dans $STATUS, corps dans $BODY
req() {
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$1" "$BASE$2" -H 'Content-Type: application/json')
  [ -n "${3:-}" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "${4:-}" ] && args+=(-d "$4")
  STATUS=$(curl "${args[@]}")
}
expect_status() { [ "$STATUS" = "$1" ] && ok "$2 ($STATUS)" || ko "$2 : attendu $1, reçu $STATUS — $(head -c 200 "$BODY")"; }
expect_body() { grep -q -- "$1" "$BODY" && ok "$2" || ko "$2 : « $1 » absent de la réponse"; }
reject_body() { grep -q -- "$1" "$BODY" && ko "$2 : « $1 » présent dans la réponse" || ok "$2"; }
field() { grep -o "\"$1\":\"[^\"]*\"" "$BODY" | head -1 | cut -d'"' -f4; }
login() { req POST /auth/local '' "{\"identifier\":\"$1\",\"password\":\"$PASSWORD\"}"; field jwt; }

if ! curl -s -o /dev/null "$BASE/categories"; then
  echo "API injoignable sur $BASE : lancez d'abord « docker compose --profile full up -d »." >&2
  exit 1
fi

step "1. Catégories"
req GET /categories
expect_status 200 "liste des catégories"
expect_body '"slug":"bourse"' "catégorie « bourse » présente"
req GET '/categories?populate=*'
reject_body '"discussions"' "populate ignoré : aucune discussion brute exposée"

step "2. Accueil : liste paginée, triée, filtrée (§2.A)"
req GET '/discussions?pageSize=5&sort=recent'
expect_status 200 "liste des discussions"
expect_body '"pageSize":5' "pagination côté serveur"
expect_body '"author":{"id"' "auteur présent"
expect_body '"repliesCount"' "nombre de réponses présent"
reject_body '"email"' "aucun e-mail exposé"
req GET '/discussions?category=bourse'
reject_body '"slug":"epargne"' "filtre par catégorie"
req GET '/discussions?pageSize=500'
expect_status 400 "pageSize > 50 refusé"

step "3. Détail par URL propre (§2.B)"
req GET /discussions/slug/ouvrir-un-pea-avec-5-000-par-ou-commencer
expect_status 200 "détail par slug"
expect_body '"replies":\[' "réponses associées"
req GET /discussions/slug/n-existe-pas
expect_status 404 "slug inconnu"

step "4. Publication refusée sans connexion (§2.D)"
req POST /discussions '' '{"data":{"title":"Titre assez long","content":"x","type":"question","category":"bourse"}}'
expect_status 403 "création sans JWT"

step "5. Validation côté Strapi (§2.C)"
THOMAS=$(login Thomas_PEA)
[ -n "$THOMAS" ] && ok "connexion Thomas_PEA" || ko "connexion Thomas_PEA"
req POST /discussions "$THOMAS" '{"data":{"title":"Court","content":"","type":"autre","category":"bourse"}}'
expect_status 400 "titre < 10, contenu vide, type invalide"
expect_body '"path":\["title"\]' "erreur sur le titre"
expect_body '"path":\["content"\]' "erreur sur le contenu"
req POST /discussions "$THOMAS" '{"data":{"title":"Titre assez long","content":"x","type":"question","category":"inconnue"}}'
expect_status 400 "catégorie inexistante"

step "6. Usurpation d'auteur refusée (§2.D)"
req POST /discussions "$THOMAS" '{"data":{"title":"Titre assez long","content":"x","type":"question","category":"bourse","author":1}}'
expect_status 403 "author = autre utilisateur"
expect_body "au nom d'un autre" "message explicite"

step "7. Création d'une discussion (§2.C)"
TITLE="Vérification automatique $(date +%s) : tout fonctionne ?"
req POST /discussions "$THOMAS" "{\"data\":{\"title\":\"$TITLE\",\"content\":\"Discussion créée par scripts/check-api.sh\",\"type\":\"question\",\"category\":\"bourse\"}}"
expect_status 201 "discussion créée"
expect_body '"username":"Thomas_PEA"' "auteur = utilisateur du JWT"
DISCUSSION=$(field documentId)
SLUG=$(field slug)
req GET /discussions?pageSize=1
expect_body "\"slug\":\"$SLUG\"" "nouvelle discussion en tête de liste"

step "8. Réponse enregistrée dans PostgreSQL (§2.B)"
CLAIRE=$(login Claire_Nantes)
req POST /replies "$CLAIRE" "{\"data\":{\"discussion\":\"$DISCUSSION\",\"content\":\"Réponse de vérification.\"}}"
expect_status 201 "réponse créée"
expect_body '"username":"Claire_Nantes"' "auteur de la réponse = Claire_Nantes"
REPLY=$(field documentId)
req POST /replies "$CLAIRE" "{\"data\":{\"discussion\":\"$DISCUSSION\",\"content\":\"x\",\"author\":1}}"
expect_status 403 "réponse au nom d'un autre"
req GET "/discussions/slug/$SLUG"
expect_body '"repliesCount":1' "compteur de réponses à jour"

step "9. Bonus : vote « Utile »"
req POST "/replies/$REPLY/useful" "$CLAIRE"
expect_status 403 "vote pour sa propre réponse refusé"
req POST "/replies/$REPLY/useful" "$THOMAS"
expect_status 200 "vote de Thomas_PEA"
expect_body '"voted":true' "vote enregistré"
expect_body '"usefulCount":1' "compteur « Utile » = 1"

step "10. Bonus : meilleure réponse"
req PUT "/discussions/$DISCUSSION/best-reply" "$CLAIRE" "{\"data\":{\"reply\":\"$REPLY\"}}"
expect_status 403 "réservée à l'auteur de la discussion"
req PUT "/discussions/$DISCUSSION/best-reply" "$THOMAS" "{\"data\":{\"reply\":\"$REPLY\"}}"
expect_status 200 "meilleure réponse choisie par l'auteur"
req GET "/discussions/slug/$SLUG"
expect_body '"solved":true' "discussion marquée résolue"

step "11. Bonus : profil membre"
req GET /members/Claire_Nantes
expect_status 200 "profil public"
expect_body '"stats"' "statistiques"
reject_body '"email"' "aucun e-mail exposé"
req GET /members/personne
expect_status 404 "membre inconnu"

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "Parcours complet OK"
else
  echo "$FAILURES vérification(s) en échec"
  exit 1
fi
