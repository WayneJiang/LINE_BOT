import * as fs from "fs";
import * as path from "path";
import dataSource from "../../database/ormconfig";

/**
 * 將資料庫中的每張資料表匯出為對應名稱的 CSV 檔案
 * @param outputDir 輸出目錄路徑，預設為 './csv_exports'
 */
export async function exportTablesToCsv(
  outputDir: string = "./csv_exports",
): Promise<void> {
  try {
    // 初始化資料庫連線
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log("✅ 資料庫連線成功");
    }

    // 建立輸出目錄
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 已建立目錄: ${outputDir}`);
    }

    // 取得所有資料表名稱(排除 migrations)
    const queryRunner = dataSource.createQueryRunner();
    const tables = (await queryRunner.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name != 'migrations'
        `)) as { table_name: string }[];

    console.log(`📊 找到 ${tables.length} 張資料表(已排除 migrations)`);

    // 處理每一張資料表
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n處理資料表: ${tableName}`);

      try {
        // 查詢資料表內容
        const data = (await queryRunner.query(
          `SELECT * FROM "${tableName}"`,
        )) as Record<string, unknown>[];

        if (data.length === 0) {
          console.log(`⚠️  ${tableName} 是空的，跳過`);
          continue;
        }

        // 取得欄位名稱
        const columns = Object.keys(data[0]);

        // 建立 CSV 內容
        let csvContent = "";

        // 寫入標題列
        csvContent +=
          columns.map((col) => escapeCsvValue(col)).join(",") + "\n";

        // 寫入資料列
        for (const row of data) {
          const values = columns.map((col) => {
            const value = row[col];
            return escapeCsvValue(value);
          });
          csvContent += values.join(",") + "\n";
        }

        // 寫入檔案
        const filePath = path.join(outputDir, `${tableName}.csv`);
        fs.writeFileSync(filePath, csvContent, "utf-8");

        console.log(`✅ ${tableName}.csv (${data.length} 筆記錄)`);
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : JSON.stringify(error);
        console.error(`❌ 處理 ${tableName} 時發生錯誤:`, msg);
      }
    }

    await queryRunner.release();
    console.log("\n🎉 所有資料表匯出完成！");
  } catch (error) {
    console.error("❌ 匯出過程發生錯誤:", error);
    throw error;
  } finally {
    // 關閉資料庫連線
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log("🔌 資料庫連線已關閉");
    }
  }
}

/**
 * 處理 CSV 值的跳脫字元
 * @param value 要處理的值
 * @returns 處理後的 CSV 值
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // 轉換為字串
  let stringValue = String(value);

  // 如果包含逗號、雙引號或換行符號，需要用雙引號包起來
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // 將雙引號轉義為兩個雙引號
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

// 如果直接執行此檔案
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args[0] || "./csv_exports";

  exportTablesToCsv(outputDir)
    .then(() => {
      console.log("✨ 執行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("執行失敗:", error);
      process.exit(1);
    });
}
