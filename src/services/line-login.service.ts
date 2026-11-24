import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LineLoginDto } from "../dto/line-login.dto";
import { LineLoginConfig, readLineLoginConfig } from "./line-login.config";

const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const UPSTREAM_TIMEOUT_MS = 4000;
const DISPLAY_NAME_MAX = 64;
// LINE userId 格式：U + 32 個小寫十六進位字元
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

const MSG_INVALID_CODE = "LINE 授權碼無效或已過期，請重新登入";
const MSG_CONFIG = "伺服器設定錯誤";
const MSG_UPSTREAM = "LINE 服務暫時無法使用，請稍後再試";

interface UpstreamResult {
  status: number;
  body: Record<string, unknown>;
}

@Injectable()
export class LineLoginService {
  private readonly logger = new Logger(LineLoginService.name);

  constructor(private readonly configService: ConfigService) {}

  async exchange(
    dto: LineLoginDto,
  ): Promise<{ userId: string; displayName: string }> {
    const config = this.readConfig();

    if (!config.redirectUris.includes(dto.redirectUri)) {
      throw new BadRequestException("redirect_uri 不允許");
    }

    // 1. code -> id_token
    const tokenRes = await this.postForm("token", TOKEN_URL, {
      grant_type: "authorization_code",
      code: dto.code,
      redirect_uri: dto.redirectUri,
      client_id: config.channelId,
      client_secret: config.channelSecret,
    });

    if (tokenRes.status !== 200) {
      if (tokenRes.status === 429 || tokenRes.status >= 500) {
        this.logger.warn(`token ${tokenRes.status}`);
        throw new BadGatewayException(MSG_UPSTREAM);
      }
      const code = this.safeErrorCode(tokenRes.body.error);
      if (code === "invalid_grant") {
        this.logger.warn("token invalid_grant");
        throw new UnauthorizedException(MSG_INVALID_CODE);
      }
      this.logger.error(`token config error: ${code}`);
      throw new InternalServerErrorException(MSG_CONFIG);
    }

    const idToken = tokenRes.body.id_token;
    if (typeof idToken !== "string" || idToken.length === 0) {
      this.logger.warn("token missing id_token");
      throw new BadGatewayException(MSG_UPSTREAM);
    }

    // 2. 由 LINE 驗證 id_token（簽章、aud、iss、exp、nonce）
    const verifyRes = await this.postForm("verify", VERIFY_URL, {
      id_token: idToken,
      client_id: config.channelId,
      nonce: dto.nonce,
    });

    if (verifyRes.status !== 200) {
      if (verifyRes.status === 429 || verifyRes.status >= 500) {
        this.logger.warn(`verify ${verifyRes.status}`);
        throw new BadGatewayException(MSG_UPSTREAM);
      }
      this.logger.warn(
        `verify ${verifyRes.status} ${this.safeErrorCode(verifyRes.body.error)}`,
      );
      throw new UnauthorizedException(MSG_INVALID_CODE);
    }

    const rawSub = verifyRes.body.sub;
    const sub = typeof rawSub === "string" ? rawSub.trim() : "";
    if (!LINE_USER_ID_PATTERN.test(sub)) {
      this.logger.warn("verify invalid sub");
      throw new BadGatewayException(MSG_UPSTREAM);
    }

    return {
      userId: sub,
      displayName: this.sanitizeDisplayName(verifyRes.body.name),
    };
  }

  /** 每次請求時讀取；任何一項不合格都 fail closed。 */
  private readConfig(): LineLoginConfig {
    const result = readLineLoginConfig(this.configService);
    if (!result.config) {
      this.logger.error(`config invalid: ${result.problem}`);
      throw new InternalServerErrorException(MSG_CONFIG);
    }
    return result.config;
  }

  /** 只允許簡單的 error code 進 log，避免把上游內容寫進去。 */
  private safeErrorCode(value: unknown): string {
    return typeof value === "string" && /^[a-z_]{1,64}$/.test(value)
      ? value
      : "unknown";
  }

  private failureReason(err: unknown): "timeout" | "network" {
    const name = (err as { name?: string } | null)?.name;
    return name === "TimeoutError" || name === "AbortError"
      ? "timeout"
      : "network";
  }

  private async postForm(
    stage: "token" | "verify",
    url: string,
    params: Record<string, string>,
  ): Promise<UpstreamResult> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        redirect: "error",
      });
    } catch (err) {
      this.logger.warn(`${stage} ${this.failureReason(err)}`);
      throw new BadGatewayException(MSG_UPSTREAM);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      // 讀取 body 期間逾時（signal 仍有效）要記為 timeout
      const reason = this.failureReason(err);
      this.logger.warn(
        reason === "timeout"
          ? `${stage} timeout`
          : `${stage} non-json ${res.status}`,
      );
      throw new BadGatewayException(MSG_UPSTREAM);
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      this.logger.warn(`${stage} non-object ${res.status}`);
      throw new BadGatewayException(MSG_UPSTREAM);
    }
    return { status: res.status, body: body as Record<string, unknown> };
  }

  private sanitizeDisplayName(name: unknown): string {
    if (typeof name !== "string") return "";
    // 移除控制字元、格式字元（含 BiDi、零寬）與 U+2028/U+2029；
    // 保留 U+200D 以免拆散 emoji 序列，但截斷後會去掉頭尾殘留的 ZWJ
    const cleaned = name
      .replace(/[\p{Cc}\p{Cf}\u{2028}\u{2029}]/gu, (ch) =>
        ch === "\u{200D}" ? ch : "",
      )
      .trim();
    return Array.from(cleaned)
      .slice(0, DISPLAY_NAME_MAX)
      .join("")
      .replace(/^\u{200D}+|\u{200D}+$/gu, "")
      .trim();
  }
}
