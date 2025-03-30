import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Trainee } from "./trainee.entity"
import { PlanType } from "../enums/enum-constant"

@Entity('TrainingPlan')
export class TrainingPlan {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'enum', enum: PlanType, default: PlanType.None })
    planType: PlanType

    @Column({ default: 0 })
    quota: number

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @DeleteDateColumn()
    deletedDate: Date

    @ManyToOne(() => Trainee, (trainee) => trainee.trainingPlan)
    @JoinColumn({ name: 'trainee' })
    trainee: Trainee
}
