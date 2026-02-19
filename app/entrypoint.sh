#!/bin/sh
set -eu

cat > /app/dist/runtime-config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${API_URL}"
};
EOF

exec npm run start
