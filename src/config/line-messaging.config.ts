import type { ConfigService } from "@nestjs/config";

/**
 * Messaging API channel 的設定讀取（新名稱優先，退回舊名稱）。
 * 與 LINE Login 的設定完全分開，兩者之間不得互相 fallback。
 */
export const MESSAGING_SECRET_NAME = "LINE_MESSAGE_CHANNEL_SECRET";
export const MESSAGING_SECRET_LEGACY_NAME = "CHANNEL_SECRET";
export const MESSAGING_ACCESS_TOKEN_NAME = "LINE_MESSAGE_CHANNEL_ACCESS_TOKEN";
export const MESSAGING_ACCESS_TOKEN_LEGACY_NAME = "CHANNEL_ACCESS_TOKEN";

type Getter = (name: string) => unknown;

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** 先讀新名稱；讀不到（或 trim 後為空）才退回舊名稱。都沒有則回傳空字串。 */
function pick(get: Getter, name: string, legacyName: string): string {
  return clean(get(name)) || clean(get(legacyName));
}

export function readMessagingSecret(
  config: Pick<ConfigService, "get">,
): string {
  return pick(
    (n) => config.get<string>(n),
    MESSAGING_SECRET_NAME,
    MESSAGING_SECRET_LEGACY_NAME,
  );
}

export function readMessagingAccessToken(
  config: Pick<ConfigService, "get">,
): string {
  return pick(
    (n) => config.get<string>(n),
    MESSAGING_ACCESS_TOKEN_NAME,
    MESSAGING_ACCESS_TOKEN_LEGACY_NAME,
  );
}

/** 給直接讀 process.env 的腳本使用（例如 src/tools/upload_menu.ts） */
export function readMessagingAccessTokenFromEnv(
  env: Record<string, string | undefined>,
): string {
  return pick(
    (n) => env[n],
    MESSAGING_ACCESS_TOKEN_NAME,
    MESSAGING_ACCESS_TOKEN_LEGACY_NAME,
  );
}
