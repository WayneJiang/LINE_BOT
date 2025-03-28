import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm"

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
}
