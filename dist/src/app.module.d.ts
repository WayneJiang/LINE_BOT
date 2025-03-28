import { NestModule, MiddlewareConsumer, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
export declare class AppModule implements NestModule, OnModuleInit {
    private configService;
    private dataSource;
    constructor(configService: ConfigService, dataSource: DataSource);
    configure(consumer: MiddlewareConsumer): void;
    onModuleInit(): Promise<void>;
}
