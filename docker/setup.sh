#!/usr/bin/env bash
# Установка с нуля: секреты в var/ → образы → PostgreSQL → миграции → администратор и демо-данные →
# приложение → тестовый PostgreSQL → npm ci на хосте (проверки, Vitest, Playwright). Повторный запуск
# безопасен (секреты не перезаписываются, миграции идемпотентны, демо-данные загружаются заново).
# Запуск из корня репозитория: docker/setup.sh  (DC — команда compose, например DC="sudo docker compose").
# Порты — HTTP_PORT (8108), DB_PORT (54327), TEST_DB_PORT (54328). BUILD_FLAGS="--no-cache" — сборка без кэша слоёв.
set -euo pipefail
cd "$(dirname "$0")/.."
DC=${DC:-docker compose}
export UID GID=${GID:-$(id -g)}
step() { printf '\n==> %s\n' "$*"; }

step "Секреты (var/)"
docker/secrets.sh

step "Сборка образов (web — next build, standalone; tools — миграции и сид)"
$DC build ${BUILD_FLAGS:-} web tools

step "PostgreSQL 17"
$DC up -d --wait db

step "Миграции (prisma migrate deploy)"
$DC run --rm -T tools npx prisma migrate deploy

step "Администратор и демо-данные (prisma db seed)"
$DC run --rm -T tools npm run db:seed

step "Приложение Next.js"
$DC up -d --wait web

step "Тестовый PostgreSQL (Vitest)"
$DC up -d --wait test-db

step "Зависимости на хосте (npm ci: проверки, Vitest, Playwright)"
npm ci --no-audit --no-fund

echo
echo "Готово: http://127.0.0.1:${HTTP_PORT:-8108}  (админка: /admin)"
echo "Учётные данные: var/admin-password (admin@nextjs-shop.test), var/demo-users.json (менеджер и покупатели)."
