import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type DiplomacyStatus = 'ally' | 'neutral' | 'war';

@Entity('state_diplomacies')
export class StateDiplomacyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'state_a_id', type: 'uuid' })
  stateAId: string;

  @Column({ name: 'state_b_id', type: 'uuid' })
  stateBId: string;

  @Column({ type: 'varchar', length: 32, default: 'neutral' })
  status: DiplomacyStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
