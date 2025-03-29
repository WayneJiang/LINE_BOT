import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Trainee } from "./trainee.entity"
import { PlanType } from "../enums/enum-constant"

@Entity('TrainingPlan')
export class TrainingPlan {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'simple-enum', enum: PlanType })
    planType: PlanType

    @Column()
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
