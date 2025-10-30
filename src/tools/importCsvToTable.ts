import * as fs from 'fs';
import * as path from 'path';
import dataSource from '../../database/ormconfig';

/**
 * 將指定的 CSV 檔案匯入到對應的資料表
 * @param csvFilePath CSV 檔案路徑
 * @param tableName 目標資料表名稱（若不指定則從檔名取得）
 * @param truncateTable 是否在匯入前清空資料表，預設為 false
 */
export async function importCsvToTable(
    csvFilePath: string,
    tableName?: string,
    truncateTable: boolean = false
): Promise<void> {
    try {
        // 初始化資料庫連線
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
            console.log('✅ 資料庫連線成功');
        }

        // 檢查檔案是否存在
        if (!fs.existsSync(csvFilePath)) {
            throw new Error(`❌ 找不到檔案: ${csvFilePath}`);
        }

        // 如果沒有指定資料表名稱，從檔名取得
        if (!tableName) {
            const fileName = path.basename(csvFilePath, '.csv');
            tableName = fileName;
        }

        console.log(`\n📥 開始匯入 ${csvFilePath} 到資料表 ${tableName}`);

        // 讀取 CSV 檔案
        const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('❌ CSV 檔案是空的');
        }

        // 解析標題列
        const headers = parseCsvLine(lines[0]);
        console.log(`📋 欄位: ${headers.join(', ')}`);

        // 解析資料列
        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            if (values.length === headers.length) {
                const row: any = {};
                headers.forEach((header, index) => {
                    let value = values[index] === '' ? null : values[index];

                    // 嘗試轉換時間格式(從 JavaScript Date.toString() 格式轉為 ISO 格式)
                    if (value && typeof value === 'string' && value.includes('GMT')) {
                        try {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                                value = date.toISOString();
                            }
                        } catch (e) {
                            // 如果轉換失敗,保持原值
                        }
                    }

                    row[header] = value;
                });
                rows.push(row);
            }
        }

        console.log(`📊 共 ${rows.length} 筆資料待匯入`);

        const queryRunner = dataSource.createQueryRunner();

        try {
            // 檢查資料表是否存在
            const tableExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
            `, [tableName]);

            if (!tableExists[0].exists) {
                throw new Error(`❌ 資料表 ${tableName} 不存在`);
            }

            // 查詢資料表結構,找出所有 NOT NULL 的欄位
            const columnInfo = await queryRunner.query(`
                SELECT column_name, is_nullable, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
            `, [tableName]);

            const notNullColumns = new Set(
                columnInfo
                    .filter((col: any) => col.is_nullable === 'NO' && col.data_type === 'character varying')
                    .map((col: any) => col.column_name)
            );

            console.log(`🔒 NOT NULL 字串欄位: ${Array.from(notNullColumns).join(', ')}`);

            // 將 NOT NULL 欄位的 null 值轉換為空白字串
            rows.forEach(row => {
                notNullColumns.forEach((colName: string) => {
                    if (row[colName] === null) {
                        row[colName] = '';
                    }
                });
            });

            // 開始交易
            await queryRunner.startTransaction();

            // 如果需要，清空資料表
            if (truncateTable) {
                await queryRunner.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
                console.log(`🗑️  已清空資料表 ${tableName}`);
            }

            // 批次插入資料
            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                try {
                    const columns = Object.keys(row);
                    const values = Object.values(row);
                    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

                    const insertQuery = `
                        INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')})
                        VALUES (${placeholders})
                    `;

                    await queryRunner.query(insertQuery, values);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`⚠️  插入資料失敗:`, error.message);
                    console.error(`   資料: ${JSON.stringify(row)}`);
                }
            }

            // 提交交易
            await queryRunner.commitTransaction();

            // 重置序列以避免主鍵衝突
            try {
                await queryRunner.query(`
                    SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'),
                                  (SELECT MAX(id) FROM "${tableName}"));
                `);
                console.log(`🔄 已重置 ${tableName} 的 ID 序列`);
            } catch (error) {
                console.warn(`⚠️  重置序列失敗(可能此表沒有 id 欄位):`, error.message);
            }

            console.log(`\n✅ 匯入完成！`);
            console.log(`   成功: ${successCount} 筆`);
            if (errorCount > 0) {
                console.log(`   失敗: ${errorCount} 筆`);
            }

        } catch (error) {
            // 發生錯誤時回滾交易
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }

    } catch (error) {
        console.error('❌ 匯入過程發生錯誤:', error);
        throw error;
    } finally {
        // 關閉資料庫連線
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('🔌 資料庫連線已關閉');
        }
    }
}

/**
 * 解析 CSV 行，正確處理引號包裹的值
 * @param line CSV 行內容
 * @returns 解析後的值陣列
 */
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // 兩個連續的雙引號代表一個雙引號字元
                current += '"';
                i++; // 跳過下一個引號
            } else {
                // 切換引號狀態
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // 在引號外的逗號是分隔符
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // 加入最後一個值
    result.push(current);

    return result;
}

// 如果直接執行此檔案
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('使用方式:');
        console.log('  ts-node src/tools/importCsvToTable.ts <csv檔案路徑> [資料表名稱] [--truncate]');
        console.log('');
        console.log('範例:');
        console.log('  ts-node src/tools/importCsvToTable.ts ./csv_exports/trainee.csv');
        console.log('  ts-node src/tools/importCsvToTable.ts ./backup/data.csv trainee');
        console.log('  ts-node src/tools/importCsvToTable.ts ./csv_exports/trainee.csv trainee --truncate');
        process.exit(1);
    }

    const csvFilePath = args[0];
    const tableName = args[1] && !args[1].startsWith('--') ? args[1] : undefined;
    const truncateTable = args.includes('--truncate');

    importCsvToTable(csvFilePath, tableName, truncateTable)
        .then(() => {
            console.log('✨ 執行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('執行失敗:', error);
            process.exit(1);
        });
}
