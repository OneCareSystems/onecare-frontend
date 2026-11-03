#!/bin/sh
# Container entrypoint (DDP-#49 / DKR-02 + DKR-03).
#
# 1. Exports defaults for the nginx template variables so the container
#    starts with sane values even without a compose file.
# 2. Writes the runtime configuration file the SPA reads before it boots.
#    Public settings only — NEVER secrets (no JWT keys, DB credentials or
#    API keys may appear here; CI scans the bundle for them, DKR-05).
# 3. Hands control to the stock nginx entrypoint, which envsubst-renders
#    /etc/nginx/templates/*.template into /etc/nginx/conf.d/.
set -eu

# --- Template defaults (compose/staging override via environment) --------
export BACKEND_URL="${BACKEND_URL:-http://backend:8080}"
export NGINX_RESOLVER="${NGINX_RESOLVER:-127.0.0.11}"
export CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-25m}"
export PROXY_READ_TIMEOUT="${PROXY_READ_TIMEOUT:-300s}"

# --- Runtime config for the SPA (DKR-03) --------------------------------
# Writable path: the container runs as the non-root nginx user and dist/ is
# owned by it. The file is served with Cache-Control: no-store.
CONFIG_PATH="${CONFIG_PATH:-/usr/share/nginx/html/config.json}"
cat > "$CONFIG_PATH" <<EOF
{
  "apiBaseUrl": "${RUNTIME_API_BASE_URL:-/api}"
}
EOF

exec /docker-entrypoint.sh "$@"
