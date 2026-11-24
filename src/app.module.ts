import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LineController } from "./controllers/line.controller";
import { LineService } from "./services/line.service";
import { middleware, MiddlewareConfig } from "@line/bot-sdk";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DataController } from "./controllers/data.controller";
import { Trainee } from "./entities/trainee.entity";
import { TrainingPlan } from "./entities/training-plan.entity";
import { TrainingRecord } from "./entities/training-record.entity";
import { TrainingTimeSlot } from "./entities/training-time-slot.entity";
import { OpeningCourse } from "./entities/opening-course.entity";
import { DataService } from "./services/data.service";
import { PdfService } from "./services/pdf.service";
import { Coach } from "./entities/coach.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.local（本機開發用，不進 git）優先於 .env
      envFilePath: [".env.local", ".env"],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("POSTGRES_HOST"),
        port: Number(configService.get<string>("POSTGRES_PORT") ?? 5432),
        username: configService.get<string>("POSTGRES_USER"),
        password: configService.get<string>("POSTGRES_PASSWORD"),
        database: configService.get<string>("POSTGRES_DATABASE"),
        autoLoadEntities: true,
        ssl: configService.get<string>("DB_SSL") !== "false",
      }),
    }),
    TypeOrmModule.forFeature([
      Trainee,
      Coach,
      TrainingPlan,
      TrainingRecord,
      TrainingTimeSlot,
      OpeningCourse,
    ]),
  ],
  controllers: [LineController, DataController],
  providers: [LineService, DataService, PdfService],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}
  configure(consumer: MiddlewareConsumer) {
    const channelSecret = this.configService.get<string>("CHANNEL_SECRET");

    const middlewareConfig: MiddlewareConfig = {
      channelSecret: channelSecret || "",
    };

    consumer
      .apply(middleware(middlewareConfig))
      .forRoutes({ path: "/line/*path", method: RequestMethod.ALL });
  }

  async onModuleInit() {
    try {
      await this.dataSource.query("SELECT 1");
      console.log("✅ Database connected successfully!");
    } catch (error) {
      console.error("❌ Database connection failed!", error);
    }
  }
}
