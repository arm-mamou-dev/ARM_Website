#!/usr/bin/env bash
# Creates the ARM member database (a Google Sheet + its Apps Script backend) and connects the website to it.
#
#   ./deploy/setup-database.sh          first time: create sheet, upload script, publish, write config.js
#   ./deploy/setup-database.sh update   after editing apps-script/Code.gs: upload + republish (same URL)
#
# Before the first run:
#   1. Turn ON "Google Apps Script API" at https://script.google.com/home/usersettings
#   2. Be ready to sign in with the Google account that should OWN the member list (use ARM's account).
set -euo pipefail
cd "$(dirname "$0")/.."

CLASP="npx --yes @google/clasp@2.4.2"
CLASP_FILE="apps-script/.clasp.json"

if [[ ! -f ~/.clasprc.json ]]; then
  echo "==> Sign in to Google (a browser window will open)"
  $CLASP login
fi

if [[ "${1:-}" == "update" ]]; then
  [[ -f "$CLASP_FILE" ]] || { echo "No database yet. Run without 'update' first."; exit 1; }
  cd apps-script
  $CLASP push --force
  DEPLOY_ID=$(sed -n 's/^DEPLOY_ID=//p' ../deploy/.database 2>/dev/null || true)
  if [[ -n "$DEPLOY_ID" ]]; then
    $CLASP deploy --deploymentId "$DEPLOY_ID" --description "Website backend"
  else
    $CLASP deploy --description "Website backend"
  fi
  echo "==> Backend updated."
  exit 0
fi

if [[ -f "$CLASP_FILE" ]]; then
  echo "A database is already linked (apps-script/.clasp.json). Use: ./deploy/setup-database.sh update"
  exit 1
fi

echo "==> Creating the 'ARM Members' Google Sheet with its backend script"
(cd apps-script && $CLASP create --type sheets --title "ARM Members" --rootDir .)

echo "==> Uploading the backend code"
(cd apps-script && $CLASP push --force)

cat <<'MSG'

==> One manual step: authorize the script
    The script editor will open in your browser.
    1. In the toolbar, choose the function  setup  and click  Run.
    2. Click "Review permissions", choose your account, then "Allow".
       (If Google shows "app isn't verified": Advanced -> Go to ARM Members.)
    3. Open the spreadsheet: you should see a "Members" tab with headers.

MSG
(cd apps-script && $CLASP open) || true
read -r -p "Press Enter once setup has run successfully... "

echo "==> Publishing as a web app"
OUT=$(cd apps-script && $CLASP deploy --description "Website backend")
echo "$OUT"
DEPLOY_ID=$(echo "$OUT" | grep -oE 'AKfyc[A-Za-z0-9_-]+' | head -1)
[[ -n "$DEPLOY_ID" ]] || { echo "Could not read the deployment ID from the output above."; exit 1; }
URL="https://script.google.com/macros/s/$DEPLOY_ID/exec"
echo "DEPLOY_ID=$DEPLOY_ID" > deploy/.database

# Write the URL into the website config
sed -i.bak -E "s|SCRIPT_URL: \"[^\"]*\"|SCRIPT_URL: \"$URL\"|" config.js && rm -f config.js.bak

echo "==> Testing the connection"
curl -sL "$URL" && echo

SHEET_ID=$(sed -n 's/.*"parentId":\["\{0,1\}\([^"]*\)".*/\1/p' "$CLASP_FILE" | tr -d '"[]')
cat <<MSG

Done.
  Web app URL (saved in config.js): $URL
  Spreadsheet: https://docs.google.com/spreadsheets/d/$SHEET_ID
Share the spreadsheet with ARM leadership so they can manage each member's Status.
MSG
