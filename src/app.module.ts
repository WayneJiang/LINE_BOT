import { Module, NestModule, MiddlewareConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LineController } from './controllers/line.controller';
import { LineService } from './services/line.service';
import { middleware, MiddlewareConfig } from '@line/bot-sdk';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ServerController } from './controllers/server.controller';
import ormconfig from '../database/ormconfig';
import { Trainee } from './entities/Trainee.entity';

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
        host: configService.get<string>('POSTGRES_HOST'),
        port: 5432,
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DATABASE'),
        autoLoadEntities: true,
        ssl: true
      })
    }),
    TypeOrmModule.forFeature([Trainee])
  ],
  controllers: [ServerController, LineController],
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
