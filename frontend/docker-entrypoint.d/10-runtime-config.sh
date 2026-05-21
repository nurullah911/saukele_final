#!/bin/sh
set -eu

api_url="${API_URL:-}"

cat > /usr/share/nginx/html/config.js <<EOF
/* global window */
window.__API_URL__ = "${api_url}";
EOF
