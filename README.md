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
├── config/        # LINE Messaging 環境變數讀取（新舊名稱相容）
├── controllers/   # HTTP 路由（line、data、auth）
├── middleware/    # LINE webhook 簽章驗證
├── services/      # line.service、line-login.service、data.service、pdf.service
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
LINE_MESSAGE_CHANNEL_SECRET=（建議用測試用 Messaging API channel）
LINE_MESSAGE_CHANNEL_ACCESS_TOKEN=（同上）
LINE_LOGIN_CHANNEL_ID=（測試用 LINE Login channel ID）
LINE_LOGIN_SECRET=（同上）
LINE_LOGIN_REDIRECT_URIS=http://localhost:5173/line-callback
NODE_ENV=development
```

`NODE_ENV=development` 只放在本機的 `.env.local`，正式環境不得設定（`development` / `test` 才允許 `localhost` 回呼網址）。

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

- **Webhook（`POST /webhook`）**：LINE 連不到 localhost，用 `ngrok http 8000`，把 `https://xxxx.ngrok-free.app/webhook` 填到測試 Messaging channel 的 Webhook URL。
  - 本機驗證：執行 `npm run start:dev` 啟動後端，在 LINE Developers 按 **Verify**，結果應為 Success。
  - Verify 失敗時，先確認 `.env.local` 的 `LINE_MESSAGE_CHANNEL_SECRET`（或舊名稱 `CHANNEL_SECRET`）與該 channel 的 secret 一致。
- **LINE Login**：前端 redirect URI 是 `${window.location.origin}/line-callback`，需在 LINE Login channel 的 Callback URL 與 `.env.local` 的 `LINE_LOGIN_REDIRECT_URIS` 同時加上 `http://localhost:5173/line-callback`。
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
| `NODE_ENV` | 本機設為 `development`（或 `test`）才允許 `http://localhost` 作為 LINE Login 回呼網址；正式環境不得設定 |
| `LINE_MESSAGE_CHANNEL_SECRET` | Messaging API channel secret，webhook 簽章驗證（`src/middleware/line-signature.middleware.ts`）。未設定時退回 `CHANNEL_SECRET` |
| `LINE_MESSAGE_CHANNEL_ACCESS_TOKEN` | Messaging API 呼叫用 token（`line.service.ts`、`src/tools/upload_menu.ts`）。未設定時退回 `CHANNEL_ACCESS_TOKEN` |
| `CHANNEL_SECRET` / `CHANNEL_ACCESS_TOKEN` | 舊名稱，僅作為相容用的備用，新名稱存在時不會使用 |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login channel ID，`POST /auth/line-login` 向 LINE 驗證時使用 |
| `LINE_LOGIN_SECRET` | LINE Login channel secret，只存在後端；不會退回 Messaging 的 secret |
| `LINE_LOGIN_REDIRECT_URIS` | LINE Login 回呼網址白名單，以逗號分隔，完全比對。每筆必須是 `https://`（本機 `development` / `test` 可用 `http://localhost`） |
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
| `npm test -- src/middleware src/config src/services/line-login.service.spec.ts src/dto src/controllers/auth.controller.spec.ts` | 只跑 LINE 相關的單元測試（`npm test` 即 `jest`，後面的路徑直接傳給 Jest） |
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
- **Webhook 簽章驗證**：`POST /webhook` 會驗證 LINE 簽章。簽章缺少或不正確時回 401；後端簽章設定缺失時回 500。
- **LINE 登入**：前端把授權碼交給後端 `POST /auth/line-login` 換取身分，只回傳 `userId` 與 `displayName`，不回傳任何 token。前端以一次性的隨機 `state` / `nonce` 防止登入 CSRF，並在回呼時驗證。

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
3. **Messaging secret 一致**：正式環境實際生效的 `LINE_MESSAGE_CHANNEL_SECRET`（或舊名稱 `CHANNEL_SECRET`）必須與 LINE Console 中 Messaging API channel 的 secret **完全一致**。Vercel 有設定時以 Vercel 為準，否則是被追蹤的 `.env` 中的值。不一致時 webhook 會全部被拒絕。
4. **LINE Login 白名單**：`LINE_LOGIN_REDIRECT_URIS` 列出所有正式入口的 `/line-callback` 網址（例如 `https://<正式網域>/line-callback`），且不含 `localhost` 或 `127.0.0.1`。
5. **明確設定 LINE 變數**：Vercel 未設定的變數會退回被追蹤的 `.env`，因此 Production 與 Preview 的 LINE 相關變數都要在 Vercel 明確設定。

### 回退（Rollback）

- **預設做法**：回退前端與後端，**保留 DB 欄位**。舊版程式會忽略該欄位，備註資料保留。
- 已上傳的月報 PDF 不會因回退而自動更新或移除。
- 快取中的新版前端若送出 `note`，舊後端會丟棄該欄位，請先回退前端並重新整理。
- `npm run typeorm:revert` 會**永久刪除所有備註資料**，只在確定要移除此功能時使用。執行前請先以 JSON 格式備份（`umask 077` 下使用 `psql -At -c "SELECT COALESCE(json_agg(json_build_object('id', id, 'note', note) ORDER BY id), '[]') FROM \"TrainingPlan\" WHERE note <> ''" -o <路徑>`），備份放在專案目錄外且未同步雲端的位置，用完即刪。

### LINE 登入與 Webhook 部署

依下列順序進行（前端與後端的 LINE 變數都必須先完成「部署前檢查」）：

1. **Webhook 簽章驗證**（後端）：部署後**立即**在正式 channel 按 **Verify**，需為 Success，再傳一則測試訊息確認正常回應。失敗時使用 Vercel Instant Rollback。
2. **LINE Login 後端**（`POST /auth/line-login`）：在 Vercel Production 設定 `LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_SECRET`、`LINE_LOGIN_REDIRECT_URIS`，部署後以 curl 確認不合法的請求會被拒絕。
3. **Managment_Web 前端**：先從所有 Vercel 環境（Production、Preview、Development）刪除 `VITE_LINE_CHANNEL_SECRET`，再以**不使用 build cache** 的方式部署，並測試登入與教練綁定。
4. **輪替 LINE Login secret**（由使用者手動執行，建議離峰時段）：
   - LINE Developers → LINE Login channel → **Basic settings** → **Channel secret** → **Issue**。
   - 從 Issue 到第 5 步完成之間，LINE 登入會失敗。
   - 在 Vercel 把 Production 的 `LINE_LOGIN_SECRET` 更新為新值，然後重新部署後端（env 變更需要重新部署才會生效）。
   - 完成一次正式環境登入，確認恢復正常。
   - 刪除輪替前建置、含有舊 secret 的前端部署（包含 Preview）。

回滾限制：

- 完成第 3 步之後，前端不得回退到仍含 `VITE_LINE_CHANNEL_SECRET` 的版本。
- 後端可回退到第 1 步之後的任一版本，不得回退到 webhook 簽章驗證修正之前的版本。
- Vercel Preview 無法使用 LINE 登入，因為 Preview 網址不在 `LINE_LOGIN_REDIRECT_URIS` 中。

## 相關專案

- 前端管理介面：[`Managment_Web`](../Managment_Web/README.md)
