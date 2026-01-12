import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlexiblePersonalPlanType1768148542300 implements MigrationInterface {
    name = 'AddFlexiblePersonalPlanType1768148542300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."TrainingPlan_plantype_enum" ADD VALUE 'FlexiblePersonal'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL 不支援直接移除 enum 值，需要重建 enum 類型
        // 若需要 rollback，請手動處理
    }

}
