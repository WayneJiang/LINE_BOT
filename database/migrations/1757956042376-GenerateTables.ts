import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateTables1757956042376 implements MigrationInterface {
    name = 'GenerateTables1757956042376'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."OpeningCourse_dayofweek_enum" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`);
        await queryRunner.query(`CREATE TABLE "OpeningCourse" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "dayOfWeek" "public"."OpeningCourse_dayofweek_enum" NOT NULL DEFAULT 'Monday', "start" character varying NOT NULL, "end" character varying NOT NULL, "note" character varying NOT NULL DEFAULT '', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "coach" integer, CONSTRAINT "PK_bf07079649a538bbbe5c1aa24fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Coach" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL DEFAULT 'Ud519e05aed38a9bf1820a30313615cfb', "name" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "unique_coach" UNIQUE ("socialId"), CONSTRAINT "PK_bf604e12d74b449fc85d6391b4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "TrainingRecord" ("id" SERIAL NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, "trainingPlan" integer, "editor" integer, CONSTRAINT "PK_2e0270f72b9fd634a30841e1ae6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Trainee_gender_enum" AS ENUM('Male', 'Female')`);
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL DEFAULT 'U810b33c114ceb29a5ac70dbc05ec27c9', "name" character varying NOT NULL, "gender" "public"."Trainee_gender_enum" NOT NULL DEFAULT 'Male', "birthday" date NOT NULL DEFAULT 'infinity'::date, "phone" character varying NOT NULL DEFAULT '', "height" numeric(4,1) NOT NULL DEFAULT '0', "weight" numeric(4,1) NOT NULL DEFAULT '0', "note" character varying NOT NULL DEFAULT '', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "unique_trainee" UNIQUE ("socialId"), CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."TrainingPlan_plantype_enum" AS ENUM('None', 'Personal', 'Block', 'Sequential')`);
        await queryRunner.query(`CREATE TABLE "TrainingPlan" ("id" SERIAL NOT NULL, "start" TIMESTAMP, "end" TIMESTAMP, "planType" "public"."TrainingPlan_plantype_enum" NOT NULL DEFAULT 'None', "quota" integer NOT NULL DEFAULT '0', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, "coach" integer, "editor" integer, CONSTRAINT "PK_1510080e8ad0ad4f4815aa9c793" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."TrainingTimeSlot_dayofweek_enum" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`);
        await queryRunner.query(`CREATE TABLE "TrainingTimeSlot" ("id" SERIAL NOT NULL, "dayOfWeek" "public"."TrainingTimeSlot_dayofweek_enum" NOT NULL DEFAULT 'Monday', "start" character varying NOT NULL DEFAULT '', "end" character varying NOT NULL DEFAULT '', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainingPlan" integer, CONSTRAINT "PK_65db3d33cb20e52f830f4c286b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "OpeningCourse" ADD CONSTRAINT "FK_a65ff2b9dc4e41ea4832a4ac4b8" FOREIGN KEY ("coach") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_ed42370b85c43a4539732fcb8a2" FOREIGN KEY ("trainingPlan") REFERENCES "TrainingPlan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_8d3a720e0d94ed917fa993703c9" FOREIGN KEY ("editor") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_94ea7307ce97321209a31fbca53" FOREIGN KEY ("coach") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_5f81b1b2cd7ccc7c114cf8d18d1" FOREIGN KEY ("editor") REFERENCES "Coach"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingTimeSlot" ADD CONSTRAINT "FK_dfb6882de764ffb230790b18d6b" FOREIGN KEY ("trainingPlan") REFERENCES "TrainingPlan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "TrainingTimeSlot" DROP CONSTRAINT "FK_dfb6882de764ffb230790b18d6b"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_5f81b1b2cd7ccc7c114cf8d18d1"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_94ea7307ce97321209a31fbca53"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd"`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_8d3a720e0d94ed917fa993703c9"`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_ed42370b85c43a4539732fcb8a2"`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290"`);
        await queryRunner.query(`ALTER TABLE "OpeningCourse" DROP CONSTRAINT "FK_a65ff2b9dc4e41ea4832a4ac4b8"`);
        await queryRunner.query(`DROP TABLE "TrainingTimeSlot"`);
        await queryRunner.query(`DROP TYPE "public"."TrainingTimeSlot_dayofweek_enum"`);
        await queryRunner.query(`DROP TABLE "TrainingPlan"`);
        await queryRunner.query(`DROP TYPE "public"."TrainingPlan_plantype_enum"`);
        await queryRunner.query(`DROP TABLE "Trainee"`);
        await queryRunner.query(`DROP TYPE "public"."Trainee_gender_enum"`);
        await queryRunner.query(`DROP TABLE "TrainingRecord"`);
        await queryRunner.query(`DROP TABLE "Coach"`);
        await queryRunner.query(`DROP TABLE "OpeningCourse"`);
        await queryRunner.query(`DROP TYPE "public"."OpeningCourse_dayofweek_enum"`);
    }

}
