import { Controller, Post, Body } from "@nestjs/common";
import { LineService } from "../services/line.service";
import { webhook } from "@line/bot-sdk";

@Controller()
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post("webhook")
  async handleWebhook(@Body() body: webhook.CallbackRequest): Promise<void> {
    for (const event of body.events) {
      if (event.type == "message" && event.message.type == "text") {
        await this.lineService.handleTextMessage(event);
      } else if (event.type == "postback") {
        await this.lineService.handlePostBack(event);
      }
    }
  }
}
