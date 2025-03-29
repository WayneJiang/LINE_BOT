import { TrainingRecord } from "./trainingRecord.entity";
import { TrainingPlan } from "./trainingPlan.entity";
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
