import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { LineLoginDto } from "../dto/line-login.dto";
import { LineLoginService } from "../services/line-login.service";

// 注意：此 endpoint 只負責在伺服器端以授權碼向 LINE 換取使用者身分，
// 不發 session，也不是 API 驗證機制。
@Controller("auth")
export class AuthController {
  constructor(private readonly lineLoginService: LineLoginService) {}

  @Post("line-login")
  @HttpCode(200)
  lineLogin(
    @Body() dto: LineLoginDto,
  ): Promise<{ userId: string; displayName: string }> {
    return this.lineLoginService.exchange(dto);
  }
}
