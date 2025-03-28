import { ConfigService } from '@nestjs/config';
import { MessageEvent, PostbackEvent } from '@line/bot-sdk';
import { Trainee } from 'src/entities/Trainee.entity';
import { Repository } from 'typeorm';
export declare class LineService {
    private configService;
    private traineeRepository;
    private messagingApiClient;
    constructor(configService: ConfigService, traineeRepository: Repository<Trainee>);
    handleTextMessage(event: MessageEvent): Promise<void>;
    handlePostBack(event: PostbackEvent): Promise<void>;
}
