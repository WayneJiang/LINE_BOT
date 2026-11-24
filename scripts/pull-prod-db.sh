#!/usr/bin/env bash
# 把正式資料庫（.env 的 DB_HOST）的資料複製到本機 Docker 的 Postgres。
# 對正式資料庫只做讀取（pg_dump），不會修改它。
#
# 前置：docker compose up -d && npm run typeorm:run（本機資料表要先建好）
# 用法：./scripts/pull-prod-db.sh
#       PG_IMAGE=postgres:18 ./scripts/pull-prod-db.sh   # 正式 DB 版本比 17 新時
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER=linebot-dev-db
LOCAL_USER=dev
LOCAL_DB=linebot_dev
PG_IMAGE=${PG_IMAGE:-postgres:17}   # pg_dump 版本需 >= 正式 DB 版本
DUMP=.tmp/prod-data.sql             # .tmp 已在 .gitignore（內含正式資料，勿 commit）

PROD_URL=$(grep -E '^DB_HOST=' .env | head -1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//")
[ -n "$PROD_URL" ] || { echo "❌ .env 裡找不到 DB_HOST"; exit 1; }
# Neon 建議 pg_dump 走直連端點，不要走 pooler
PROD_URL=${PROD_URL/-pooler./.}

docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || { echo "❌ $CONTAINER 沒在跑，先執行 docker compose up -d"; exit 1; }

mkdir -p .tmp
echo "⬇️  從正式資料庫匯出資料（唯讀）..."
docker run --rm "$PG_IMAGE" pg_dump "$PROD_URL" \
  --data-only --no-owner --no-privileges --disable-triggers \
  --exclude-table=migrations \
  | grep -v '^SET transaction_timeout' > "$DUMP"   # 舊版 Postgres 不認得這個設定
echo "   已存到 ${DUMP}（$(wc -l < "$DUMP") 行）"

echo "🧹 清空本機資料表（保留 migrations）..."
docker exec -i "$CONTAINER" psql -q -U "$LOCAL_USER" -d "$LOCAL_DB" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations' LOOP
    EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;
SQL

echo "⬆️  匯入本機..."
docker exec -i "$CONTAINER" psql -q -U "$LOCAL_USER" -d "$LOCAL_DB" -v ON_ERROR_STOP=1 < "$DUMP"

echo "✅ 完成，各資料表筆數："
docker exec -i "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -c \
  "SELECT table_name AS table, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), false, true, '')))[1]::text::int AS rows FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> 'migrations' ORDER BY 1;"
