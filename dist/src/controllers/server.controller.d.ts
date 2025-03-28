export declare class ServerController {
    healthCheck(): Promise<{
        status: number;
        message: string;
    }>;
}
