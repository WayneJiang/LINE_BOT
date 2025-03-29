import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from "typeorm"
import { TrainingRecord } from "./trainingRecord.entity"
import { TrainingPlan } from "./trainingPlan.entity"

@Entity('Trainee')
export class Trainee {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    socialId: string

    @Column()
    name: string

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
