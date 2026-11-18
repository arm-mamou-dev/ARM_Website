#!/usr/bin/env bash
# Deploy the ARM website to a Google Cloud VM running nginx.
#
# Usage:
#   ./deploy/deploy.sh create    # first time: creates the VM + firewall rule, installs nginx, uploads site
#   ./deploy/deploy.sh           # later: just uploads the latest site files
#
# Override defaults with env vars, e.g.  PROJECT=my-arm-project ZONE=us-east1-b ./deploy/deploy.sh create
set -euo pipefail

PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
ZONE="${ZONE:-us-east1-b}"
VM="${VM:-arm-website}"
MACHINE="${MACHINE:-e2-micro}"   # e2-micro is free-tier eligible in us-east1/us-central1/us-west1

cd "$(dirname "$0")/.."
G="gcloud --project=$PROJECT"

if [[ "${1:-}" == "create" ]]; then
  echo "==> Creating VM $VM in $PROJECT ($ZONE)"
  $G compute instances create "$VM" --zone="$ZONE" --machine-type="$MACHINE" \
    --image-family=debian-12 --image-project=debian-cloud \
    --tags=http-server,https-server \
    --metadata=startup-script='#! /bin/bash
apt-get update && apt-get install -y nginx && mkdir -p /var/www/arm'

  $G compute firewall-rules describe allow-http-https >/dev/null 2>&1 || \
    $G compute firewall-rules create allow-http-https --allow=tcp:80,tcp:443 \
      --target-tags=http-server,https-server --description="Allow web traffic"

  echo "==> Waiting for nginx to install..."
  until $G compute ssh "$VM" --zone="$ZONE" --command="test -x /usr/sbin/nginx" >/dev/null 2>&1; do sleep 10; done
fi

if ! grep -q 'SCRIPT_URL: "https' config.js; then
  echo "WARNING: SCRIPT_URL in config.js is empty — the form won't save to Google Sheets." >&2
fi

echo "==> Uploading site"
STAGE=$(mktemp -d)
cp *.html styles.css script.js config.js "$STAGE"/
cp -r mamou "$STAGE"/
[[ -d assets ]] && cp -r assets "$STAGE"/
$G compute ssh "$VM" --zone="$ZONE" --command="rm -rf /tmp/arm-upload && mkdir -p /tmp/arm-upload"
$G compute scp --zone="$ZONE" --recurse "$STAGE"/* deploy/nginx-arm.conf "$VM":/tmp/arm-upload/
rm -rf "$STAGE"

$G compute ssh "$VM" --zone="$ZONE" --command='
  set -e
  sudo mv /tmp/arm-upload/nginx-arm.conf /etc/nginx/sites-available/arm
  sudo ln -sf /etc/nginx/sites-available/arm /etc/nginx/sites-enabled/arm
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo mkdir -p /var/www/arm
  sudo rsync -a --delete /tmp/arm-upload/ /var/www/arm/
  rm -rf /tmp/arm-upload
  sudo nginx -t && sudo systemctl reload nginx'

IP=$($G compute instances describe "$VM" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "==> Live at http://$IP"
