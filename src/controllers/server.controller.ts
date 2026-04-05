import { Controller, Get } from "@nestjs/common";

@Controller()
export class ServerController {
  @Get()
  healthCheck(): { status: number; message: string } {
    console.log();

    return {
      status: 200,
      message: "Server alive",
    };
  }
}
