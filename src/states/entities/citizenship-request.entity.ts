import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SettlementEntity } from './settlement.entity';

export type CitizenshipRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('citizenship_requests')
export class CitizenshipRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  username: string;

  @Column({ name: 'settlement_id', type: 'uuid' })
  settlementId: string;

  @ManyToOne(() => SettlementEntity, (settlement) => settlement.citizenshipRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_id' })
  settlement?: SettlementEntity;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: CitizenshipRequestStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
