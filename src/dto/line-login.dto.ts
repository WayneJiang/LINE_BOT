import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, Matches } from "class-validator";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class LineLoginDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @Matches(/^[A-Za-z0-9._~-]+$/)
  code: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  redirectUri: string;

  // 前端以 32 bytes 亂數轉 base64url（不含 padding）= 43 字元
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  nonce: string;
}
