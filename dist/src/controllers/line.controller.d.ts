import { LineService } from '../services/line.service';
import { WebhookRequestBody } from '@line/bot-sdk';
export declare class LineController {
    private readonly lineService;
    constructor(lineService: LineService);
    handleWebhook(body: WebhookRequestBody): Promise<void>;
}
