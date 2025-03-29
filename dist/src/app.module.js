"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const line_controller_1 = require("./controllers/line.controller");
const line_service_1 = require("./services/line.service");
const bot_sdk_1 = require("@line/bot-sdk");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const server_controller_1 = require("./controllers/server.controller");
const trainee_entity_1 = require("./entities/trainee.entity");
const trainingPlan_entity_1 = require("./entities/trainingPlan.entity");
const trainingRecord_entity_1 = require("./entities/trainingRecord.entity");
let AppModule = class AppModule {
    constructor(configService, dataSource) {
        this.configService = configService;
        this.dataSource = dataSource;
    }
    configure(consumer) {
        const channelSecret = this.configService.get('CHANNEL_SECRET');
        const middlewareConfig = {
            channelSecret: channelSecret || ''
        };
        consumer
            .apply((0, bot_sdk_1.middleware)(middlewareConfig))
            .forRoutes({ path: '/line/*path', method: common_1.RequestMethod.ALL });
    }
    async onModuleInit() {
        try {
            await this.dataSource.query('SELECT 1');
            console.log('✅ Database connected successfully!');
        }
        catch (error) {
            console.error('❌ Database connection failed!', error);
        }
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    type: 'postgres',
                    host: configService.get('POSTGRES_HOST'),
                    port: 5432,
                    username: configService.get('POSTGRES_USER'),
                    password: configService.get('POSTGRES_PASSWORD'),
                    database: configService.get('POSTGRES_DATABASE'),
                    autoLoadEntities: true,
                    ssl: true
                })
            }),
            typeorm_1.TypeOrmModule.forFeature([trainee_entity_1.Trainee, trainingPlan_entity_1.TrainingPlan, trainingRecord_entity_1.TrainingRecord])
        ],
        controllers: [server_controller_1.ServerController, line_controller_1.LineController],
        providers: [line_service_1.LineService]
    }),
    __metadata("design:paramtypes", [config_1.ConfigService, typeorm_2.DataSource])
], AppModule);
//# sourceMappingURL=app.module.js.map