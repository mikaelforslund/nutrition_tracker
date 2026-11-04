#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
. scripts/engine.sh

exec "$engine" compose "$@"
