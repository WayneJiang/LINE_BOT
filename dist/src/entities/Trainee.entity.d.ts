import { TrainingRecord } from "./training-record.entity";
import { TrainingPlan } from "./training-plan.entity";
export declare class Trainee {
    id: number;
    socialId: string;
    name: string;
    createdDate: Date;
    updatedDate: Date;
    deletedDate: Date;
    trainingPlan: TrainingPlan[];
    trainingRecord: TrainingRecord[];
}
