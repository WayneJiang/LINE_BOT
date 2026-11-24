import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readMessagingSecret } from "../config/line-messaging.config";
import { validateSignature } from "@line/bot-sdk";
import type { NextFunction, Request, Response } from "express";

/**
 * 驗證 LINE webhook 的 x-line-signature。
 * 需要 NestFactory.create(..., { rawBody: true }) 才會有 req.rawBody。
 * 不直接使用 SDK 的 middleware：Nest 的 body parser 已先讀完 stream。
 */
@Injectable()
export class LineSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LineSignatureMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(
    req: Request & { rawBody?: Buffer },
    _res: Response,
    next: NextFunction,
  ): void {
    const secret = readMessagingSecret(this.configService);
    if (!secret) {
      this.logger.error("webhook-signature: secret missing");
      throw new InternalServerErrorException();
    }

    const signature = req.headers["x-line-signature"];
    if (typeof signature !== "string" || signature.length === 0) {
      throw new UnauthorizedException();
    }

    if (!req.is("application/json")) {
      throw new UnauthorizedException();
    }

    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      const contentLength = req.headers["content-length"];
      const hasBody =
        (contentLength !== undefined && Number(contentLength) > 0) ||
        req.headers["transfer-encoding"] !== undefined;
      if (!hasBody) {
        throw new UnauthorizedException();
      }
      this.logger.error("webhook-signature: rawBody unavailable");
      throw new InternalServerErrorException();
    }

    if (rawBody.length === 0) {
      throw new UnauthorizedException();
    }

    let valid: boolean;
    try {
      valid = validateSignature(rawBody, secret, signature);
    } catch {
      valid = false;
    }
    if (!valid) {
      throw new UnauthorizedException();
    }

    next();
  }
}
