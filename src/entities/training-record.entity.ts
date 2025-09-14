import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Trainee } from "./trainee.entity";
import { TrainingPlan } from "./training-plan.entity";
import { Coach } from "./coach.entity";

@Entity("TrainingRecord")
export class TrainingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @ManyToOne(() => Trainee, (trainee) => trainee.trainingRecord)
  @JoinColumn({ name: "trainee" })
  trainee: Trainee;

  @ManyToOne(() => TrainingPlan, (trainingPlan) => trainingPlan.trainingRecord)
  @JoinColumn({ name: "trainingPlan" })
  trainingPlan: TrainingPlan;

  @ManyToOne(() => Coach, (coach) => coach.trainingRecord)
  @JoinColumn({ name: "editor" })
  editor: Coach;
}
