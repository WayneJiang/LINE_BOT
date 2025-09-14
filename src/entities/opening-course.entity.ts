import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { TrainingRecord } from "./training-record.entity";
import { DayOfWeek } from "../enums/enum-constant";
import { Coach } from "./coach.entity";

@Entity("OpeningCourse")
export class OpeningCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: "enum", enum: DayOfWeek, default: DayOfWeek.Monday })
  dayOfWeek: DayOfWeek;

  @Column()
  start: string;

  @Column()
  end: string;

  @Column({ default: "" })
  note: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @ManyToOne(() => Coach, (coach) => coach.openingCourse)
  @JoinColumn({ name: "coach" })
  coach: Coach;

  @OneToMany(() => TrainingRecord, (trainingRecord) => trainingRecord.trainee)
  trainingRecord: TrainingRecord[];
}
