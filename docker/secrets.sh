#!/usr/bin/env bash
# Генерирует локальные секреты в var/ (каталог вне git). Существующие файлы не перезаписываются,
# поэтому повторный запуск безопасен. Пароли никуда не печатаются.
#   var/secrets/db-password         — PostgreSQL (POSTGRES_PASSWORD_FILE, DB_PASSWORD_FILE);
#   var/secrets/test-db-password    — тестовый PostgreSQL для Vitest;
#   var/secrets/better-auth-secret  — BETTER_AUTH_SECRET (подпись сессий Better Auth);
#   var/admin-password              — администратор admin@nextjs-shop.test (npm run db:seed);
#   var/demo-users.json             — демо-менеджер и демо-покупатели (npm run db:seed, e2e).
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p var/secrets var/media
chmod 700 var var/secrets

gen() { node -e 'process.stdout.write(require("node:crypto").randomBytes(Number(process.argv[1])).toString("base64url") + "\n")' "$1"; }

for name in db-password test-db-password; do
    if [ ! -s "var/secrets/$name" ]; then
        gen 24 > "var/secrets/$name"
        echo "Создан var/secrets/$name"
    fi
    # PostgreSQL в контейнере читает файл от своего пользователя (bind mount secrets): нужен доступ
    # на чтение; снаружи файл закрыт каталогом var/ (700).
    chmod 644 "var/secrets/$name"
done

if [ ! -s var/secrets/better-auth-secret ]; then
    gen 48 > var/secrets/better-auth-secret
    echo "Создан var/secrets/better-auth-secret"
fi

if [ ! -s var/admin-password ]; then
    gen 18 > var/admin-password
    echo "Создан var/admin-password"
fi

if [ ! -s var/demo-users.json ]; then
    node - <<'JS'
const { randomBytes } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const users = Object.fromEntries(
  ["manager", "customer", "maria"].map((key) => [
    key,
    { email: `${key}@nextjs-shop.test`, password: randomBytes(18).toString("base64url") },
  ]),
);
writeFileSync("var/demo-users.json", JSON.stringify(users, null, 2) + "\n", { mode: 0o600 });
JS
    echo "Создан var/demo-users.json"
fi
chmod 600 var/secrets/better-auth-secret var/admin-password var/demo-users.json
chmod 755 var/media
