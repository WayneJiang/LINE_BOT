import { ConfigService } from "@nestjs/config";

export interface LineLoginConfig {
  channelId: string;
  channelSecret: string;
  redirectUris: string[];
}

export type LineLoginConfigProblem =
  | "missing"
  | "invalid redirect URI"
  | "loopback not allowed";

// 注意：tsconfig 未開 strictNullChecks，discriminated union 不會縮窄，所以用可選欄位
export interface LineLoginConfigResult {
  config?: LineLoginConfig;
  problem?: LineLoginConfigProblem;
}

type UriCheck = "ok" | "invalid" | "loopback_not_allowed";

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1"];

/**
 * 只有在「非 Vercel」且 NODE_ENV 明確為 development 或 test 時才允許 loopback http。
 * 其他情況（含 NODE_ENV 未設定）一律 fail closed。
 */
export function isLoopbackHttpAllowed(configService: ConfigService): boolean {
  const onVercel = !!configService.get<string>("VERCEL");
  const nodeEnv = (configService.get<string>("NODE_ENV") ?? "")
    .toString()
    .trim()
    .toLowerCase();
  return !onVercel && (nodeEnv === "development" || nodeEnv === "test");
}

function checkRedirectUri(uri: string, allowLoopbackHttp: boolean): UriCheck {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return "invalid";
  }
  if (url.username || url.password || url.hash || uri.includes("#")) {
    return "invalid";
  }
  if (url.protocol === "https:") return "ok";
  if (url.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname)) {
    return allowLoopbackHttp ? "ok" : "loopback_not_allowed";
  }
  return "invalid";
}

const readString = (configService: ConfigService, name: string): string =>
  (configService.get<string>(name) ?? "").toString().trim();

/**
 * 讀取並驗證 LINE Login 設定。請求處理與啟動檢查共用，
 * 只回傳問題類別，不回傳任何設定值。
 */
export function readLineLoginConfig(
  configService: ConfigService,
): LineLoginConfigResult {
  const channelId = readString(configService, "LINE_LOGIN_CHANNEL_ID");
  const channelSecret = readString(configService, "LINE_LOGIN_SECRET");
  const redirectUris = readString(configService, "LINE_LOGIN_REDIRECT_URIS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!channelId || !channelSecret || redirectUris.length === 0) {
    return { problem: "missing" };
  }

  const allowLoopbackHttp = isLoopbackHttpAllowed(configService);
  const checks = redirectUris.map((u) =>
    checkRedirectUri(u, allowLoopbackHttp),
  );
  if (checks.includes("invalid")) {
    return { problem: "invalid redirect URI" };
  }
  if (checks.includes("loopback_not_allowed")) {
    return { problem: "loopback not allowed" };
  }
  return { config: { channelId, channelSecret, redirectUris } };
}
