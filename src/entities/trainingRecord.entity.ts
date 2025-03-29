import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Trainee } from "./trainee.entity"

@Entity('TrainingRecord')
export class TrainingRecord {
    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @DeleteDateColumn()
    deletedDate: Date

    @ManyToOne(() => Trainee, (trainee) => trainee.trainingRecord)
    @JoinColumn({ name: 'trainee' })
    trainee: Trainee
}
