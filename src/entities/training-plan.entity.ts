import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Trainee } from "./trainee.entity";
import { PlanType } from "../enums/enum-constant";
import { Coach } from "./coach.entity";
import { TrainingRecord } from "./training-record.entity";

@Entity("TrainingPlan")
export class TrainingPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "timestamp", nullable: true })
  planStartedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  planEndedAt: Date;

  @Column({ type: "text", default: "" })
  trainingSlot: string;

  @Column({ type: "enum", enum: PlanType, default: PlanType.None })
  planType: PlanType;

  @Column({ default: 0 })
  planQuota: number;

  @Column({ default: 0 })
  usedQuota: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @ManyToOne(() => Trainee, (trainee) => trainee.trainingPlan)
  @JoinColumn({ name: "trainee" })
  trainee: Trainee;

  @ManyToOne(() => Coach, (coach) => coach.coachTrainingPlan)
  @JoinColumn({ name: "coach_training_plan" })
  coach: Coach;

  @ManyToOne(() => Coach, (coach) => coach.editTrainingPlan)
  @JoinColumn({ name: "editor_training_plan" })
  editor: Coach;

  @OneToMany(
    () => TrainingRecord,
    (trainingRecord) => trainingRecord.trainingPlan
  )
  trainingRecord: TrainingRecord[];
}
