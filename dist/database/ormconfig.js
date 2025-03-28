"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const typeorm_1 = require("typeorm");
const path_1 = require("path");
dotenv.config();
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DB_HOST,
    entities: [(0, path_1.join)(__dirname, '../src/entities/*.entity.ts')],
    migrations: [(0, path_1.join)(__dirname, './migrations/*.ts')],
    synchronize: false,
    logging: true,
    ssl: {
        rejectUnauthorized: false,
    },
});
exports.default = dataSource;
//# sourceMappingURL=ormconfig.js.map