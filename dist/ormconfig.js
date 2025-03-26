"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
var typeorm_1 = require("typeorm");
var config_1 = require("@nestjs/config");
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
var configService = new config_1.ConfigService();
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    synchronize: configService.get('DB_SYNCHRONIZE'),
    migrations: ['dist/migrations/*.js'],
    entities: ['dist/**/*.entity.js'],
    ssl: true
});
//# sourceMappingURL=ormconfig.js.map