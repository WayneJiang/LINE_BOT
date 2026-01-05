import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpeningCourseToTrainingRecord1767579620404 implements MigrationInterface {
    name = 'AddOpeningCourseToTrainingRecord1767579620404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD "openingCourse" integer`);
        await queryRunner.query(`ALTER TABLE "Trainee" ALTER COLUMN "birthday" SET DEFAULT 'infinity'::date`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_0619b34b9a8309be006ebb4f3e2" FOREIGN KEY ("openingCourse") REFERENCES "OpeningCourse"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_0619b34b9a8309be006ebb4f3e2"`);
        await queryRunner.query(`ALTER TABLE "Trainee" ALTER COLUMN "birthday" SET DEFAULT 'infinity'`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP COLUMN "openingCourse"`);
    }

}
