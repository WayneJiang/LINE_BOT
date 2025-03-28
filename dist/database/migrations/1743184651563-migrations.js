"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migrations1743184651563 = void 0;
class Migrations1743184651563 {
    constructor() {
        this.name = 'Migrations1743184651563';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "Trainee" ("id" SERIAL NOT NULL, "socialId" character varying NOT NULL, "name" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, CONSTRAINT "PK_8191b3ced1b69ab3b1ff8e620c4" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "Trainee"`);
    }
}
exports.Migrations1743184651563 = Migrations1743184651563;
//# sourceMappingURL=1743184651563-migrations.js.map