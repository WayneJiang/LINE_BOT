"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trainee = void 0;
const typeorm_1 = require("typeorm");
const training_record_entity_1 = require("./training-record.entity");
const training_plan_entity_1 = require("./training-plan.entity");
let Trainee = class Trainee {
};
exports.Trainee = Trainee;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Trainee.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Trainee.prototype, "socialId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Trainee.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Trainee.prototype, "createdDate", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Trainee.prototype, "updatedDate", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], Trainee.prototype, "deletedDate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => training_plan_entity_1.TrainingPlan, (trainingPlan) => trainingPlan.trainee),
    __metadata("design:type", Array)
], Trainee.prototype, "trainingPlan", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => training_record_entity_1.TrainingRecord, (trainingRecord) => trainingRecord.trainee),
    __metadata("design:type", Array)
], Trainee.prototype, "trainingRecord", void 0);
exports.Trainee = Trainee = __decorate([
    (0, typeorm_1.Entity)('Trainee')
], Trainee);
//# sourceMappingURL=trainee.entity.js.map