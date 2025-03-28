import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

dotenv.config();

const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DB_HOST,
    entities: [join(__dirname, '../src/entities/*.entity.ts')],
    migrations: [join(__dirname, './migrations/*.ts')],
    synchronize: false,
    logging: true,
    ssl: {
        rejectUnauthorized: false,
    },
});

export default dataSource;