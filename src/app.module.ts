import { Module, NestModule, MiddlewareConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LineController } from './controllers/line.controller';
import { LineService } from './services/line.service';
import { middleware, MiddlewareConfig } from '@line/bot-sdk';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE'),
        autoLoadEntities: true,
        ssl: true
      }),
    })
  ],
  controllers: [LineController],
  providers: [LineService]
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private configService: ConfigService, private dataSource: DataSource) { }
  configure(consumer: MiddlewareConsumer,) {
    const channelSecret = this.configService.get<string>('CHANNEL_SECRET');

    const middlewareConfig: MiddlewareConfig = {
      channelSecret: channelSecret || ''
    };

    consumer
      .apply(middleware(middlewareConfig))
      .forRoutes({ path: '/line/*path', method: RequestMethod.ALL });
  }

  async onModuleInit() {
    try {
      await this.dataSource.query('SELECT 1');
      console.log('✅ Database connected successfully!');
    } catch (error) {
      console.error('❌ Database connection failed!', error);
    }
  }
}
