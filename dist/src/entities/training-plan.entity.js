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
exports.TrainingPlan = void 0;
const typeorm_1 = require("typeorm");
const trainee_entity_1 = require("./trainee.entity");
const enum_constant_1 = require("../enums/enum-constant");
let TrainingPlan = class TrainingPlan {
};
exports.TrainingPlan = TrainingPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TrainingPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: enum_constant_1.PlanType }),
    __metadata("design:type", String)
], TrainingPlan.prototype, "planType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], TrainingPlan.prototype, "quota", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TrainingPlan.prototype, "createdDate", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TrainingPlan.prototype, "updatedDate", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], TrainingPlan.prototype, "deletedDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => trainee_entity_1.Trainee, (trainee) => trainee.trainingPlan),
    (0, typeorm_1.JoinColumn)({ name: 'trainee' }),
    __metadata("design:type", trainee_entity_1.Trainee)
], TrainingPlan.prototype, "trainee", void 0);
exports.TrainingPlan = TrainingPlan = __decorate([
    (0, typeorm_1.Entity)('TrainingPlan')
], TrainingPlan);
//# sourceMappingURL=training-plan.entity.js.map