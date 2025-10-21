import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Unique,
  JoinColumn,
} from "typeorm";
import { TrainingPlan } from "./training-plan.entity";
import { OpeningCourse } from "./opening-course.entity";
import { TrainingRecord } from "./training-record.entity";
import { CoachType } from "../enums/enum-constant";

@Entity("Coach")
@Unique("unique_coach", ["socialId"])
export class Coach {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: "Ud519e05aed38a9bf1820a30313615cfb" })
  socialId: string;

  @Column()
  name: string;

  @Column({ type: "enum", enum: CoachType, default: CoachType.Founder })
  coachType: CoachType;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.coach)
  @JoinColumn({ name: "coach" })
  coachTrainingPlan: TrainingPlan[];

  @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.editor)
  @JoinColumn({ name: "editor" })
  editTrainingPlan: TrainingPlan[];

  @OneToMany(() => OpeningCourse, (openingCourse) => openingCourse.coach)
  @JoinColumn({ name: "openingCourse" })
  openingCourse: OpeningCourse[];

  @OneToMany(() => TrainingRecord, (trainingRecord) => trainingRecord.editor)
  @JoinColumn({ name: "trainingRecord" })
  trainingRecord: TrainingRecord[];
}
