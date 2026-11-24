import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LineLoginService } from "./line-login.service";

const NONCE = "A".repeat(43);
const REDIRECT = "https://example.test/line-callback";

// 產生用的假 userId（符合 U + 32 個小寫十六進位字元），不是任何真實 ID
const FAKE_UID = "U" + "0123456789abcdef".repeat(2);

// ConfigService 會優先讀 process.env，所以 NODE_ENV / VERCEL 要直接設在 process.env
const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
};
function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function makeService(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    LINE_LOGIN_CHANNEL_ID: "test-channel-id",
    LINE_LOGIN_SECRET: "test-login-secret",
    LINE_LOGIN_REDIRECT_URIS: `${REDIRECT}, http://localhost:5173/line-callback`,
    NODE_ENV: "test",
    ...overrides,
  };
  for (const k of ["NODE_ENV", "VERCEL"]) {
    if (values[k] === undefined) delete process.env[k];
    else process.env[k] = values[k];
  }
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(values))
    if (v !== undefined) clean[k] = v;
  return new LineLoginService(new ConfigService(clean));
}

const dto = (extra: Record<string, string> = {}) => ({
  code: "abc123",
  redirectUri: REDIRECT,
  nonce: NONCE,
  ...extra,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("LineLoginService", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    fetchSpy = jest.spyOn(global, "fetch");
  });
  afterEach(() => {
    jest.restoreAllMocks();
    restoreEnv();
  });

  const bodyOf = (call: number): URLSearchParams => {
    const calls = fetchSpy.mock.calls as Array<[string, RequestInit]>;
    return calls[call][1].body as URLSearchParams;
  };

  describe("成功流程", () => {
    it("回傳 userId 與 displayName，nonce 原樣傳給 /verify", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name: "Tester" }));

      const result = await makeService().exchange(dto());
      expect(result).toEqual({ userId: FAKE_UID, displayName: "Tester" });
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const tokenBody = bodyOf(0);
      expect(tokenBody.get("grant_type")).toBe("authorization_code");
      expect(tokenBody.get("code")).toBe("abc123");
      expect(tokenBody.get("redirect_uri")).toBe(REDIRECT);
      expect(tokenBody.get("client_id")).toBe("test-channel-id");

      const verifyBody = bodyOf(1);
      expect(verifyBody.get("id_token")).toBe("idt");
      expect(verifyBody.get("client_id")).toBe("test-channel-id");
      expect(verifyBody.get("nonce")).toBe(NONCE);
    });

    it("缺少 name 時 displayName 為空字串", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID }));
      const result = await makeService().exchange(dto());
      expect(result.displayName).toBe("");
    });
  });

  describe("allowlist", () => {
    it("不在名單內 -> 400，且不呼叫 LINE", async () => {
      await expect(
        makeService().exchange(dto({ redirectUri: "https://evil.test/x" })),
      ).rejects.toThrow(BadRequestException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("完全比對：多一個結尾斜線就拒絕", async () => {
      await expect(
        makeService().exchange(dto({ redirectUri: `${REDIRECT}/` })),
      ).rejects.toThrow(BadRequestException);
    });

    it("非 production 允許 localhost", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name: "T" }));
      await expect(
        makeService().exchange(
          dto({ redirectUri: "http://localhost:5173/line-callback" }),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe("env 解析（fail closed -> 500）", () => {
    const cases: Array<[string, Record<string, string | undefined>]> = [
      ["缺少 channel id", { LINE_LOGIN_CHANNEL_ID: undefined }],
      ["channel id 只有空白", { LINE_LOGIN_CHANNEL_ID: "  " }],
      ["缺少 channel secret", { LINE_LOGIN_SECRET: undefined }],
      ["allowlist 為空", { LINE_LOGIN_REDIRECT_URIS: "" }],
      ["allowlist 只有逗號與空白", { LINE_LOGIN_REDIRECT_URIS: " , ," }],
      [
        "非 https 且非 localhost",
        { LINE_LOGIN_REDIRECT_URIS: "http://example.com/x" },
      ],
      [
        "Vercel 上含 localhost（即使 NODE_ENV 未設定）",
        {
          VERCEL: "1",
          NODE_ENV: undefined,
          LINE_LOGIN_REDIRECT_URIS: "http://localhost:5173/x",
        },
      ],
      [
        "含 username/password",
        { LINE_LOGIN_REDIRECT_URIS: "https://user:pw@example.test/x" },
      ],
      ["含 hash", { LINE_LOGIN_REDIRECT_URIS: "https://example.test/x#frag" }],
      ["含空 hash", { LINE_LOGIN_REDIRECT_URIS: "https://example.test/x#" }],
      [
        "production 含 localhost",
        {
          NODE_ENV: "production",
          LINE_LOGIN_REDIRECT_URIS: "http://localhost:5173/x",
        },
      ],
      [
        "production 含 127.0.0.1",
        {
          NODE_ENV: "production",
          LINE_LOGIN_REDIRECT_URIS: "http://127.0.0.1/x",
        },
      ],
      [
        "其中一筆不合格",
        { LINE_LOGIN_REDIRECT_URIS: `${REDIRECT},http://example.com/x` },
      ],
    ];
    it.each(cases)("%s", async (_name, overrides) => {
      await expect(makeService(overrides).exchange(dto())).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("NODE_ENV 未設定時拒絕 localhost（fail closed）-> 500", async () => {
      const error = jest.spyOn(Logger.prototype, "error");
      await expect(
        makeService({ NODE_ENV: undefined }).exchange(
          dto({ redirectUri: "http://localhost:5173/line-callback" }),
        ),
      ).rejects.toThrow(InternalServerErrorException);
      expect(error).toHaveBeenCalledWith(
        "config invalid: loopback not allowed",
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each(["development", " Development ", "TEST"])(
      "NODE_ENV=%j（非 Vercel）允許 localhost",
      async (nodeEnv) => {
        fetchSpy
          .mockResolvedValueOnce(json(200, { id_token: "idt" }))
          .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name: "T" }));
        await expect(
          makeService({ NODE_ENV: nodeEnv }).exchange(
            dto({ redirectUri: "http://localhost:5173/line-callback" }),
          ),
        ).resolves.toBeDefined();
      },
    );

    it("NODE_ENV=staging 拒絕 localhost", async () => {
      await expect(
        makeService({ NODE_ENV: "staging" }).exchange(dto()),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("VERCEL 有設定時，即使 NODE_ENV=development 也拒絕 localhost", async () => {
      await expect(
        makeService({ NODE_ENV: "development", VERCEL: "1" }).exchange(dto()),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("舊名稱 LINE_LOGIN_CHANNEL_SECRET 與 Messaging 的 secret 都不會被當作 Login secret", async () => {
      await expect(
        makeService({
          LINE_LOGIN_SECRET: undefined,
          LINE_LOGIN_CHANNEL_SECRET: "x",
          LINE_MESSAGE_CHANNEL_SECRET: "y",
          CHANNEL_SECRET: "z",
        }).exchange(dto()),
      ).rejects.toThrow(InternalServerErrorException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("設定問題只記錄類別", async () => {
      const error = jest.spyOn(Logger.prototype, "error");
      await expect(
        makeService({ LINE_LOGIN_CHANNEL_ID: undefined }).exchange(dto()),
      ).rejects.toThrow(InternalServerErrorException);
      expect(error).toHaveBeenCalledWith("config invalid: missing");
      await expect(
        makeService({
          LINE_LOGIN_REDIRECT_URIS: "http://example.com/x",
        }).exchange(dto()),
      ).rejects.toThrow(InternalServerErrorException);
      expect(error).toHaveBeenCalledWith(
        "config invalid: invalid redirect URI",
      );
    });

    it("production 的 https 名單可用", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name: "T" }));
      await expect(
        makeService({
          NODE_ENV: "production",
          LINE_LOGIN_REDIRECT_URIS: REDIRECT,
        }).exchange(dto()),
      ).resolves.toBeDefined();
    });
  });

  describe("錯誤對應（3.3）", () => {
    it("/token invalid_grant -> 401", async () => {
      fetchSpy.mockResolvedValueOnce(json(400, { error: "invalid_grant" }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it.each(["invalid_client", "unauthorized_client", "invalid_request"])(
      "/token %s -> 500",
      async (error) => {
        fetchSpy.mockResolvedValueOnce(json(400, { error }));
        await expect(makeService().exchange(dto())).rejects.toThrow(
          InternalServerErrorException,
        );
      },
    );

    it("/token 其他 4xx -> 500", async () => {
      fetchSpy.mockResolvedValueOnce(json(403, { error: "whatever" }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it.each([429, 500, 503])("/token %d -> 502", async (status) => {
      fetchSpy.mockResolvedValueOnce(json(status, { error: "x" }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/token 逾時 -> 502", async () => {
      const err = new Error("t");
      err.name = "TimeoutError";
      fetchSpy.mockRejectedValueOnce(err);
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/token AbortError -> 502", async () => {
      const err = new Error("a");
      err.name = "AbortError";
      fetchSpy.mockRejectedValueOnce(err);
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/token 網路錯誤 -> 502", async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("sub 前後空白會被 trim", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: `  ${FAKE_UID} `, name: "T" }));
      const result = await makeService().exchange(dto());
      expect(result.userId).toBe(FAKE_UID);
    });

    it("sub 無效只記錄 verify invalid sub", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: "not-a-real-id" }));
      const warn = jest.spyOn(Logger.prototype, "warn");
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
      expect(warn).toHaveBeenCalledWith("verify invalid sub");
    });

    it("fetch 帶有 redirect: error", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name: "T" }));
      await makeService().exchange(dto());
      const calls = fetchSpy.mock.calls as Array<[string, RequestInit]>;
      expect(calls[0][1].redirect).toBe("error");
      expect(calls[1][1].redirect).toBe("error");
    });

    it("讀取 body 期間逾時 -> 502 並記為 timeout", async () => {
      const err = new Error("t");
      err.name = "TimeoutError";
      const res = new Response("{}", { status: 200 });
      jest.spyOn(res, "json").mockRejectedValueOnce(err);
      fetchSpy.mockResolvedValueOnce(res);
      const warn = jest.spyOn(Logger.prototype, "warn");
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
      expect(warn).toHaveBeenCalledWith("token timeout");
    });

    it("/verify 4xx 只記錄 error code", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(
          json(400, { error: "invalid_request", error_description: "SECRET" }),
        );
      const warn = jest.spyOn(Logger.prototype, "warn");
      await expect(makeService().exchange(dto())).rejects.toThrow(
        UnauthorizedException,
      );
      expect(warn).toHaveBeenCalledWith("verify 400 invalid_request");
    });

    it("/token 非 JSON 回應 -> 502", async () => {
      fetchSpy.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/token 缺少 id_token -> 502", async () => {
      fetchSpy.mockResolvedValueOnce(json(200, { access_token: "x" }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it.each([400, 401])("/verify %d -> 401", async (status) => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(status, { error: "invalid_request" }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it.each([429, 500])("/verify %d -> 502", async (status) => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(status, {}));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/verify 逾時 -> 502", async () => {
      const err = new Error("t");
      err.name = "TimeoutError";
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockRejectedValueOnce(err);
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("/verify 非 JSON -> 502", async () => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(new Response("nope", { status: 200 }));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });

    it.each([
      {},
      { sub: "" },
      { sub: 123 },
      { sub: "U-test" },
      { sub: "U" + "a".repeat(31) },
      { sub: "U" + "a".repeat(33) },
      { sub: "U" + "A".repeat(32) },
      { sub: "u" + "a".repeat(32) },
      { sub: "U" + "g".repeat(32) },
    ])("/verify sub 無效 %j -> 502", async (body) => {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, body));
      await expect(makeService().exchange(dto())).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe("displayName 清洗", () => {
    async function nameFor(name: unknown): Promise<string> {
      fetchSpy
        .mockResolvedValueOnce(json(200, { id_token: "idt" }))
        .mockResolvedValueOnce(json(200, { sub: FAKE_UID, name }));
      return (await makeService().exchange(dto())).displayName;
    }

    it("移除 BiDi 控制字元與零寬字元", async () => {
      expect(await nameFor("\u{202E}Ab\u{200B}c\u{2066}d\u{2069}")).toBe(
        "Abcd",
      );
    });

    it("移除 C0 控制字元並 trim", async () => {
      expect(await nameFor("  \u{0000}Tom\u{0007}\n ")).toBe("Tom");
    });

    it("保留 U+200D（emoji ZWJ 序列）", async () => {
      const family = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
      expect(await nameFor(family)).toBe(family);
    });

    it("以 code point 截斷至 64", async () => {
      const long = "\u{1F600}".repeat(100);
      const out = await nameFor(long);
      expect(Array.from(out)).toHaveLength(64);
    });

    it("移除 U+2028 / U+2029", async () => {
      expect(await nameFor("a\u{2028}b\u{2029}c")).toBe("abc");
    });

    it("截斷後去掉結尾殘留的 ZWJ", async () => {
      const name = "a".repeat(63) + "\u{200D}" + "b";
      expect(await nameFor(name)).toBe("a".repeat(63));
    });

    it("只有 ZWJ 的名稱 -> 空字串", async () => {
      expect(await nameFor("\u{200D}\u{200D}")).toBe("");
    });

    it("name 不是字串 -> 空字串", async () => {
      expect(await nameFor(42)).toBe("");
    });
  });
});
