import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SettlementEntity } from './settlement.entity';

@Entity('streets')
export class StreetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'settlement_id', type: 'uuid' })
  settlementId: string;

  @ManyToOne(() => SettlementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_id' })
  settlement: SettlementEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
