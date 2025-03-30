import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, PrimaryColumn, Index, Unique } from "typeorm"
import { TrainingRecord } from "./training-record.entity"
import { TrainingPlan } from "./training-plan.entity"
import { TraineeType } from "../enums/enum-constant"

@Entity('Trainee')
@Unique('unique', ['socialId'])
export class Trainee {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    socialId: string

    @Column()
    name: string

    @Column({ default: '' })
    phone: string

    @Column({ type: 'enum', enum: TraineeType, default: TraineeType.Undecided })
    traineeType: TraineeType

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @DeleteDateColumn()
    deletedDate: Date

    @OneToMany(() => TrainingPlan, (trainingPlan) => trainingPlan.trainee)
    trainingPlan: TrainingPlan[]

    @OneToMany(() => TrainingRecord, (trainingRecord) => trainingRecord.trainee)
    trainingRecord: TrainingRecord[]
}
