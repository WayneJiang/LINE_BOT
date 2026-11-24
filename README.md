# LINE_BOT

LINE Bot 後端，負責教練／學員資料、訓練計畫與簽到紀錄，並產生月報 PDF。部署在 Vercel，正式資料庫為 Neon（PostgreSQL）。
前端管理介面在另一個 repo：[`Managment_Web`](../Managment_Web/README.md)（Vue 3 + Vite）。

## 技術架構

- **後端框架**：NestJS 11（`@nestjs/common`、`@nestjs/core`）
- **資料庫**：PostgreSQL，透過 TypeORM 0.3（`pg` 驅動）存取，schema 只經由 migration 變更（`synchronize: false`）
- **LINE**：`@line/bot-sdk`（Messaging API、webhook 簽章驗證）
- **PDF**：`pdfkit`，字型為 `fonts/NotoSansTC-*.ttf`
- **檔案儲存**：`@vercel/blob`
- **驗證 / 工具**：`class-validator`、`class-transformer`、`dayjs`
- **部署**：Vercel（`vercel.json`；每月 1 日 00:00 由 Vercel Cron 觸發月報產生）

## 目錄結構

```
src/
├── controllers/   # HTTP 路由（line、data）
├── services/      # line.service、data.service、pdf.service
├── entities/      # TypeORM entity（Coach、Trainee、TrainingPlan、TrainingRecord…）
├── dto/           # 請求資料驗證
├── enums/         # 常數（方案類型等）
├── tools/         # CSV 匯入匯出、上傳 LINE 選單等小工具
└── app.module.ts  # 模組、ConfigModule、TypeORM、LINE middleware
database/
├── ormconfig.ts   # TypeORM CLI 用的 DataSource
└── migrations/    # migration 檔
fonts/             # PDF 用的 Noto Sans TC
scripts/           # pull-prod-db.sh 等
```

---

## 本機開發

### 架構

| 服務 | 位置 | 說明 |
|---|---|---|
| PostgreSQL 16 | Docker `linebot-dev-db`，`localhost:5432` | 本機資料庫 |
| Adminer | Docker `linebot-dev-adminer`，http://localhost:8080 | 網頁版資料庫管理介面 |
| 後端（本 repo） | http://localhost:8000 | `npm run start:dev` |
| 前端（Managment_Web） | http://localhost:5173 | `npm run dev` |

### 環境設定檔

| 檔案 | 用途 | 進 git？ |
|---|---|---|
| `LINE_BOT/.env` | 正式環境設定（Neon、正式 LINE channel） | 是 |
| `LINE_BOT/.env.local` | 本機設定，**優先於 `.env`** | 否 |
| `Managment_Web/.env` | 前端正式設定 | 否 |
| `Managment_Web/.env.development.local` | 只在 `npm run dev` 時生效，讓前端連本機後端 | 否 |

- 後端：`src/app.module.ts`（ConfigModule）和 `database/ormconfig.ts`（migration 用）都會先讀 `.env.local` 再讀 `.env`。
- `DB_SSL=false` 關閉 SSL（本機 Postgres 沒有 SSL）；沒設定時維持原本的 SSL 行為，Vercel 不受影響。
- 前端刻意用 `.env.development.local` 而不是 `.env.local`：Vite 在 `npm run build` 時也會讀 `.env.local`，會把 `localhost` 寫死進正式打包檔。

`LINE_BOT/.env.local` 內容範例：

```
LOCAL_PORT=8000
DB_SSL=false
DB_HOST=postgres://dev:dev@localhost:5432/linebot_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev
POSTGRES_DATABASE=linebot_dev
CHANNEL_SECRET=（建議用測試用 Messaging API channel）
CHANNEL_ACCESS_TOKEN=（同上）
```

`Managment_Web/.env.development.local`：

```
VITE_API_URL=http://localhost:8000
```

### 第一次建置

需要：Docker Desktop、Node.js。

```bash
cd LINE_BOT
docker compose up -d          # 啟動 Postgres + Adminer
npm run typeorm:run           # 建立資料表（共 5 支 migration）
./scripts/pull-prod-db.sh     # （可選）複製正式資料到本機
npm run start:dev             # 後端 http://localhost:8000

cd ../Managment_Web
npm run dev                   # 前端 http://localhost:5173
```

`docker compose up -d` 可以重複執行：已在跑且設定沒變的容器不會重啟，只會補上新的服務。

### 從正式環境同步資料

```bash
./scripts/pull-prod-db.sh
```

1. 讀 `.env` 的 `DB_HOST`，用臨時的 `postgres:17` 容器跑 `pg_dump`（只匯出資料、排除 `migrations` 表）。**對正式資料庫唯讀**。
2. 自動把 Neon 的 `-pooler` 端點換成直連端點（pg_dump 不適合走 pooler）。
3. 清空本機所有資料表（保留 `migrations`）後匯入，最後列出各表筆數。
4. 可重複執行，本機資料改壞了就再跑一次。

匯出檔存在 `.tmp/prod-data.sql`（已 gitignore），**內含學員個資，勿分享**。

若出現 `server version mismatch`（Neon 版本比 17 新）：

```bash
PG_IMAGE=postgres:18 ./scripts/pull-prod-db.sh
```

### 查看 / 操作資料庫

連線資訊：

| 欄位 | 值 |
|---|---|
| Host | `localhost`（Adminer 裡填 `db`） |
| Port | `5432` |
| User / Password | `dev` / `dev` |
| Database | `linebot_dev` |
| SSL | 關閉 |

連線字串：`postgres://dev:dev@localhost:5432/linebot_dev`

**網頁：Adminer** — http://localhost:8080，系統選 **PostgreSQL**（預設是 MySQL），伺服器 `db`。按「儲存」會直接寫入，沒有二次確認。

**桌面 App**：TablePlus（`brew install --cask tableplus`，改完按 ⌘S 才寫入）、Postico 2、DBeaver Community。
**VS Code**：Database Client 或 SQLTools + PostgreSQL driver。

原則：

- 本機資料隨便改，壞了重跑 `pull-prod-db.sh`。
- **資料表結構不要在 GUI 手動改**：改 entity → `npm run typeorm:generate --name=XXX` → `npm run typeorm:run`。
- 若在同一個工具也連正式 DB（Neon），把該連線標成紅色 / Production，並設成唯讀（TablePlus：Safe mode = Read-only；DBeaver：Read-only connection）。

### LINE 相關

- **Webhook（`POST /webhook`）**：LINE 連不到 localhost，用 `ngrok http 8000`，把 `https://xxxx.ngrok-free.app/webhook` 填到 LINE Developers 的 Webhook URL。
- **LINE Login**：前端 redirect URI 是 `${window.location.origin}/line-callback`，需在 LINE Login channel 的 Callback URL 加上 `http://localhost:5173/line-callback`。
- 建議另開**測試用**的 Messaging API channel 與 LINE Login channel，避免改 webhook 時影響正式 Bot。

---

## 環境變數

只列名稱與用途，實際值請放在 `.env` / `.env.local`，**不要提交到 git**。

| 變數 | 用途 |
|---|---|
| `LOCAL_PORT` | 本機啟動的 port（`src/main.ts`，預設 3000） |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DATABASE` | TypeORM 連線設定（`src/app.module.ts`） |
| `DB_HOST` | migration CLI 用的連線字串（`database/ormconfig.ts`） |
| `DB_SSL` | 設為 `false` 關閉 SSL（本機用） |
| `CHANNEL_SECRET` | LINE webhook 簽章驗證（`src/app.module.ts` 的 LINE middleware） |
| `CHANNEL_ACCESS_TOKEN` | LINE Messaging API 呼叫用 token（`line.service.ts`） |
| `MONTHLY_SUMMARY_TARGET_SOCIAL_ID` | 月度 cron 產生報表後，接收 LINE 通知的帳號（`data.controller.ts`） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 存取 token，月報 PDF 上傳時使用（`@vercel/blob` 預設讀取） |

---

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm run start:dev` | 開發模式（watch） |
| `npm run start:debug` | 除錯模式（watch） |
| `npm run start:prod` | 執行編譯後的 `dist/main` |
| `npm run build` | `nest build` |
| `npm run format` | Prettier 格式化 `src/`、`test/` |
| `npm run lint` | ESLint，會以 `--fix` 自動修改 `src/`、`apps/`、`libs/`、`test/` |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Jest 單元測試 |
| `npm run test:e2e` | Jest e2e 測試 |
| `npm run typeorm:show` | 列出 migration 執行狀態 |
| `npm run typeorm:generate --name=XXX` | 依 entity 差異產生新 migration（`database/migrations/XXX-*.ts`） |
| `npm run typeorm:run` | 執行待跑的 migration |
| `npm run typeorm:revert` | 回復最後一支 migration |

> `npm start` 指向 `src/index.ts`，目前專案中沒有此檔案，請改用 `npm run start:dev` 或 `npm run start:prod`。

---

## 主要功能

- **教練 / 學員管理**：教練與學員資料，以 LINE `socialId` 綁定身分。
- **訓練計畫**：方案類型、額度、訓練時段，並記錄開始／結束時間。
- **簽到紀錄**：學員簽到會扣除計畫額度；額度用完時計畫自動結束。
- **開課課程**：團體課程排程（`OpeningCourse`）。
- **月報 PDF**：個人計畫簽到統計與團體課程簽到統計。每月 1 日由 Vercel Cron 自動產生並推送（見 `vercel.json`），亦可由 LINE 傳送「產生報表」取得。
- **LINE 指令「產生報表」**：只限**已綁定 `socialId` 的教練**，且必須在與官方帳號的**一對一聊天**中使用；其他身分或聊天室會收到提示訊息，不會產生報表。

### 訓練計畫備註（`note`）

- 教練可在 Managment_Web 的計畫編輯表單填寫備註（新增與編輯皆可），**最多 100 字**。
- 允許換行與 Tab 以及 ZWJ（組合 emoji 用），其餘控制字元與隱形字元（零寬字元、BiDi 控制字元、行／段落分隔符號等）會被拒絕（HTTP 400）。字串在 DTO 中會做 NFC 正規化、統一換行並 `trim()`。
- 備註會出現在「個人計畫簽到統計」月報的「備註」欄：
  - 同一列（同學員、同教練、同方案、同額度、同月）多段備註會合併，以「• 」分行，並自動去除重複內容。
  - 單一儲存格最多 **12 行**，超過會截斷並加上「…」。
  - 不會出現在「團體課程簽到統計」月報，也不會出現在學員端畫面。
- 重新產生月報時使用**當下**的備註，不保留歷史版本。
- PDF 字型不含 emoji，emoji 會顯示為空白或方框。

---

## 資料庫 Migration 與部署

### Migration

`database/migrations/` 共 5 支：

- `1761836394915-GenerateTables.ts`
- `1767580884460-AddOpeningCourseToTrainingRecord.ts`
- `1768148542300-AddFlexiblePersonalPlanType.ts`
- `1785680974622-RefactorPlanTypes.ts`
- `1795499810842-AddNoteToTrainingPlan.ts`：`TrainingPlan` 新增 `note` 欄位（`varchar NOT NULL DEFAULT ''`，既有資料自動為空字串）

- 不要修改已存在的 migration；新變更請用 `npm run typeorm:generate` 或手寫新檔。
- `down()` 會**永久刪除** `note` 欄位與所有備註資料。

### 部署順序

**migration → 後端 → 前端**（與 Managment_Web 的部署順序相同）

- 先部署前端、後部署後端：前端送出的 `note` 會被後端 `whitelist` **靜默移除**，請求仍顯示成功，但備註不會儲存。
- migration 未跑就部署後端：讀取計畫的 API、月報、月度 cron 與「產生報表」都會因欄位不存在而失敗。

### 部署前檢查

1. **教練 `socialId` 檢查**：在正式 DB 以**唯讀**查詢在職教練，確認是否有異常的綁定：

   ```sql
   SELECT id, name, "socialId"
   FROM "Coach"
   WHERE "deletedDate" IS NULL
     AND (
       "socialId" = '<coach.entity.ts 中 socialId 的預設值>'
       OR "socialId" = ''
       OR "socialId" !~ '^U[0-9a-f]{32}$'
     );
   ```

   - 若結果是 `coach.entity.ts` 中的預設值：確認該 LINE 帳號確實應擁有此教練身分，否則先修正 `socialId`。
   - 空值或格式不符的教練：部署後無法使用「產生報表」，需先綁定正確的 LINE ID。
   - 查詢結果含 LINE ID（個人識別資料），只在本機檢視，不要貼到外部服務。
   - `coach.entity.ts` 的 default 目前不修改（待後續處理）。
2. **通知教練**：
   - 備註會出現在「個人計畫簽到統計」月報，**不會**出現在團體課程月報。
   - 重新產生月報時使用當下的備註。
   - 月報可能被轉傳，請**勿填寫醫療或敏感個人資料**。
   - 「產生報表」只限教練，且須在與官方帳號的一對一聊天中使用，教練的 LINE 帳號必須已綁定（`Coach.socialId`）。
3. 確認正式環境的 `CHANNEL_SECRET` 已設定（webhook 簽章驗證依賴它）。

### 回退（Rollback）

- **預設做法**：回退前端與後端，**保留 DB 欄位**。舊版程式會忽略該欄位，備註資料保留。
- 已上傳的月報 PDF 不會因回退而自動更新或移除。
- 快取中的新版前端若送出 `note`，舊後端會丟棄該欄位，請先回退前端並重新整理。
- `npm run typeorm:revert` 會**永久刪除所有備註資料**，只在確定要移除此功能時使用。執行前請先以 JSON 格式備份（`umask 077` 下使用 `psql -At -c "SELECT COALESCE(json_agg(json_build_object('id', id, 'note', note) ORDER BY id), '[]') FROM \"TrainingPlan\" WHERE note <> ''" -o <路徑>`），備份放在專案目錄外且未同步雲端的位置，用完即刪。

## 相關專案

- 前端管理介面：[`Managment_Web`](../Managment_Web/README.md)
