import { ConfigService } from '@nestjs/config';
import { MessageEvent, PostbackEvent } from '@line/bot-sdk';
import { Trainee } from 'src/entities/trainee.entity';
import { Repository } from 'typeorm';
import { TrainingRecord } from 'src/entities/trainingRecord.entity';
export declare class LineService {
    private configService;
    private traineeRepository;
    private trainingRecordRepository;
    private messagingApiClient;
    constructor(configService: ConfigService, traineeRepository: Repository<Trainee>, trainingRecordRepository: Repository<TrainingRecord>);
    handleTextMessage(event: MessageEvent): Promise<void>;
    handlePostBack(event: PostbackEvent): Promise<void>;
}
