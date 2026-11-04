#!/bin/sh
# Serves the app to other devices on your network so a phone can reach it.
#
# There is no real authentication yet: anyone on the network can use the app as
# the demo user. Run this on a network you trust, and use `pnpm stack:up` to go
# back to localhost only. Set ENABLE_DB_VIEWER=false to hide the database viewer,
# which can edit data, from the network.
set -eu

cd "$(dirname "$0")/.."

./scripts/build-image.sh

APP_BIND=0.0.0.0 ENABLE_DB_VIEWER="${ENABLE_DB_VIEWER:-true}" ./scripts/compose.sh up -d --wait

# The Wi-Fi interface name varies between Macs, and a VPN doesn't own these.
address=""
for interface in en0 en1 en2 en3 en4; do
  address="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
  [ -n "$address" ] && break
done

if [ -z "$address" ]; then
  echo "Couldn't find this computer's network address. Is Wi-Fi connected?" >&2
  exit 1
fi

url="http://${address}:3000/m"

echo
node scripts/phone-qr.mjs "$url"
echo
echo "Scan this with your phone's camera, on the same Wi-Fi: $url"
echo "The code is also saved as phone-qr.png."
echo "If it won't load, check that your VPN allows local network traffic."
echo "WARNING: anyone on this network can use the app until you run: pnpm stack:up"
