#!/bin/sh
# Builds with the engine directly rather than `compose build`. Under Podman,
# compose delegates to docker-compose, which reads registry credentials through
# Docker's credential helper first, and that can block on the macOS keychain.
set -eu

cd "$(dirname "$0")/.."
. scripts/engine.sh

exec "$engine" build \
  --file apps/nutrition-tracker/Dockerfile \
  --tag localhost/trackerx/nutrition-tracker:local \
  .
