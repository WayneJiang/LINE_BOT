import { Trainee } from "./trainee.entity";
import { PlanType } from "../enums/enum-constant";
export declare class TrainingPlan {
    id: number;
    planType: PlanType;
    quota: number;
    createdDate: Date;
    updatedDate: Date;
    deletedDate: Date;
    trainee: Trainee;
}
