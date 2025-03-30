import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTables1743359792734 implements MigrationInterface {
    name = 'CreateTables1743359792734'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."TrainingPlan_plantype_enum" AS ENUM('none', 'private', 'group')`);
        await queryRunner.query(`CREATE TABLE "TrainingPlan" ("id" SERIAL NOT NULL, "planType" "public"."TrainingPlan_plantype_enum" NOT NULL DEFAULT 'none', "quota" integer NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, CONSTRAINT "PK_1510080e8ad0ad4f4815aa9c793" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Trainee_traineetype_enum" AS ENUM('undecided', 'admin', 'coach', 'trainee')`);
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL DEFAULT '', "traineeType" "public"."Trainee_traineetype_enum" NOT NULL DEFAULT 'undecided', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "unique" UNIQUE ("socialId"), CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "TrainingRecord" ("id" SERIAL NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, CONSTRAINT "PK_2e0270f72b9fd634a30841e1ae6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd"`);
        await queryRunner.query(`DROP TABLE "TrainingRecord"`);
        await queryRunner.query(`DROP TABLE "Trainee"`);
        await queryRunner.query(`DROP TYPE "public"."Trainee_traineetype_enum"`);
        await queryRunner.query(`DROP TABLE "TrainingPlan"`);
        await queryRunner.query(`DROP TYPE "public"."TrainingPlan_plantype_enum"`);
    }

}
