import {
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { AuthController } from "./auth.controller";
import { LineLoginService } from "../services/line-login.service";
import { LineLoginDto } from "../dto/line-login.dto";

describe("AuthController", () => {
  const dto: LineLoginDto = {
    code: "abc",
    redirectUri: "https://example.test/line-callback",
    nonce: "A".repeat(43),
  };
  let exchange: jest.Mock;
  let controller: AuthController;

  beforeEach(() => {
    exchange = jest.fn();
    controller = new AuthController({
      exchange,
    } as unknown as LineLoginService);
  });

  it("lineLogin 以 @HttpCode(200) 回應", () => {
    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      "lineLogin",
    )?.value as object;
    const code = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as number;
    expect(code).toBe(200);
  });

  it("把 dto 原樣交給 service 並回傳結果", async () => {
    exchange.mockResolvedValueOnce({ userId: "U-test", displayName: "T" });
    await expect(controller.lineLogin(dto)).resolves.toEqual({
      userId: "U-test",
      displayName: "T",
    });
    expect(exchange).toHaveBeenCalledWith(dto);
  });

  it.each([
    new BadRequestException(),
    new UnauthorizedException(),
    new BadGatewayException(),
  ])("service 的例外會原樣往外拋 %p", async (err) => {
    exchange.mockRejectedValueOnce(err);
    await expect(controller.lineLogin(dto)).rejects.toBe(err);
  });
});
