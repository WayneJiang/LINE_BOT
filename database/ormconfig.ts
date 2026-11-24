import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

// .env.local（本機開發用，不進 git）優先於 .env
dotenv.config({ path: ['.env.local', '.env'] });

const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DB_HOST,
    entities: [join(__dirname, '../src/entities/*.entity.ts')],
    migrations: [join(__dirname, './migrations/*.ts')],
    synchronize: false,
    logging: true,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

export default dataSource;