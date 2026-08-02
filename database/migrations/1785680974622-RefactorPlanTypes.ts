import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 一次完成 PlanType 的三項調整：
 *   1. 移除已停用的 Block
 *   2. 新增 SemiPrivate（個人小班）
 *   3. 重命名 Personal → PrivateTraining、FlexiblePersonal → FlexPrivate、
 *      Sequential → GroupFitness
 *
 * PostgreSQL 無法直接移除 enum 值，必須重建整個型別；既然都要重建，
 * 就把新增與重命名一併放進同一次 ALTER COLUMN ... USING，
 * 只掃描一次 TrainingPlan 表，且整批變更在同一個 transaction 內原子生效。
 */
export class RefactorPlanTypes1785680974622 implements MigrationInterface {
  name = "RefactorPlanTypes1785680974622";

  private static readonly ENUM = `"public"."TrainingPlan_plantype_enum"`;
  private static readonly ENUM_OLD = `"public"."TrainingPlan_plantype_enum_old"`;

  /** 仍有資料使用該 enum 值時中止，避免轉型階段丟出難讀的原生錯誤 */
  private static async assertUnused(
    queryRunner: QueryRunner,
    value: string,
  ): Promise<void> {
    // 刻意不過濾 deletedDate —— 軟刪除的資料同樣會擋下型別轉換
    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "TrainingPlan" WHERE "planType" = '${value}'`,
    )) as { count: number }[];
    const count = Number(rows[0]?.count ?? 0);

    if (count > 0) {
      throw new Error(
        `無法移除 PlanType.${value}：資料庫中仍有 ${count} 筆 TrainingPlan 使用此類型（含軟刪除）。` +
          `請先將這些計畫改為其他類型或實際刪除，再重新執行。`,
      );
    }
  }

  /** 重建 enum 型別，並依 mapping 轉換既有資料 */
  private static async rebuild(
    queryRunner: QueryRunner,
    values: string[],
    mapping: [string, string][],
  ): Promise<void> {
    const cases = mapping
      .map(([from, to]) => `WHEN '${from}' THEN '${to}'`)
      .join(" ");

    await queryRunner.query(
      `ALTER TYPE ${RefactorPlanTypes1785680974622.ENUM} RENAME TO "TrainingPlan_plantype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE ${RefactorPlanTypes1785680974622.ENUM} AS ENUM(${values
        .map((v) => `'${v}'`)
        .join(", ")})`,
    );
    await queryRunner.query(
      `ALTER TABLE "TrainingPlan" ALTER COLUMN "planType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "TrainingPlan" ALTER COLUMN "planType" TYPE ${RefactorPlanTypes1785680974622.ENUM} ` +
        `USING (CASE "planType"::text ${cases} ELSE "planType"::text END)::${RefactorPlanTypes1785680974622.ENUM}`,
    );
    await queryRunner.query(
      `ALTER TABLE "TrainingPlan" ALTER COLUMN "planType" SET DEFAULT 'None'`,
    );
    await queryRunner.query(
      `DROP TYPE ${RefactorPlanTypes1785680974622.ENUM_OLD}`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await RefactorPlanTypes1785680974622.assertUnused(queryRunner, "Block");

    await RefactorPlanTypes1785680974622.rebuild(
      queryRunner,
      ["None", "PrivateTraining", "FlexPrivate", "SemiPrivate", "GroupFitness"],
      [
        ["Personal", "PrivateTraining"],
        ["FlexiblePersonal", "FlexPrivate"],
        ["Sequential", "GroupFitness"],
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SemiPrivate 在舊 enum 沒有對應值，仍有資料就無法還原
    await RefactorPlanTypes1785680974622.assertUnused(
      queryRunner,
      "SemiPrivate",
    );

    await RefactorPlanTypes1785680974622.rebuild(
      queryRunner,
      ["None", "Personal", "FlexiblePersonal", "Block", "Sequential"],
      [
        ["PrivateTraining", "Personal"],
        ["FlexPrivate", "FlexiblePersonal"],
        ["GroupFitness", "Sequential"],
      ],
    );
  }
}
