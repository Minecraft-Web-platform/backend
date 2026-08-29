import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settlement_types')
export class SettlementTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ nullable: true })
  proposedByUsername: string;

  @CreateDateColumn()
  createdAt: Date;
}
