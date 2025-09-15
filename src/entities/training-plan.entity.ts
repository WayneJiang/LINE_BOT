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
import { TrainingTimeSlot } from "./training-time-slot.entity";

@Entity("TrainingPlan")
export class TrainingPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "timestamp", nullable: true })
  start: Date;

  @Column({ type: "timestamp", nullable: true })
  end: Date;

  @Column({ type: "enum", enum: PlanType, default: PlanType.None })
  planType: PlanType;

  @Column({ default: 0 })
  quota: number;

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
  @JoinColumn({ name: "coach" })
  coach: Coach;

  @ManyToOne(() => Coach, (coach) => coach.editTrainingPlan)
  @JoinColumn({ name: "editor" })
  editor: Coach;

  @OneToMany(
    () => TrainingRecord,
    (trainingRecord) => trainingRecord.trainingPlan
  )
  trainingRecord: TrainingRecord[];

  @OneToMany(
    () => TrainingTimeSlot,
    (trainingTimeSlot) => trainingTimeSlot.trainingPlan
  )
  trainingTimeSlot: TrainingTimeSlot[];
}
