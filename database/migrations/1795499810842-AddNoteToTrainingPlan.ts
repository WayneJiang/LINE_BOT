import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNoteToTrainingPlan1795499810842 implements MigrationInterface {
  name = "AddNoteToTrainingPlan1795499810842";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "TrainingPlan" ADD "note" character varying NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP COLUMN "note"`);
  }
}
