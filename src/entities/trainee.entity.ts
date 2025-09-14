import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Unique,
} from "typeorm";
import { TrainingRecord } from "./training-record.entity";
import { TrainingPlan } from "./training-plan.entity";
import { Gender } from "../enums/enum-constant";

@Entity("Trainee")
@Unique("unique_trainee", ["socialId"])
export class Trainee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: "U810b33c114ceb29a5ac70dbc05ec27c9" })
  socialId: string;

  @Column()
  name: string;

  @Column({ type: "enum", enum: Gender, default: Gender.Male })
  gender: Gender;

  @Column({ type: "date", default: () => "'infinity'::date" })
  birthday: Date;

  @Column({ default: "" })
  phone: string;

  @Column({ type: "decimal", precision: 4, scale: 1, default: 0 })
  height: number;

  @Column({ type: "decimal", precision: 4, scale: 1, default: 0 })
  weight: number;

  @Column({ default: "" })
  note: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.trainee)
  trainingPlan: TrainingPlan[];

  @OneToMany(() => TrainingRecord, (trainingRecord) => trainingRecord.trainee)
  trainingRecord: TrainingRecord[];
}
