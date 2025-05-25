import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Unique,
  Double,
} from "typeorm";
import { TrainingPlan } from "./training-plan.entity";

@Entity("Coach")
@Unique("unique_coach", ["socialId"])
export class Coach {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  socialId: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.coach)
  coachTrainingPlan: TrainingPlan[];

  @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.editor)
  editTrainingPlan: TrainingPlan[];
}
