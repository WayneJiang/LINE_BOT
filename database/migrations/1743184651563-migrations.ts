import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1743184651563 implements MigrationInterface {
    name = 'Migrations1743184651563'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Trainee"`);
    }

}
