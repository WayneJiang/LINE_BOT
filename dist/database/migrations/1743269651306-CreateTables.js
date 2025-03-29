"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTables1743269651306 = void 0;
class CreateTables1743269651306 {
    constructor() {
        this.name = 'CreateTables1743269651306';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."TrainingPlan_plantype_enum" AS ENUM('private', 'group')`);
        await queryRunner.query(`CREATE TABLE "TrainingPlan" ("id" SERIAL NOT NULL, "planType" "public"."TrainingPlan_plantype_enum" NOT NULL, "quota" integer NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, CONSTRAINT "PK_1510080e8ad0ad4f4815aa9c793" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "TrainingRecord" ("id" SERIAL NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "trainee" integer, CONSTRAINT "PK_2e0270f72b9fd634a30841e1ae6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" ADD CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TrainingRecord" ADD CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290" FOREIGN KEY ("trainee") REFERENCES "Trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "TrainingRecord" DROP CONSTRAINT "FK_d59d2d702c9e3e9ebc5dbef3290"`);
        await queryRunner.query(`ALTER TABLE "TrainingPlan" DROP CONSTRAINT "FK_3335c6f0b86969d36e94c1a72cd"`);
        await queryRunner.query(`DROP TABLE "TrainingRecord"`);
        await queryRunner.query(`DROP TABLE "Trainee"`);
        await queryRunner.query(`DROP TABLE "TrainingPlan"`);
        await queryRunner.query(`DROP TYPE "public"."TrainingPlan_plantype_enum"`);
    }
}
exports.CreateTables1743269651306 = CreateTables1743269651306;
//# sourceMappingURL=1743269651306-CreateTables.js.map