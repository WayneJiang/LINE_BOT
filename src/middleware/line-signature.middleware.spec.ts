import {
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validateSignature } from "@line/bot-sdk";
import { createHmac } from "crypto";
import { LineSignatureMiddleware } from "./line-signature.middleware";

// 以真實實作包一層，才能斷言 validateSignature 是否真的被呼叫
jest.mock("@line/bot-sdk", () => {
  const actual =
    jest.requireActual<typeof import("@line/bot-sdk")>("@line/bot-sdk");
  return {
    ...actual,
    validateSignature: jest.fn(actual.validateSignature),
  };
});
const validateSignatureMock = jest.mocked(validateSignature);

const SECRET = "test-secret";

function sign(body: Buffer, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

interface FakeReq {
  headers: Record<string, unknown>;
  rawBody?: unknown;
  is: (type: string) => string | false | null;
}

function makeReq(opts: {
  signature?: unknown;
  json?: boolean;
  rawBody?: unknown;
  contentLength?: string;
  transferEncoding?: string;
}): FakeReq {
  const headers: Record<string, unknown> = {
    "content-type":
      opts.json === false ? "text/plain" : "application/json; charset=utf-8",
  };
  if (opts.signature !== undefined)
    headers["x-line-signature"] = opts.signature;
  // 有 rawBody 時自動帶 content-length（與真實請求一致），除非測試明確覆寫
  if (opts.contentLength !== undefined) {
    headers["content-length"] = opts.contentLength;
  } else if (Buffer.isBuffer(opts.rawBody)) {
    headers["content-length"] = String(opts.rawBody.length);
  }
  if (opts.transferEncoding !== undefined)
    headers["transfer-encoding"] = opts.transferEncoding;
  return {
    headers,
    rawBody: opts.rawBody,
    // 仿 express 的 req.is：沒有 body 回 null；有 body 時比對 MIME（忽略參數）
    is: (type: string) => {
      const hasBody =
        headers["content-length"] !== undefined ||
        headers["transfer-encoding"] !== undefined;
      if (!hasBody) return null;
      const mime = (headers["content-type"] as string).split(";")[0].trim();
      return mime === type ? type : false;
    },
  };
}

function run(secret: string | undefined, req: FakeReq) {
  return runWith(secret === undefined ? {} : { CHANNEL_SECRET: secret }, req);
}

function runWith(values: Record<string, string>, req: FakeReq) {
  const config = new ConfigService(values);
  const mw = new LineSignatureMiddleware(config);
  const next = jest.fn();
  const call = () => mw.use(req as never, {} as never, next);
  return { call, next };
}

describe("LineSignatureMiddleware", () => {
  const body = Buffer.from(JSON.stringify({ events: [] }));

  beforeEach(() => {
    validateSignatureMock.mockClear();
    // 靜音預期內的 Logger.error
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("合法簽章 -> next()，且 validateSignature 以 rawBody 與 secret 驗證", () => {
    const { call, next } = run(
      SECRET,
      makeReq({ signature: sign(body), rawBody: body }),
    );
    call();
    expect(next).toHaveBeenCalledTimes(1);
    expect(validateSignatureMock).toHaveBeenCalledTimes(1);
    expect(validateSignatureMock).toHaveBeenCalledWith(
      body,
      SECRET,
      sign(body),
    );
  });

  it("缺少簽章 -> 401，不呼叫 validateSignature", () => {
    const { call, next } = run(SECRET, makeReq({ rawBody: body }));
    expect(call).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
    expect(validateSignatureMock).not.toHaveBeenCalled();
  });

  it("簽章不是字串 -> 401，不呼叫 validateSignature", () => {
    const { call } = run(
      SECRET,
      makeReq({ signature: ["a", "b"], rawBody: body }),
    );
    expect(call).toThrow(UnauthorizedException);
    expect(validateSignatureMock).not.toHaveBeenCalled();
  });

  it("錯誤簽章 -> 實際呼叫 validateSignature 並回傳 false -> 401", () => {
    const { call, next } = run(
      SECRET,
      makeReq({ signature: sign(body, "other"), rawBody: body }),
    );
    expect(call).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
    expect(validateSignatureMock).toHaveBeenCalledTimes(1);
    expect(validateSignatureMock).toHaveReturnedWith(false);
  });

  it("body 被竄改 -> 實際呼叫 validateSignature 並回傳 false -> 401", () => {
    const { call } = run(
      SECRET,
      makeReq({
        signature: sign(body),
        rawBody: Buffer.from('{"events":[1]}'),
      }),
    );
    expect(call).toThrow(UnauthorizedException);
    expect(validateSignatureMock).toHaveBeenCalledTimes(1);
    expect(validateSignatureMock).toHaveReturnedWith(false);
  });

  it("非 JSON Content-Type -> 在 MIME 檢查被擋，不呼叫 validateSignature", () => {
    const req = makeReq({ signature: sign(body), rawBody: body, json: false });
    expect(req.is("application/json")).toBe(false);
    const { call } = run(SECRET, req);
    expect(call).toThrow(UnauthorizedException);
    expect(validateSignatureMock).not.toHaveBeenCalled();
  });

  it("簽章為空字串 -> 401，不呼叫 validateSignature", () => {
    const { call, next } = run(
      SECRET,
      makeReq({ signature: "", rawBody: body }),
    );
    expect(call).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
    expect(validateSignatureMock).not.toHaveBeenCalled();
  });

  it("validateSignature 丟例外 -> 401", () => {
    validateSignatureMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { call, next } = run(
      SECRET,
      makeReq({ signature: sign(body), rawBody: body }),
    );
    expect(call).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
    expect(validateSignatureMock).toHaveBeenCalledTimes(1);
  });

  it("缺少 rawBody 但有 transfer-encoding -> 500", () => {
    const { call } = run(
      SECRET,
      makeReq({ signature: "x", transferEncoding: "chunked" }),
    );
    expect(call).toThrow(InternalServerErrorException);
  });

  it("缺少 rawBody 且沒有 content-length -> 401", () => {
    const { call } = run(SECRET, makeReq({ signature: "x" }));
    expect(call).toThrow(UnauthorizedException);
  });

  it("缺少 rawBody 且 content-length 為 0 -> 401", () => {
    const { call } = run(
      SECRET,
      makeReq({ signature: "x", contentLength: "0" }),
    );
    expect(call).toThrow(UnauthorizedException);
  });

  it("缺少 rawBody 但 content-length > 0 -> 500", () => {
    const { call } = run(
      SECRET,
      makeReq({ signature: "x", contentLength: "20" }),
    );
    expect(call).toThrow(InternalServerErrorException);
  });

  it("空 rawBody -> 401", () => {
    const empty = Buffer.alloc(0);
    const { call } = run(
      SECRET,
      makeReq({ signature: sign(empty), rawBody: empty, contentLength: "0" }),
    );
    expect(call).toThrow(UnauthorizedException);
  });

  it("缺少 secret -> 500", () => {
    const { call, next } = run(
      undefined,
      makeReq({ signature: sign(body), rawBody: body }),
    );
    expect(call).toThrow(InternalServerErrorException);
    expect(next).not.toHaveBeenCalled();
  });

  it("secret 只有空白 -> 500", () => {
    const { call } = run(
      "   ",
      makeReq({ signature: sign(body), rawBody: body }),
    );
    expect(call).toThrow(InternalServerErrorException);
  });

  describe("secret 的讀取來源", () => {
    const validReq = () => makeReq({ signature: sign(body), rawBody: body });

    it("只有新名稱 LINE_MESSAGE_CHANNEL_SECRET -> 通過", () => {
      const { call, next } = runWith(
        { LINE_MESSAGE_CHANNEL_SECRET: SECRET },
        validReq(),
      );
      call();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("只有舊名稱 CHANNEL_SECRET -> 通過（退回舊名稱）", () => {
      const { call, next } = runWith({ CHANNEL_SECRET: SECRET }, validReq());
      call();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("兩者都有時新名稱優先", () => {
      const both = {
        LINE_MESSAGE_CHANNEL_SECRET: SECRET,
        CHANNEL_SECRET: "other-secret",
      };
      const ok = runWith(both, validReq());
      ok.call();
      expect(ok.next).toHaveBeenCalledTimes(1);

      // 用舊名稱的 secret 簽的請求會被拒
      const bad = runWith(
        both,
        makeReq({ signature: sign(body, "other-secret"), rawBody: body }),
      );
      expect(bad.call).toThrow(UnauthorizedException);
    });

    it("新名稱只有空白 -> 退回舊名稱", () => {
      const { call, next } = runWith(
        { LINE_MESSAGE_CHANNEL_SECRET: "   ", CHANNEL_SECRET: SECRET },
        validReq(),
      );
      call();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("新舊名稱都空白 -> 500", () => {
      const { call } = runWith(
        { LINE_MESSAGE_CHANNEL_SECRET: " ", CHANNEL_SECRET: " " },
        validReq(),
      );
      expect(call).toThrow(InternalServerErrorException);
    });

    it("不會 fallback 到 LINE Login 的 secret -> 500", () => {
      const { call } = runWith(
        { LINE_LOGIN_SECRET: SECRET, LINE_LOGIN_CHANNEL_SECRET: SECRET },
        validReq(),
      );
      expect(call).toThrow(InternalServerErrorException);
    });
  });
});
