import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTables1754587056637 implements MigrationInterface {
    name = 'CreateTables1754587056637'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Coach" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "unique_coach" UNIQUE ("socialId"), CONSTRAINT "PK_bf604e12d74b449fc85d6391b4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."TrainingPlan_plantype_enum" AS ENUM('none', 'private', 'group')`);
        await queryRunner.query(`CREATE TABLE "TrainingPlan" ("id" SERIAL NOT NULL, "planStartedAt" TIMESTAMP NOT NULL DEFAULT 'infinity'::timestamp, "planEndedAt" TIMESTAMP NOT NULL DEFAULT 'infinity'::timestamp, "trainingSlot" text NOT NULL, "planType" "public"."TrainingPlan_plantype_enum" NOT NULL DEFAULT 'none', "planQuota" integer NOT NULL DEFAULT '0', "usedQuota" integer NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, "coach_training_plan" integer, "editor_training_plan" integer, CONSTRAINT "PK_1510080e8ad0ad4f4815aa9c793" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Trainee_gender_enum" AS ENUM('male', 'female')`);
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "gender" "public"."Trainee_gender_enum" NOT NULL DEFAULT 'male', "birthday" date NOT NULL DEFAULT 'infinity'::date, "phone" character varying NOT NULL DEFAULT '', "height" numeric(4,1) NOT NULL DEFAULT '0', "weight" numeric(4,1) NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "unique_trainee" UNIQUE ("socialId"), CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "TrainingRecord" ("id" SERIAL NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, "trainingPlan" integer, CONSTRAINT "PK_2e0270f72b9fd634a30841e1ae6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_81353468f5f09d987663997529e" FOREIGN KEY ("coach_training_plan") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_496e0188047549e3ec19cf64e76" FOREIGN KEY ("editor_training_plan") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_ed42370b85c43a4539732fcb8a2" FOREIGN KEY ("trainingPlan") REFERENCES "TrainingPlan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_ed42370b85c43a4539732fcb8a2"`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_496e0188047549e3ec19cf64e76"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_81353468f5f09d987663997529e"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd"`);
        await queryRunner.query(`DROP TABLE "TrainingRecord"`);
        await queryRunner.query(`DROP TABLE "Trainee"`);
        await queryRunner.query(`DROP TYPE "public"."Trainee_gender_enum"`);
        await queryRunner.query(`DROP TABLE "TrainingPlan"`);
        await queryRunner.query(`DROP TYPE "public"."TrainingPlan_plantype_enum"`);
        await queryRunner.query(`DROP TABLE "Coach"`);
    }

}
