import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LineController } from './controllers/line.controller';
import { LineService } from './services/line.service';
import { middleware, MiddlewareConfig } from '@line/bot-sdk';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
  ],
  controllers: [LineController],
  providers: [LineService]
})
export class AppModule implements NestModule {
  constructor(private configService: ConfigService) { }
  configure(consumer: MiddlewareConsumer) {
    const channelSecret = this.configService.get<string>('CHANNEL_SECRET');

    const middlewareConfig: MiddlewareConfig = {
      channelSecret: channelSecret || ''
    };

    consumer
      .apply(middleware(middlewareConfig))
      .forRoutes({ path: '/line/*', method: RequestMethod.ALL });
  }
}
