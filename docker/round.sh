#!/usr/bin/env bash
# Полный раунд проверок на локальном стенде (docker/setup.sh уже выполнен). Любой ненулевой код —
# раунд красный. Запуск из корня репозитория: docker/round.sh (DC — команда compose, по умолчанию
# «docker compose», например DC="sudo -E docker compose"). Статические проверки и Vitest — на хосте
# (Node 24, npm ci из setup.sh), Playwright — на хосте против http://127.0.0.1:${HTTP_PORT:-8108}.
set -euo pipefail
cd "$(dirname "$0")/.."
DC=${DC:-docker compose}
export UID GID=${GID:-$(id -g)}
run() { printf '\n==> %s\n' "$*"; "$@"; }
tools() { $DC run --rm -T tools "$@"; }

echo "Коммит: $(git rev-parse --short HEAD)$(git diff --quiet HEAD -- . ':!docs/screenshots' || echo ' (+ незакоммиченные правки)')"
echo "Node $(node --version), npm $(npm --version)"
run docker/check-repo.sh
run npm run lint
run npm run typecheck
run npm run prisma:validate
run $DC build -q web tools
run $DC up -d --wait test-db
run npm run test:unit
run npm run test:db
run $DC up -d --wait db
run tools npx prisma migrate deploy
run tools npm run db:seed
run $DC up -d --wait --force-recreate web
run npx playwright test --project=e2e
echo
echo "РАУНД ЗЕЛЁНЫЙ"
