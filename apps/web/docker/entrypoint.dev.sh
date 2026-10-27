#!/bin/sh
set -e

# Instala as dependências só quando faltam ou quando o package-lock.json mudou
# (o volume web_node_modules persiste entre reinícios). `npm ci` apaga node_modules,
# por isso o hash evita rodá-lo a cada start. Sem lockfile, cai para `npm install`.
stamp=node_modules/.lock-hash

if [ -f package-lock.json ]; then
    current=$(sha256sum package-lock.json | cut -d' ' -f1)
    if [ ! -x node_modules/.bin/next ] || [ "$(cat "$stamp" 2>/dev/null)" != "$current" ]; then
        npm ci --no-audit --no-fund
        echo "$current" > "$stamp"
    fi
elif [ ! -x node_modules/.bin/next ]; then
    npm install --no-audit --no-fund
fi

exec "$@"
