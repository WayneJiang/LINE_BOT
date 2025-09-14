import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TrainingPlan } from "./training-plan.entity";
import { TrainingRecord } from "./training-record.entity";
import { DayOfWeek } from "../enums/enum-constant";

@Entity("TrainingTimeSlot")
export class TrainingTimeSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: DayOfWeek,
    default: DayOfWeek.Monday,
    nullable: false,
  })
  dayOfWeek: DayOfWeek;

  @Column({ default: "" })
  start: string;

  @Column({ default: "" })
  end: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @ManyToOne(
    () => TrainingPlan,
    (trainingPlan) => trainingPlan.trainingTimeSlot
  )
  @JoinColumn({ name: "trainingPlan" })
  trainingPlan: TrainingPlan;

  @OneToMany(() => TrainingRecord, (trainingRecord) => trainingRecord.trainee)
  trainingRecord: TrainingRecord[];
}
