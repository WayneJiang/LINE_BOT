import { Controller, Get } from "@nestjs/common";

@Controller()
export class ServerController {
    @Get()
    async healthCheck(): Promise<{ status: number; message: string }> {
        console.log();

        return {
            status: 200,
            message: 'Server alive'
        };
    }
}