import { ConfigService } from "@nestjs/config";
import {
  readMessagingAccessToken,
  readMessagingAccessTokenFromEnv,
  readMessagingSecret,
} from "./line-messaging.config";

const cfg = (values: Record<string, string>) => new ConfigService(values);

describe("readMessagingSecret", () => {
  it("只有新名稱", () => {
    expect(
      readMessagingSecret(cfg({ LINE_MESSAGE_CHANNEL_SECRET: "new" })),
    ).toBe("new");
  });
  it("只有舊名稱", () => {
    expect(readMessagingSecret(cfg({ CHANNEL_SECRET: "old" }))).toBe("old");
  });
  it("兩者都有時新名稱優先", () => {
    expect(
      readMessagingSecret(
        cfg({ LINE_MESSAGE_CHANNEL_SECRET: "new", CHANNEL_SECRET: "old" }),
      ),
    ).toBe("new");
  });
  it("新名稱只有空白時退回舊名稱，並 trim", () => {
    expect(
      readMessagingSecret(
        cfg({ LINE_MESSAGE_CHANNEL_SECRET: "  ", CHANNEL_SECRET: " old " }),
      ),
    ).toBe("old");
  });
  it("都沒有 -> 空字串", () => {
    expect(readMessagingSecret(cfg({}))).toBe("");
  });
  it("不會 fallback 到 LINE Login 的設定", () => {
    expect(
      readMessagingSecret(
        cfg({ LINE_LOGIN_SECRET: "login", LINE_LOGIN_CHANNEL_SECRET: "login" }),
      ),
    ).toBe("");
  });
});

describe("readMessagingAccessToken", () => {
  it("只有新名稱", () => {
    expect(
      readMessagingAccessToken(
        cfg({ LINE_MESSAGE_CHANNEL_ACCESS_TOKEN: "new" }),
      ),
    ).toBe("new");
  });
  it("只有舊名稱", () => {
    expect(readMessagingAccessToken(cfg({ CHANNEL_ACCESS_TOKEN: "old" }))).toBe(
      "old",
    );
  });
  it("兩者都有時新名稱優先", () => {
    expect(
      readMessagingAccessToken(
        cfg({
          LINE_MESSAGE_CHANNEL_ACCESS_TOKEN: "new",
          CHANNEL_ACCESS_TOKEN: "old",
        }),
      ),
    ).toBe("new");
  });
  it("新名稱只有空白時退回舊名稱", () => {
    expect(
      readMessagingAccessToken(
        cfg({
          LINE_MESSAGE_CHANNEL_ACCESS_TOKEN: " ",
          CHANNEL_ACCESS_TOKEN: "old",
        }),
      ),
    ).toBe("old");
  });
  it("都沒有 -> 空字串", () => {
    expect(readMessagingAccessToken(cfg({}))).toBe("");
  });
});

describe("readMessagingAccessTokenFromEnv", () => {
  it("新名稱優先、空白退回舊名稱、都沒有回空字串", () => {
    expect(
      readMessagingAccessTokenFromEnv({
        LINE_MESSAGE_CHANNEL_ACCESS_TOKEN: "new",
        CHANNEL_ACCESS_TOKEN: "old",
      }),
    ).toBe("new");
    expect(
      readMessagingAccessTokenFromEnv({
        LINE_MESSAGE_CHANNEL_ACCESS_TOKEN: "  ",
        CHANNEL_ACCESS_TOKEN: "old",
      }),
    ).toBe("old");
    expect(readMessagingAccessTokenFromEnv({})).toBe("");
  });
});
