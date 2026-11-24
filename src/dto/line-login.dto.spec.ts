import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LineLoginDto } from "./line-login.dto";

const NONCE = "A".repeat(43);

async function errorsFor(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(LineLoginDto, input);
  const errors = await validate(dto, { whitelist: true });
  return errors.map((e) => e.property).sort();
}

const valid = () => ({
  code: "abc.DEF_123~-",
  redirectUri: "https://example.test/line-callback",
  nonce: NONCE,
});

describe("LineLoginDto", () => {
  it("合法輸入通過", async () => {
    expect(await errorsFor(valid())).toEqual([]);
  });

  it("欄位前後空白會被 trim", async () => {
    const dto = plainToInstance(LineLoginDto, {
      code: "  abc  ",
      redirectUri: "  https://example.test/x  ",
      nonce: `  ${NONCE}  `,
    });
    expect(dto.code).toBe("abc");
    expect(dto.redirectUri).toBe("https://example.test/x");
    expect(dto.nonce).toBe(NONCE);
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(["code", "redirectUri", "nonce"])(
    "%s 只有空白 -> 拒絕",
    async (f) => {
      expect(await errorsFor({ ...valid(), [f]: "   " })).toContain(f);
    },
  );

  it.each(["code", "redirectUri", "nonce"])("%s 缺少 -> 拒絕", async (f) => {
    const input: Record<string, unknown> = valid();
    delete input[f];
    expect(await errorsFor(input)).toContain(f);
  });

  it.each([123, null, {}, ["a"], true])("非字串 %j -> 拒絕", async (v) => {
    expect(await errorsFor({ ...valid(), code: v })).toContain("code");
    expect(await errorsFor({ ...valid(), redirectUri: v })).toContain(
      "redirectUri",
    );
    expect(await errorsFor({ ...valid(), nonce: v })).toContain("nonce");
  });

  it.each([
    ["42 字元", "A".repeat(42), false],
    ["43 字元", "A".repeat(43), true],
    ["44 字元", "A".repeat(44), false],
    ["含 - 與 _", "-_".repeat(21) + "A", true],
    ["含 +", "+".repeat(43), false],
    ["含 /", "/".repeat(43), false],
    ["含 =", "=".repeat(43), false],
  ])("nonce %s", async (_n, nonce, ok) => {
    const errors = await errorsFor({ ...valid(), nonce });
    expect(errors.includes("nonce")).toBe(!ok);
  });

  it.each(["a b", "a&b", "a=b", "a/b", "中文", "a%20b"])(
    "code 含非法字元 %s -> 拒絕",
    async (code) => {
      expect(await errorsFor({ ...valid(), code })).toContain("code");
    },
  );

  it("code 長度 512 通過、513 拒絕", async () => {
    expect(await errorsFor({ ...valid(), code: "a".repeat(512) })).toEqual([]);
    expect(await errorsFor({ ...valid(), code: "a".repeat(513) })).toContain(
      "code",
    );
  });

  it("redirectUri 長度 2048 通過、2049 拒絕", async () => {
    expect(
      await errorsFor({ ...valid(), redirectUri: "h".repeat(2048) }),
    ).toEqual([]);
    expect(
      await errorsFor({ ...valid(), redirectUri: "h".repeat(2049) }),
    ).toContain("redirectUri");
  });
});
