# Sourced by the other scripts. Picks Podman when it's installed, otherwise
# Docker. Override with COMPOSE_ENGINE=docker or COMPOSE_ENGINE=podman.
engine="${COMPOSE_ENGINE:-}"
if [ -z "$engine" ]; then
  if command -v podman >/dev/null 2>&1; then
    engine=podman
  else
    engine=docker
  fi
fi
